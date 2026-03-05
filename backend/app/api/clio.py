from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from ..core.database import get_db
from ..core.dependencies import get_clio_user, get_current_user
from ..models import User
from ..services.clio_service import ClioService

router = APIRouter(prefix="/api/clio", tags=["clio"])

@router.get("/matters")
async def get_clio_matters(
    current_user: User = Depends(get_clio_user),
    db: AsyncSession = Depends(get_db)
):
    clio_service = ClioService(db)
    return await clio_service.get_matters(current_user)

@router.post("/matters")
async def create_clio_matter(
    payload: dict,
    current_user: User = Depends(get_clio_user),
    db: AsyncSession = Depends(get_db)
):
    clio_service = ClioService(db)
    return await clio_service.create_matter(current_user, payload)

@router.get("/contacts")
async def get_clio_contacts(
    current_user: User = Depends(get_clio_user),
    db: AsyncSession = Depends(get_db)
):
    clio_service = ClioService(db)
    return await clio_service.get_contacts(current_user)

@router.get("/calendar")
async def get_clio_calendar(
    current_user: User = Depends(get_clio_user),
    db: AsyncSession = Depends(get_db)
):
    clio_service = ClioService(db)
    return await clio_service.get_calendar_events(current_user)

@router.get("/communications")
async def get_clio_communications(
    current_user: User = Depends(get_clio_user),
    db: AsyncSession = Depends(get_db)
):
    clio_service = ClioService(db)
    return await clio_service.get_communications(current_user)
