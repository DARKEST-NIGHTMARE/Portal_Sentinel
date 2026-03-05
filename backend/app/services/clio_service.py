import httpx
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from ..core.config import settings
from ..repositories.user_repo import UserRepository
from ..models import User

class ClioService:
    def __init__(self, db: AsyncSession, http_client: httpx.AsyncClient):
        self.db = db
        self.http_client = http_client
        self.user_repo = UserRepository(db)

    async def get_valid_token(self, user: User) -> str:
        """
        Returns the current access token. 
        """
        conn = user.clio_connection
        if not conn or not conn.access_token:
            raise HTTPException(status_code=400, detail="User has no Clio connection")
        return conn.access_token

    async def refresh_clio_token(self, user: User) -> str:
        conn = user.clio_connection
        if not conn or not conn.refresh_token:
            raise HTTPException(status_code=400, detail="No refresh token available for Clio")

        base_url = conn.base_url or settings.clio_base_url
        refresh_url = f"{base_url}/oauth/token"
        refresh_data = {
            "client_id": settings.clio_client_id,
            "client_secret": settings.clio_client_secret,
            "grant_type": "refresh_token",
            "refresh_token": conn.refresh_token,
            "redirect_uri": settings.clio_redirect_uri
        }

        res = await self.http_client.post(refresh_url, data=refresh_data)
        if res.status_code != 200:
            print(f"Clio Token Refresh Failed: {res.text}")
            raise HTTPException(status_code=401, detail="Clio session expired. Please re-login with Clio.")

        token_json = res.json()
        new_access_token = token_json.get("access_token")
        new_refresh_token = token_json.get("refresh_token")

        # Update database
        conn.access_token = new_access_token
        conn.refresh_token = new_refresh_token
        await self.db.commit()
        
        return new_access_token

    async def _request(self, method: str, path: str, user: User, **kwargs):
        """Internal helper to handle authenticated requests with optimistic retry."""
        token = await self.get_valid_token(user)
        
        headers = kwargs.get("headers", {})
        headers.update({
            "Authorization": f"Bearer {token}",
            "Accept": "application/json"
        })
        kwargs["headers"] = headers

        conn = user.clio_connection
        if not conn:
             raise HTTPException(status_code=401, detail="No Clio connection found")

        base_url = conn.base_url or settings.clio_base_url
        url = f"{base_url}{path}"
        res = await self.http_client.request(method, url, **kwargs)
        
        # Catch 401 and try to refresh once
        if res.status_code == 401:
            print(f"Token expired for {user.email}, attempting refresh...")
            token = await self.refresh_clio_token(user)
            headers["Authorization"] = f"Bearer {token}"
            kwargs["headers"] = headers
            res = await self.http_client.request(method, url, **kwargs)

        if res.status_code >= 400:
            print(f"Clio API Error ({res.status_code}) on {path}: {res.text}")
            raise HTTPException(status_code=res.status_code, detail=f"Clio API Error: {res.text}")
        
        return res.json()

    async def get_matters(self, user: User, params: dict = None):
        default_params = {"fields": "id,display_number,client,status,description"}
        if params:
            default_params.update(params)
        data = await self._request("GET", "/api/v4/matters.json", user, params=default_params)
        return data.get("data", [])

    async def create_matter(self, user: User, payload: dict):
        data = await self._request("POST", "/api/v4/matters.json", user, json={"data": payload})
        return data.get("data")

    async def get_contacts(self, user: User):
        data = await self._request("GET", "/api/v4/contacts.json", user, params={"fields": "id,name,email,type"})
        return data.get("data", [])

    async def get_calendar_events(self, user: User):
        data = await self._request("GET", "/api/v4/calendar_entries.json", user, params={"fields": "id,summary,start_at,end_at"})
        return data.get("data", [])

    async def get_communications(self, user: User):
        data = await self._request("GET", "/api/v4/communications.json", user, params={"fields": "id,subject,body,type,created_at"})
        return data.get("data", [])
