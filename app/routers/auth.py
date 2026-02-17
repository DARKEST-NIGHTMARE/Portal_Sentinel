from fastapi import APIRouter, Depends, HTTPException, status, Form, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx
import uuid
import os
import shutil

from .. import models, schemas, database, dependencies
from ..config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# GOOGLE_CLIENT_ID = "655977974466-ptubcou0dq48ethbamn16du702djgl14.apps.googleusercontent.com"
# GOOGLE_CLIENT_SECRET = "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"
# REDIRECT_URI = "http://localhost:3000"

@router.post("/login")
async def login(payload: schemas.LoginRequest, db: AsyncSession = Depends(database.get_db)):
    stmt = select(models.User).where(models.User.email == payload.username)
    result = await db.execute(stmt)
    db_user = result.scalars().first()

    if not db_user or not db_user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not dependencies.verify_password(payload.password, db_user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = dependencies.create_jwt_token(db_user.email, db_user.name)
    return {"token": token}

@router.post("/google")
async def google_login(payload: schemas.GoogleLoginRequest, db: AsyncSession = Depends(database.get_db)):
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
        print(f"Created New User: {email}")
    else:
        db_user.name = name
        db_user.avatar_url = avatar
        await db.commit()
        print(f"Welcome back: {email}")

    local_token = dependencies.create_jwt_token(email, name)
    
    return {
        "token": local_token,
        "user": {
            "name": name,
            "email": email,
            "avatar_url": avatar,
            "role": db_user.role if db_user else "user"
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