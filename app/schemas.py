from pydantic import BaseModel
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