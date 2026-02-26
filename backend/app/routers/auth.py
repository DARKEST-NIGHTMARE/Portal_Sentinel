from fastapi import APIRouter, Depends, HTTPException, status, Form, UploadFile, File, Request, Response, Cookie
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


async def get_ip_location(ip: str) -> str:
    if ip in ["127.0.0.1", "::1", "localhost", "0.0.0.0"]:
        return "Localhost (Testing)"
    
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(f"http://ip-api.com/json/{ip}?fields=city,country,status")
            data = res.json()
            if data.get("status") == "success":
                return f"{data.get('city')}, {data.get('country')}"
    except Exception as e:
        print(f"Location lookup failed: {e}")
    return "Unknown Location"

async def get_coord_location(lat: float, lon: float) -> str:
    try:
        async with httpx.AsyncClient() as client:
            headers = {"User-Agent": "SecurityApp/1.0"}
            res = await client.get(
                f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}",
                headers=headers
            )
            if res.status_code == 200:
                data = res.json()
                address = data.get("address", {})
                city = address.get("city") or address.get("town") or address.get("village") or address.get("county")
                country = address.get("country")
                
                if city and country:
                    return f"{city}, {country}"
    except Exception as e:
        print(f"Coordinate lookup failed: {e}")
        
    return None 

@router.post("/login")
async def login(request: Request,response: Response, payload: schemas.LoginRequest, db: AsyncSession = Depends(database.get_db)):
    client_ip = request.client.host
    location = None
    location_source = "unknown"

    if payload.latitude and payload.longitude:
        location = await get_coord_location(payload.latitude, payload.longitude)
        if location:
            location_source = "GPS(precise)"

    if not location:
        location = await get_ip_location(client_ip)
        location_source = "IP(approximate)"
    # location = await get_ip_location(client_ip)

    if await SecurityService.is_ip_locked_out(db, client_ip):

        stmt = select(models.User).where(models.User.email == payload.username)
        result = await db.execute(stmt)
        target_user = result.scalars().first()


        await SecurityService.log_event(
            db, 
            EventType.ACCOUNT_LOCKED, 
            client_ip, 
            user_id=target_user.id if target_user else None, 
            event_metadata={
                "reason": "Too many failed attempts",
                "targeted_email": payload.username
            }
        )
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
    await SecurityService.log_event(
        db, 
        EventType.ACTIVE_SESSION, 
        client_ip, 
        user_id=db_user.id,
        event_metadata={"location": location, "location_source": location_source} 
    )

    access_token = dependencies.create_jwt_token(db_user.email, db_user.name)
    refresh_token = dependencies.create_refresh_token(db_user.email)

    response.set_cookie(
        key = "refresh_token",
        value = refresh_token,
        httponly = True,
        max_age = 7*24*3600,
        samesite = "lax",
        secure = False
    )
    return {"token": access_token}


@router.post("/google")
async def google_login(request: Request, response: Response, payload: schemas.GoogleLoginRequest, db: AsyncSession = Depends(database.get_db)):
    client_ip = request.client.host

    location = None
    location_source = "unknown"

    if payload.latitude and payload.longitude:
        location = await get_coord_location(payload.latitude, payload.longitude)
        if location:
            location_source = "GPS(precise)"

    if not location:
        location = await get_ip_location(client_ip)
        location_source = "IP(approximate)"

    # location = await get_ip_location(client_ip)
    
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
    await SecurityService.log_event(
        db, 
        EventType.ACTIVE_SESSION, 
        client_ip, 
        user_id=db_user.id, 
        event_metadata={"provider": "google", "location": location, "location_source": location_source})

    local_token = dependencies.create_jwt_token(email, name)
    refresh_token = dependencies.create_refresh_token(email)

    response.set_cookie(
        key = "refresh_token",
        value = refresh_token,
        httponly = True,
        max_age = 7*24*3600,
        samesite = "lax",
        secure = False
    )
    
    return {
        "token": local_token,
        "user": {
            "name": name,
            "email": email,
            "avatar_url": avatar,
            "role": db_user.role if hasattr(db_user, 'role') else "user"
        }
    }

@router.post("/refresh")
async def refresh_access_token(refresh_token: str = Cookie(None), db: AsyncSession = Depends(database.get_db)):
    """to be called when access token expires"""
    if not refresh_token:
        raise HTTPException(sttaus_code=401, detail = "Refresh toekn missing")
    
    email = dependencies.verify_refresh_token(refresh_token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    
    stmt = select(models.User).where(models.User.email == email)
    result = await db.execute(stmt)
    db_user = result.scalars().first()
    
    if not db_user:
        raise HTTPException(status_code=401, detail="User not found")
    new_access_token = dependencies.create_jwt_token(db_user.email, db_user.name)
    return {"token": new_access_token}

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

@router.post("/logout")
async def logout(response: Response):
    """clears http-only cookie"""
    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}