from pydantic import BaseModel ,EmailStr
from typing import Optional, Dict, Any
from datetime import datetime
from .models import EventType, UserRole

class GoogleLoginRequest(BaseModel):
    code: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class LoginRequest(BaseModel):
    username: str
    password: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class EmployeeCreate(BaseModel):
    name: str
    role: str
    department: str
    salary: int

class RoleChangeRequest(BaseModel):
    role: UserRole

class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: UserRole
    avatar_url: Optional[str] = None  


class SecurityEventOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    event_type: EventType
    ip_address: Optional[str] = None
    event_metadata: Dict[str, Any] = {}
    created_at: datetime

    username: Optional[str] = None 

class UserActivityOut(BaseModel):
    user_id: int
    name: str
    email: str
    last_seen: datetime
    last_ip: Optional[str] = None
    total_logins: int

    class Config:
        from_attributes = True

class UserSessionOut(BaseModel):
    id: int
    user_id: int
    refresh_token: str
    device_info: Optional[str] = None
    ip_address: Optional[str] = None
    location: Optional[str] = None
    is_active: bool
    created_at: datetime
    last_active: datetime
    user_name: Optional[str] = None
    user_email: Optional[str] = None

    class Config:
        from_attributes = True