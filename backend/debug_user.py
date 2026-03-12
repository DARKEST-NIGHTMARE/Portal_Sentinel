import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

async def check_user():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT email, is_totp_enabled, totp_secret FROM users;"))
        for row in result:
            print(f"Email: {row[0]}, TOTP Enabled: {row[1]}, Secret Set: {row[2] is not None}")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_user())
