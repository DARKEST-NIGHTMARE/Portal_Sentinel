from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List

from .. import models, schemas, database, dependencies

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

    if user_to_update.role == "admin" and request.role != "admin":
        count_stmt = select(func.count(models.User.id)).where(models.User.role == "admin")
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
    return user_to_update
    
    # return {"message": f"User {user_to_update.email} updated to {request.role}"}