from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..models import UserSession
from datetime import datetime, timezone

class SessionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, user_id: int, refresh_token: str, device_info: str, ip_address: str, location: str) -> UserSession:
        new_session = UserSession(
            user_id=user_id,
            refresh_token=refresh_token,
            device_info=device_info,
            ip_address=ip_address,
            location=location
        )
        self.db.add(new_session)
        await self.db.commit()
        await self.db.refresh(new_session)
        return new_session

    async def get_by_id(self, session_id: int) -> UserSession | None:
        stmt = select(UserSession).where(UserSession.id == session_id)
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_active_by_refresh_token(self, token: str) -> UserSession | None:
        stmt = select(UserSession).where(
            UserSession.refresh_token == token,
            UserSession.is_active == True
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def update_last_active(self, session: UserSession):
        session.last_active = datetime.now(timezone.utc)
        await self.db.commit()

    async def revoke(self, session: UserSession):
        session.is_active = False
        await self.db.commit()
