from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

SQLALCHEMY_DATABASE_URL = "postgresql+asyncpg://postgres:argusadmin@localhost/oauth_db"
engine = create_async_engine(SQLALCHEMY_DATABASE_URL,echo=True)
# SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
AsyncSessionLocal = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
    # db = SessionLocal()
    # try:
    #     yield db
    # finally:
    #     db.close()