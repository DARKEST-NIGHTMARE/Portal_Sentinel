import asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

from app.core.config import settings
from app.services.clio_service import ClioService
from app.models import User

async def main():
    engine = create_async_engine(settings.database_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        user = await db.get(User, 7)
        if not user:
            print("User 7 not found")
            return
            
        await db.refresh(user, ["clio_connection"])
        
        async with AsyncClient() as client:
            clio = ClioService(db, client)
            
            # Fetch calendars
            try:
                calendars = await clio._request("GET", "/api/v4/calendars.json", user)
                print("Calendars:", calendars)
            except Exception as e:
                print("Error fetching calendars:", e)

if __name__ == "__main__":
    asyncio.run(main())
