from fastapi import APIRouter, Depends, Form, UploadFile, File, Request, Response, Cookie
from sqlalchemy.ext.asyncio import AsyncSession
from .. import schemas
from ..core.database import get_db
from ..services.auth_service import AuthService
from ..services.location_service import LocationService
import os, uuid

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login")
async def login(request: Request, response: Response, payload: schemas.LoginRequest, db: AsyncSession = Depends(get_db)):
    client_ip = request.client.host
    location_str = "Unknown"
    location_source = "Unknown"
    
    if payload.latitude and payload.longitude:
        location_str = await LocationService.get_coord_location(payload.latitude, payload.longitude)
        location_source = "GPS (Precise)"
        
    if not location_str or location_str == "Unknown":
        ip_data = await LocationService.get_ip_location_data(client_ip)
        location_str = ip_data["location"]
        location_source = "IP (Approximate)"

    auth_service = AuthService(db)
    access_token, refresh_token, _ = await auth_service.authenticate_local(
        email=payload.username, 
        password=payload.password, 
        client_ip=client_ip, 
        location_str=location_str, 
        location_source=location_source, 
        lat=payload.latitude, 
        lon=payload.longitude, 
        device_info=request.headers.get("User-Agent", "Unknown Device")
    )

    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, max_age=7*24*3600, samesite="lax", secure=False)
    return {"token": access_token}


@router.post("/google")
async def google_login(request: Request, response: Response, payload: schemas.GoogleLoginRequest, db: AsyncSession = Depends(get_db)):
    client_ip = request.client.host
    location_str = "Unknown"
    location_source = "Unknown"
    
    if payload.latitude and payload.longitude:
        location_str = await LocationService.get_coord_location(payload.latitude, payload.longitude)
        location_source = "GPS (Precise)"
        
    if not location_str or location_str == "Unknown":
        ip_data = await LocationService.get_ip_location_data(client_ip)
        location_str = ip_data["location"]
        location_source = "IP (Approximate)"

    auth_service = AuthService(db)
    access_token, refresh_token, db_user = await auth_service.authenticate_google(
        code=payload.code, 
        client_ip=client_ip, 
        location_str=location_str, 
        location_source=location_source, 
        lat=payload.latitude, 
        lon=payload.longitude, 
        device_info=request.headers.get("User-Agent", "Unknown Device")
    )

    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, max_age=7*24*3600, samesite="lax", secure=False)
    return {
        "token": access_token,
        "user": {
            "name": db_user.name, 
            "email": db_user.email, 
            "avatar_url": db_user.avatar_url, 
            "role": db_user.role if hasattr(db_user, 'role') else "user"
        }
    }


@router.post("/refresh")
async def refresh_access_token(refresh_token: str = Cookie(None), db: AsyncSession = Depends(get_db)):
    auth_service = AuthService(db)
    new_access_token = await auth_service.refresh_token(refresh_token)
    return {"token": new_access_token}


@router.post("/register")
async def register_user(
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    profile_picture: UploadFile = File(None),
    db: AsyncSession = Depends(get_db)
):
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

    auth_service = AuthService(db)
    await auth_service.register(email, name, password, avatar_url)
    return {"message": "User registered successfully"}


@router.post("/logout")
async def logout(refresh_token: str = Cookie(None), response: Response = None, db: AsyncSession = Depends(get_db)):
    auth_service = AuthService(db)
    await auth_service.logout(refresh_token)
    if response:
        response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}