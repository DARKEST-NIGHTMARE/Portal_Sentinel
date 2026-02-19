import sys
import os
import asyncio
from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from dotenv import load_dotenv
from alembic import context

# 1. SET THE PATH FIRST
# This points to the 'backend' folder so Python can see the 'app' package
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, BASE_DIR)

# 2. LOAD THE .ENV FILE
load_dotenv(os.path.join(BASE_DIR, '.env'))

# 3. NOW DO THE IMPORTS
# Import the Base from your database file
from app.database import Base

# IMPORTANT: You MUST import your models file here. 
# Even if you don't use the 'models' variable, this line "registers" 
# your User, Employee, etc., tables onto the Base.metadata.
import app.models 

# 4. CONFIGURATION
config = context.config

# Set the SQLAlchemy URL from the environment variable
config.set_main_option("sqlalchemy.url", os.getenv("DATABASE_URL"))

# Setup logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# 5. TARGET METADATA
# This allows 'autogenerate' to compare your models to your database
target_metadata = Base.metadata

# ... (the rest of the file: run_migrations_offline / online stays the same)

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()

async def run_async_migrations():
    """In this scenario we need to create an Engine
    and associate a connection with the context.
    """
    from sqlalchemy.ext.asyncio import async_engine_from_config

    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()

def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    # This handles the async event loop
    asyncio.run(run_async_migrations())

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()