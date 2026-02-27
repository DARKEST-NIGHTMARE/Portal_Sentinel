from fastapi import FastAPI, Depends, Response, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .core.database import engine, Base, get_db
from .api import auth, employees, users, security
from . import models
from .core import dependencies
from .core.config import settings

app = FastAPI()

import os
os.makedirs("static/profiles", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

app.include_router(auth.router)
app.include_router(employees.router)
app.include_router(users.router)
app.include_router(security.router)

@app.get("/user")
async def get_user_info(
    user: dict = Depends(dependencies.get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    email = user.get("sub")
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

@app.get("/logout")
def logout():
    return {"message": "Logged out successfully"}

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return Response(status_code=status.HTTP_204_NO_CONTENT)