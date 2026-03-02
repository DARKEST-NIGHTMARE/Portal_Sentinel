from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import jwt
import datetime
import bcrypt
from datetime import datetime, timedelta, timezone
from .database import get_db
from .models import User, UserSession, UserRole
from .config import settings

JWT_SECRET = settings.secret_key
ALGORITHM = settings.algorithm

def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password=pwd_bytes, salt=salt)
    return hashed_password.decode('utf-8') 

def verify_password(plain_password: str, hashed_password: str) -> bool:
    password_byte_enc = plain_password.encode('utf-8')
    hashed_password_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password=password_byte_enc, hashed_password=hashed_password_bytes)

def create_jwt_token(email: str, name: str, session_id: int = None):
    payload = {
        "sub": email,
        "name": name,
        "exp": datetime.now(timezone.utc) + timedelta(days=1)
    }
    if session_id is not None:
        payload["session_id"] = session_id
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)

def create_refresh_token(email: str) -> str:
    """a 7 day refresh token"""
    expire = datetime.now(timezone.utc) + timedelta(days = 7)
    to_encode = {"sub": email, "type": "refresh", "exp": expire}

    encoded_jwt = jwt.encode(
        to_encode, 
        settings.secret_key,
        algorithm = settings.algorithm
    )
    return encoded_jwt

def verify_refresh_token(token: str):
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms = [settings.algorithm])
        if payload.get("type") != "refresh":
            return None
        return payload.get("sub")
    except Exception:
        return None

async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)):
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        
        session_id = payload.get("session_id")
        if session_id:
            stmt = select(UserSession).where(UserSession.id == session_id)
            result = await db.execute(stmt)
            active_session = result.scalars().first()
            if not active_session or not active_session.is_active:
                raise HTTPException(status_code=401, detail="Session revoked or invalid")
                
        return payload 
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_admin(
    user: dict = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    email = user.get("sub")
    stmt = select(User).where(User.email == email)
    result = await db.execute(stmt)
    db_user = result.scalars().first()
    
    if not db_user or db_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized. Admins only!")
    return db_user