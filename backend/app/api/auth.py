from fastapi import APIRouter, Depends, Form, UploadFile, File, Request, Response, Cookie, HTTPException
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
    http_client = request.app.state.http_client
    location_str = "Unknown"
    location_source = "Unknown"
    
    if payload.latitude and payload.longitude:
        location_str = await LocationService.get_coord_location(payload.latitude, payload.longitude, http_client)
        location_source = "GPS (Precise)"
        
    if not location_str or location_str == "Unknown":
        ip_data = await LocationService.get_ip_location_data(client_ip, http_client)
        location_str = ip_data["location"]
        location_source = "IP (Approximate)"

    auth_service = AuthService(db, http_client)
    db_user = await auth_service.authenticate_local(
        email=payload.username, 
        password=payload.password, 
        client_ip=client_ip, 
        location_str=location_str, 
        location_source=location_source, 
        lat=payload.latitude, 
        lon=payload.longitude, 
        device_info=request.headers.get("User-Agent", "Unknown Device")
    )

    otp_code = await auth_service.generate_otp(db_user.id)
    print(f"\n{'='*50}")
    print(f"📧 [2FA] OTP for {db_user.email}: {otp_code}")
    print(f"{'='*50}\n")

    return {"status": "2FA_REQUIRED", "user_id": db_user.id}


@router.post("/login/verify-2fa")
async def verify_2fa(request: Request, response: Response, payload: schemas.Verify2FARequest, db: AsyncSession = Depends(get_db)):
    client_ip = request.client.host
    http_client = request.app.state.http_client

    auth_service = AuthService(db, http_client)
    db_user = await auth_service.verify_otp(payload.user_id, payload.code)

    access_token, refresh_token, _ = await auth_service.finalize_login_for_user(
        user_id=db_user.id,
        client_ip=client_ip,
        location_str="Verified via 2FA",
        location_source="2FA",
        lat=None,
        lon=None,
        device_info=request.headers.get("User-Agent", "Unknown Device")
    )

    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, max_age=7*24*3600, samesite="lax", secure=False)
    return {"token": access_token}


@router.post("/login/resend-otp")
async def resend_otp(request: Request, payload: schemas.ResendOTPRequest, db: AsyncSession = Depends(get_db)):
    http_client = request.app.state.http_client
    auth_service = AuthService(db, http_client)
    
    from ..repositories.user_repo import UserRepository
    user_repo = UserRepository(db)
    db_user = await user_repo.get_by_id(payload.user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    otp_code = await auth_service.generate_otp(db_user.id)
    print(f"\n{'='*50}")
    print(f"📧 [2FA RESEND] OTP for {db_user.email}: {otp_code}")
    print(f"{'='*50}\n")

    return {"status": "OTP_RESENT"}


@router.post("/google")
async def google_login(request: Request, response: Response, payload: schemas.GoogleLoginRequest, db: AsyncSession = Depends(get_db)):
    client_ip = request.client.host
    http_client = request.app.state.http_client
    location_str = "Unknown"
    location_source = "Unknown"
    
    if payload.latitude and payload.longitude:
        location_str = await LocationService.get_coord_location(payload.latitude, payload.longitude, http_client)
        location_source = "GPS (Precise)"
        
    if not location_str or location_str == "Unknown":
        ip_data = await LocationService.get_ip_location_data(client_ip, http_client)
        location_str = ip_data["location"]
        location_source = "IP (Approximate)"

    auth_service = AuthService(db, http_client)
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
            "role": db_user.role if hasattr(db_user, 'role') else "user",
            "provider": db_user.provider
        }
    }


@router.post("/clio")
async def clio_login(request: Request, response: Response, payload: schemas.ClioLoginRequest, db: AsyncSession = Depends(get_db)):
    client_ip = request.client.host
    http_client = request.app.state.http_client
    location_str = "Unknown"
    location_source = "Unknown"
    
    if payload.latitude and payload.longitude:
        location_str = await LocationService.get_coord_location(payload.latitude, payload.longitude, http_client)
        location_source = "GPS (Precise)"
        
    if not location_str or location_str == "Unknown":
        ip_data = await LocationService.get_ip_location_data(client_ip, http_client)
        location_str = ip_data["location"]
        location_source = "IP (Approximate)"

    auth_service = AuthService(db, http_client)
    access_token, refresh_token, db_user = await auth_service.authenticate_clio(
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
            "role": db_user.role if hasattr(db_user, 'role') else "user",
            "provider": db_user.provider
        }
    }


@router.post("/refresh")
async def refresh_access_token(request: Request, refresh_token: str = Cookie(None), db: AsyncSession = Depends(get_db)):
    http_client = request.app.state.http_client
    auth_service = AuthService(db, http_client)
    new_access_token = await auth_service.refresh_token(refresh_token)
    return {"token": new_access_token}


@router.post("/register")
async def register_user(
    request: Request,
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

    http_client = request.app.state.http_client
    auth_service = AuthService(db, http_client)
    await auth_service.register(email, name, password, avatar_url)
    return {"message": "User registered successfully"}


@router.post("/logout")
async def logout(request: Request, refresh_token: str = Cookie(None), response: Response = None, db: AsyncSession = Depends(get_db)):
    http_client = request.app.state.http_client
    auth_service = AuthService(db, http_client)
    await auth_service.logout(refresh_token)
    if response:
        response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}