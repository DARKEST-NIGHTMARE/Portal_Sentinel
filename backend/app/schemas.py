from pydantic import BaseModel ,EmailStr
from typing import Optional, Dict, Any
from datetime import datetime
from .models import EventType

class GoogleLoginRequest(BaseModel):
    code: str

class LoginRequest(BaseModel):
    username: str
    password: str

class EmployeeCreate(BaseModel):
    name: str
    role: str
    department: str
    salary: int

class RoleChangeRequest(BaseModel):
    role: str

class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    avatar_url: Optional[str] = None  


class SecurityEventOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    event_type = EventType
    ip_address: Optional[str] = None
    event_metadata: Dict[str, Any] = {}
    created_at: datetime

    username: Optional[str] = None 

    class Config:
        from_attributes = True