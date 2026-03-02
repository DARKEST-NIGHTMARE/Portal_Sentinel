from fastapi import APIRouter, Depends, HTTPException, status, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from fastapi.security import HTTPBearer

from .. import models, schemas, database, dependencies
from ..services.websocket import security_ws_manager
from ..logger import get_logger

logger = get_logger(__name__)

token_auth_scheme = HTTPBearer()

router = APIRouter(
    prefix="/api/admin/security",
    tags=['Security Dashboard']
)

async def require_admin(
    current_user = Depends(dependencies.get_current_user),
    db: AsyncSession = Depends(database.get_db), 
    token = Depends(token_auth_scheme)
):
    
    role = getattr(current_user, 'role', None)
    if not role and isinstance(current_user, dict):
        role = current_user.get('role')

    if not role:
        email = getattr(current_user, 'email', None) 
        if not email and isinstance(current_user, dict):
            email = current_user.get('email') or current_user.get('sub') 

        if email:
            stmt = select(models.User).where(models.User.email == email)
            result = await db.execute(stmt)
            db_user = result.scalars().first()
            if db_user:
                role = db_user.role

    logger.debug("admin_role_check", extra={"role": str(role)})

    if role != models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Your role is '{role}'. Admin privileges required."
        )
        
    return current_user

@router.get("/events", response_model=List[schemas.SecurityEventOut])
async def get_security_events(
    skip: int = 0, 
    limit: int = 20,
    event_type: Optional[models.EventType] = None,
    user_id: Optional[int] = None,
    db: AsyncSession = Depends(database.get_db),
    admin = Depends(require_admin) 
):
    stmt = select(models.SecurityEvent)

    if event_type:
        stmt = stmt.where(models.SecurityEvent.event_type == event_type)
    if user_id:
        stmt = stmt.where(models.SecurityEvent.user_id == user_id)

    stmt = stmt.order_by(desc(models.SecurityEvent.created_at)).offset(skip).limit(limit)
    
    result = await db.execute(stmt)
    events = result.scalars().all()

    for event in events:
        if event.user_id:
            user_stmt = select(models.User).where(models.User.id == event.user_id)
            user_result = await db.execute(user_stmt)
            user = user_result.scalars().first()
            event.username = user.name if user else "Unknown"

    return events

@router.get("/active-users")
async def get_active_users(
    days: int = Query(7, description="Number of days to look back"),
    db: AsyncSession = Depends(database.get_db),
    admin = Depends(require_admin)
):
    time_threshold = datetime.now(timezone.utc) - timedelta(days=days)

    stmt = select(
        models.SecurityEvent.user_id,
        func.max(models.SecurityEvent.created_at).label("last_seen"),
        func.count(models.SecurityEvent.id).label("total_logins")
    ).where(
        models.SecurityEvent.event_type == models.EventType.ACTIVE_SESSION,
        models.SecurityEvent.created_at >= time_threshold,
        models.SecurityEvent.user_id.isnot(None)
    ).group_by(models.SecurityEvent.user_id)

    result = await db.execute(stmt)
    recent_events = result.all()

    activity_list = []
    for row in recent_events:
        user_id, last_seen, total_logins = row

        user_stmt = select(models.User).where(models.User.id == user_id)
        user_result = await db.execute(user_stmt)
        user = user_result.scalars().first()

        if user:
            ip_stmt = select(models.SecurityEvent).where(
                models.SecurityEvent.user_id == user.id,
                models.SecurityEvent.event_type == models.EventType.ACTIVE_SESSION
            ).order_by(desc(models.SecurityEvent.created_at))
            
            ip_result = await db.execute(ip_stmt)
            last_login_event = ip_result.scalars().first()

            activity_list.append({
                "user_id": user.id,
                "name": user.name,
                "email": user.email,
                "last_seen": last_seen,
                "last_ip": last_login_event.ip_address if last_login_event else None,
                "total_logins": total_logins
            })

    activity_list.sort(key=lambda x: x["last_seen"], reverse=True)
    return activity_list

@router.get("/sessions", response_model=List[schemas.UserSessionOut])
async def get_all_sessions(
    db: AsyncSession = Depends(database.get_db),
    admin = Depends(require_admin)
):
    stmt = select(models.UserSession).where(models.UserSession.is_active == True).order_by(desc(models.UserSession.last_active))
    result = await db.execute(stmt)
    sessions = result.scalars().all()
    
    for session in sessions:
        user_stmt = select(models.User).where(models.User.id == session.user_id)
        user_result = await db.execute(user_stmt)
        user = user_result.scalars().first()
        if user:
            session.user_name = user.name
            session.user_email = user.email

    return sessions

@router.delete("/sessions/{session_id}")
async def revoke_user_session(
    session_id: int,
    db: AsyncSession = Depends(database.get_db),
    admin = Depends(require_admin)
):
    stmt = select(models.UserSession).where(models.UserSession.id == session_id)
    result = await db.execute(stmt)
    session = result.scalars().first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session.is_active = False
    await db.commit()
    return {"message": "Session revoked successfully"}

@router.websocket("/ws")
async def websocket_security_endpoint(websocket: WebSocket):
    await security_ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        security_ws_manager.disconnect(websocket)