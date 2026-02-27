from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..models import User

class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email)
        result = await self.db.execute(stmt)
        return result.scalars().first()
        
    async def get_by_id(self, user_id: int) -> User | None:
        stmt = select(User).where(User.id == user_id)
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def create(self, email: str, name: str, password_hash: str = None, avatar_url: str = None, provider: str = "local") -> User:
        new_user = User(
            email=email, 
            name=name, 
            avatar_url=avatar_url, 
            provider=provider,
            password_hash=password_hash
        )
        self.db.add(new_user)
        await self.db.commit()
        await self.db.refresh(new_user)
        return new_user

    async def update(self, user: User, **kwargs):
        for key, value in kwargs.items():
            setattr(user, key, value)
        await self.db.commit()
        return user
