from sqlalchemy import create_engine, Column, Integer, String
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    avatar_url = Column(String, nullable=True)
    provider = Column(String, default="google")  
    password_hash = Column(String, nullable=True)
    role = Column(String, default="user")