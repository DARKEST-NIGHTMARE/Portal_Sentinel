from fastapi import FastAPI, HTTPException, Depends ,Request,Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi import status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
from database import get_db
from models import User
import httpx
import jwt
import datetime
import os

app = FastAPI()

GOOGLE_CLIENT_ID = "655977974466-ptubcou0dq48ethbamn16du702djgl14.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET = "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"
REDIRECT_URI = "http://localhost:3000"
JWT_SECRET = "24ef95f11e11bd9c42168eaa48966834892220d38e541d99197c273cf6bcf5ca"
ALGORITHM = "HS256"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GoogleLoginRequest(BaseModel):
    code: str

class LoginRequest(BaseModel):
    username: str
    password: str

def create_jwt_token(email: str, name: str):
    payload = {
        "sub": email,
        "name": name,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=1)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)

def get_current_user(request: Request):
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        return payload 
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@app.get("/user")
def get_user_info(user: dict = Depends(get_current_user)):
    return {
        "name": user.get("name"),
        "email": user.get("sub"),
        "avatar_url": None 
    }

@app.post("/api/auth/login")
def login(payload: LoginRequest):
    if payload.username == "user" and payload.password == "password":
        token = create_jwt_token(payload.username, "Standard User")
        return {"token": token}
    raise HTTPException(status_code=401, detail="Bad credentials")

@app.post("/api/auth/google")
async def google_login(payload: GoogleLoginRequest, db: AsyncSession = Depends(get_db)):
    async with httpx.AsyncClient() as client:
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "code": payload.code,
            "grant_type": "authorization_code",
            "redirect_uri": REDIRECT_URI,
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

    # db_user = db.query(User).filter(User.email == email).first()
    stmt = select(User).where(User.email == email)
    result = await db.execute(stmt)
    db_user = result.scalars().first()
    
    if not db_user:
        new_user = User(
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

    local_token = create_jwt_token(email, name)
    
    return {
        "token": local_token,
        "user": {
            "name": name,
            "email": email,
            "avatar_url": avatar
        }
    }

@app.get("/logout")
def logout():
    return {"message": "Logged out successfully"}

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    # return status.HTTP_204_NO_CONTENT
    return Response(status_code=status.HTTP_204_NO_CONTENT)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8081)