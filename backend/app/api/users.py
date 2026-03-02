from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import List

from .. import models, schemas
from ..core import database, dependencies

router = APIRouter(prefix="/api/users", tags=["Users"])

@router.get("", response_model=List[schemas.UserOut]) 
async def get_all_users(
    admin_user: models.User = Depends(dependencies.get_current_admin), 
    db: AsyncSession = Depends(database.get_db)
):
    stmt = select(models.User).order_by(models.User.id)
    result = await db.execute(stmt)
    users = result.scalars().all()
    
    return users

@router.get("/me")
async def get_user_info(
    current_user: dict = Depends(dependencies.get_current_user), 
    db: AsyncSession = Depends(database.get_db)
):
    email = current_user.get("sub")
    stmt = select(models.User).where(models.User.email == email)
    result = await db.execute(stmt)
    db_user = result.scalars().first()
    
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": db_user.id,
        "name": db_user.name,
        "email": db_user.email,
        "avatar_url": db_user.avatar_url,  
        "role": db_user.role
    }

@router.put("/{user_id}/role")
async def change_user_role(
    user_id: int, 
    request: schemas.RoleChangeRequest,
    admin_user: models.User = Depends(dependencies.get_current_admin), 
    db: AsyncSession = Depends(database.get_db)
):
    stmt = select(models.User).where(models.User.id == user_id)
    result = await db.execute(stmt)
    user_to_update = result.scalars().first()
    
    if not user_to_update:
        raise HTTPException(status_code=404, detail="User not found")

    if user_to_update.role == models.UserRole.ADMIN and request.role != models.UserRole.ADMIN:
        count_stmt = select(func.count(models.User.id)).where(models.User.role == models.UserRole.ADMIN)
        count_res = await db.execute(count_stmt)
        total_admins = count_res.scalar()
        
        if total_admins <= 1:
            raise HTTPException(
                status_code=400, 
                detail="Operation Forbidden: Cannot demote the last remaining Administrator."
            )
            
    user_to_update.role = request.role
    await db.commit()
    await db.refresh(user_to_update)

    # Invalidate all active sessions for the user whose role changed.
    # This forces them to re-login and get a fresh token reflecting the new role.
    sessions_stmt = select(models.UserSession).where(
        models.UserSession.user_id == user_to_update.id,
        models.UserSession.is_active == True
    )
    sessions_result = await db.execute(sessions_stmt)
    active_sessions = sessions_result.scalars().all()
    for session in active_sessions:
        session.is_active = False
    await db.commit()

    return user_to_update

@router.get("/me/sessions", response_model=List[schemas.UserSessionOut])
async def get_my_sessions(
    current_user: dict = Depends(dependencies.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    email = current_user.get("sub")
    user_stmt = select(models.User).where(models.User.email == email)
    user_res = await db.execute(user_stmt)
    db_user = user_res.scalars().first()
    
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    stmt = select(models.UserSession).where(
        models.UserSession.user_id == db_user.id,
        models.UserSession.is_active == True
    ).order_by(desc(models.UserSession.last_active))
    
    result = await db.execute(stmt)
    return result.scalars().all()

@router.delete("/me/sessions/{session_id}")
async def revoke_my_session(
    session_id: int,
    current_user: dict = Depends(dependencies.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    email = current_user.get("sub")
    user_stmt = select(models.User).where(models.User.email == email)
    user_res = await db.execute(user_stmt)
    db_user = user_res.scalars().first()
    
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    stmt = select(models.UserSession).where(
        models.UserSession.id == session_id,
        models.UserSession.user_id == db_user.id
    )
    result = await db.execute(stmt)
    session = result.scalars().first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or not owned by user")
        
    session.is_active = False
    await db.commit()
    return {"message": "Session revoked successfully"}

@router.get("/me/security-events", response_model=List[schemas.SecurityEventOut])
async def get_my_security_events(
    skip: int = 0,
    limit: int = 20,
    event_type: str = None,
    current_user: dict = Depends(dependencies.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    email = current_user.get("sub")
    user_stmt = select(models.User).where(models.User.email == email)
    user_res = await db.execute(user_stmt)
    db_user = user_res.scalars().first()
    
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    stmt = select(models.SecurityEvent).where(models.SecurityEvent.user_id == db_user.id)
    
    if event_type:
        stmt = stmt.where(models.SecurityEvent.event_type == event_type)
        
    stmt = stmt.order_by(desc(models.SecurityEvent.created_at)).offset(skip).limit(limit)
    result = await db.execute(stmt)
    events = result.scalars().all()
    
    # Attach username for schema compatibility
    for event in events:
        event.username = db_user.name
        
    return events