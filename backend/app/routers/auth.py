from fastapi import APIRouter, Depends, HTTPException, status, Form, UploadFile, File, Request # <-- Added Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx
import uuid
import os
import shutil

from .. import models, schemas, database, dependencies
from ..config import settings
from ..services.security_service import SecurityService 
from ..models import EventType 

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login")
async def login(request: Request, payload: schemas.LoginRequest, db: AsyncSession = Depends(database.get_db)):
    client_ip = request.client.host

    # --- 1. Brute Force Check ---
    if await SecurityService.is_ip_locked_out(db, client_ip):
        await SecurityService.log_event(db, EventType.ACCOUNT_LOCKED, client_ip, event_metadata={"reason": "Too many failed attempts"})
        raise HTTPException(status_code=429, detail="Too many failed login attempts. Please try again in 5 minutes.")

    stmt = select(models.User).where(models.User.email == payload.username)
    result = await db.execute(stmt)
    db_user = result.scalars().first()

    if not db_user or not db_user.password_hash or not dependencies.verify_password(payload.password, db_user.password_hash):
        await SecurityService.log_event(
            db, EventType.FAILED_LOGIN, client_ip, 
            user_id=db_user.id if db_user else None, 
            event_metadata={"attempted_email": payload.username}
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")

    await SecurityService.check_suspicious_activity(db, db_user.id, client_ip)
    await SecurityService.log_event(db, EventType.ACTIVE_SESSION, client_ip, user_id=db_user.id)

    token = dependencies.create_jwt_token(db_user.email, db_user.name)
    return {"token": token}


@router.post("/google")
async def google_login(request: Request, payload: schemas.GoogleLoginRequest, db: AsyncSession = Depends(database.get_db)):
    client_ip = request.client.host
    
    async with httpx.AsyncClient() as client:
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "code": payload.code,
            "grant_type": "authorization_code",
            "redirect_uri": settings.google_redirect_uri,
        }
        
        token_res = await client.post(token_url, data=token_data)
        
        if token_res.status_code != 200:
            print("Google Error:", token_res.text)
            raise HTTPException(status_code=400, detail="Invalid Google Code")
            
        access_token = token_res.json().get("access_token")
        
        user_info_res = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        user_info = user_info_res.json()

    email = user_info.get("email")
    name = user_info.get("name")
    avatar = user_info.get("picture")

    stmt = select(models.User).where(models.User.email == email)
    result = await db.execute(stmt)
    db_user = result.scalars().first()
    
    if not db_user:
        new_user = models.User(
            email=email, 
            name=name, 
            avatar_url=avatar, 
            provider="google"
        )
        db.add(new_user)
        await db.commit()     
        await db.refresh(new_user) 
        db_user = new_user 
        print(f"Created New User: {email}")
    else:
        db_user.name = name
        db_user.avatar_url = avatar
        await db.commit()
        print(f"Welcome back: {email}")

    await SecurityService.check_suspicious_activity(db, db_user.id, client_ip)
    await SecurityService.log_event(db, EventType.ACTIVE_SESSION, client_ip, user_id=db_user.id, event_metadata={"provider": "google"})

    local_token = dependencies.create_jwt_token(email, name)
    
    return {
        "token": local_token,
        "user": {
            "name": name,
            "email": email,
            "avatar_url": avatar,
            "role": db_user.role if hasattr(db_user, 'role') else "user"
        }
    }

@router.post("/register")
async def register_user(
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    profile_picture: UploadFile = File(None),
    db: AsyncSession = Depends(database.get_db)
):
    stmt = select(models.User).where(models.User.email == email)
    result = await db.execute(stmt)
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    avatar_url = None
    if profile_picture:
        os.makedirs("static/profiles", exist_ok=True)
        
        file_extension = profile_picture.filename.split(".")[-1]
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = f"static/profiles/{unique_filename}"

        contents = await profile_picture.read()
        with open(file_path, "wb") as f:
            f.write(contents)

        avatar_url = f"/static/profiles/{unique_filename}"

    hashed_password = dependencies.hash_password(password)
    
    new_user = models.User(
        email=email, 
        name=name, 
        avatar_url=avatar_url, 
        provider="local",
        password_hash=hashed_password
    )
    db.add(new_user)
    await db.commit()

    return {"message": "User registered successfully"}