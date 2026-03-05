from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from ..core.database import get_db
from ..core.dependencies import get_clio_user, get_current_user, get_http_client
import httpx
from ..models import User
from ..services.clio_service import ClioService
from ..schemas import BookSlotRequest

router = APIRouter(prefix="/api/clio", tags=["clio"])

@router.get("/matters")
async def get_clio_matters(
    current_user: User = Depends(get_clio_user),
    db: AsyncSession = Depends(get_db),
    http_client: httpx.AsyncClient = Depends(get_http_client)
):
    clio_service = ClioService(db, http_client)
    return await clio_service.get_matters(current_user)

@router.post("/matters")
async def create_clio_matter(
    payload: dict,
    current_user: User = Depends(get_clio_user),
    db: AsyncSession = Depends(get_db),
    http_client: httpx.AsyncClient = Depends(get_http_client)
):
    clio_service = ClioService(db, http_client)
    return await clio_service.create_matter(current_user, payload)

@router.get("/contacts")
async def get_clio_contacts(
    current_user: User = Depends(get_clio_user),
    db: AsyncSession = Depends(get_db),
    http_client: httpx.AsyncClient = Depends(get_http_client)
):
    clio_service = ClioService(db, http_client)
    return await clio_service.get_contacts(current_user)

@router.get("/calendar")
async def get_clio_calendar(
    current_user: User = Depends(get_clio_user),
    db: AsyncSession = Depends(get_db),
    http_client: httpx.AsyncClient = Depends(get_http_client)
):
    clio_service = ClioService(db, http_client)
    return await clio_service.get_calendar_events(current_user)

@router.get("/communications")
async def get_clio_communications(
    current_user: User = Depends(get_clio_user),
    db: AsyncSession = Depends(get_db),
    http_client: httpx.AsyncClient = Depends(get_http_client)
):
    clio_service = ClioService(db, http_client)
    return await clio_service.get_communications(current_user)

@router.post("/book-slot")
async def book_slot_endpoint(
    request: BookSlotRequest,
    current_user: User = Depends(get_clio_user),
    db: AsyncSession = Depends(get_db),
    http_client: httpx.AsyncClient = Depends(get_http_client)
):
    clio_service = ClioService(db, http_client)
    return await clio_service.book_slot(
        current_user,
        request.date,
        request.start_time,
        request.end_time,
        request.summary,
        request.timezone_offset
    )
