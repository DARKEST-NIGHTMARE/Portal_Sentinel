import httpx
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from ..core.config import settings
from ..repositories.user_repo import UserRepository
from ..models import User

class ClioService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
        self.base_url = "https://app.clio.com" 

    async def get_valid_token(self, user: User) -> str:
        """
        Returns a valid access token. 
        In a production app, we would check the 'expires_at' field.
        Here we will attempt a simple 'who_am_i' test and refresh if it fails 401.
        """
        if not user.clio_access_token:
            raise HTTPException(status_code=400, detail="User has no Clio connection")

        # Basic test to see if current token works
        async with httpx.AsyncClient() as client:
            test_res = await client.get(
                f"{self.base_url}/api/v4/users/who_am_i",
                headers={"Authorization": f"Bearer {user.clio_access_token}"}
            )
            
            if test_res.status_code == 200:
                return user.clio_access_token
            
            if test_res.status_code == 401:
                # Attempt refresh
                return await self.refresh_clio_token(user)
            
            raise HTTPException(status_code=test_res.status_code, detail=f"Clio API Error: {test_res.text}")

    async def refresh_clio_token(self, user: User) -> str:
        if not user.clio_refresh_token:
            raise HTTPException(status_code=400, detail="No refresh token available for Clio")

        async with httpx.AsyncClient() as client:
            refresh_url = f"{self.base_url}/oauth/token"
            refresh_data = {
                "client_id": settings.clio_client_id,
                "client_secret": settings.clio_client_secret,
                "grant_type": "refresh_token",
                "refresh_token": user.clio_refresh_token,
                "redirect_uri": settings.clio_redirect_uri
            }

            res = await client.post(refresh_url, data=refresh_data)
            if res.status_code != 200:
                print(f"Clio Token Refresh Failed: {res.text}")
                raise HTTPException(status_code=401, detail="Clio session expired. Please re-login with Clio.")

            token_json = res.json()
            new_access_token = token_json.get("access_token")
            new_refresh_token = token_json.get("refresh_token")

            # Update database
            await self.user_repo.update(
                user, 
                clio_access_token=new_access_token,
                clio_refresh_token=new_refresh_token
            )
            
            return new_access_token

    async def _request(self, method: str, path: str, **kwargs):
        """Internal helper to handle authenticated requests with auto-refresh."""
        user = kwargs.pop("user")
        token = await self.get_valid_token(user)
        
        headers = kwargs.pop("headers", {})
        headers.update({
            "Authorization": f"Bearer {token}",
            "Accept": "application/json"
        })

        async with httpx.AsyncClient() as client:
            url = f"{self.base_url}{path}"
            res = await client.request(method, url, headers=headers, **kwargs)
            
            # If still 401, token might have expired between check and use
            if res.status_code == 401:
                token = await self.refresh_clio_token(user)
                headers["Authorization"] = f"Bearer {token}"
                res = await client.request(method, url, headers=headers, **kwargs)

            if res.status_code >= 400:
                print(f"Clio API Error ({res.status_code}) on {path}: {res.text}")
                raise HTTPException(status_code=res.status_code, detail=f"Clio API Error: {res.text}")
            
            return res.json()

    async def get_matters(self, user: User, params: dict = None):
        default_params = {"fields": "id,display_number,client,status,description"}
        if params:
            default_params.update(params)
        data = await self._request("GET", "/api/v4/matters.json", user=user, params=default_params)
        return data.get("data", [])

    async def create_matter(self, user: User, payload: dict):
        data = await self._request("POST", "/api/v4/matters.json", user=user, json={"data": payload})
        return data.get("data")

    async def get_contacts(self, user: User):
        data = await self._request("GET", "/api/v4/contacts.json", user=user, params={"fields": "id,name,email,type"})
        return data.get("data", [])

    async def get_calendar_events(self, user: User):
        data = await self._request("GET", "/api/v4/calendar_entries.json", user=user, params={"fields": "id,summary,start_at,end_at"})
        return data.get("data", [])

    async def get_communications(self, user: User):
        data = await self._request("GET", "/api/v4/communications.json", user=user, params={"fields": "id,subject,body,type,created_at"})
        return data.get("data", [])
