from pydantic import BaseModel ,EmailStr
from typing import Optional

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

class Config:
    from_attributes = True