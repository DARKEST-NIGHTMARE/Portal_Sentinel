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
        data = await self._request("GET", "/api/v4/contacts.json", user, params={"fields": "id,name,type,title"})
        return data.get("data", [])

    async def get_calendar_events(self, user: User):
        data = await self._request("GET", "/api/v4/calendar_entries.json", user, params={"fields": "id,summary,start_at,end_at"})
        return data.get("data", [])

    async def get_communications(self, user: User):
        data = await self._request("GET", "/api/v4/conversations.json", user, params={"fields": "id,subject,message_count,read,created_at,updated_at"})
        return data.get("data", [])


    async def get_events_for_date(self, user: User, date_str: str, timezone_offset: str = "+00:00"):
        """Fetch all calendar events for a specific date considering the user's local timezone."""
        from datetime import datetime, timezone
        start_local = datetime.fromisoformat(f"{date_str}T00:00:00{timezone_offset}")
        end_local = datetime.fromisoformat(f"{date_str}T23:59:59{timezone_offset}")
        
        start_utc = start_local.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        end_utc = end_local.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        
        data = await self._request(
            "GET", "/api/v4/calendar_entries.json", user,
            params={
                "fields": "id,summary,start_at,end_at,all_day",
                "from": start_utc,
                "to": end_utc,
            }
        )
        return data.get("data", [])

    async def create_calendar_event(self, user: User, summary: str, start_at: str, end_at: str):
        """Create a new calendar entry in Clio."""
        cals_res = await self._request("GET", "/api/v4/calendars.json", user, params={"fields": "id"})
        cal_data = cals_res.get("data", [])
        if not cal_data:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="No calendars found for user")
        
        calendar_id = cal_data[0].get("id")

        payload = {
            "data": {
                "summary": summary,
                "start_at": start_at, 
                "end_at": end_at,    
                "calendar_owner": {"id": calendar_id},
            }
        }
        
        print(f"DEBUG: Calendar create payload: {payload}")
        
        data = await self._request("POST", "/api/v4/calendar_entries.json", user, json=payload)
        return data.get("data")

    async def book_slot(self, user: User, date_str: str, start_time: str, end_time: str, summary: str, timezone_offset: str = "+00:00"):
        """
         check availability, book if free, or suggest alternatives.
        - date_str: "YYYY-MM-DD"
        - start_time / end_time: "HH:MM" (24h)
        - summary: event title
        """
        from datetime import datetime, timedelta

        req_start = datetime.fromisoformat(f"{date_str}T{start_time}:00{timezone_offset}")
        req_end = datetime.fromisoformat(f"{date_str}T{end_time}:00{timezone_offset}")

        if req_end <= req_start:
            raise HTTPException(status_code=400, detail="End time must be after start time")

        events = await self.get_events_for_date(user, date_str, timezone_offset)

        busy = []
        for ev in events:
            if ev.get("all_day"):
                continue
            ev_start_str = ev["start_at"].replace("Z", "+00:00")
            ev_end_str = ev["end_at"].replace("Z", "+00:00")
            
            # Parse existing events and convert them to the requested timezone for accurate comparison
            ev_start = datetime.fromisoformat(ev_start_str).astimezone(req_start.tzinfo)
            ev_end = datetime.fromisoformat(ev_end_str).astimezone(req_start.tzinfo)
            busy.append((ev_start, ev_end))

        busy.sort(key=lambda x: x[0])

        conflicts = []
        for b_start, b_end in busy:
            if req_start < b_end and req_end > b_start:
                conflicts.append({
                    "start": b_start.strftime("%H:%M"),
                    "end": b_end.strftime("%H:%M"),
                })

        if not conflicts:
            from datetime import timezone
            start_iso = req_start.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            end_iso = req_end.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            event = await self.create_calendar_event(user, summary, start_iso, end_iso)
            return {"booked": True, "event": event}

        # Conflict found — compute free slots (9AM-6PM, 30min minimum) in local requested time
        work_start = datetime.fromisoformat(f"{date_str}T09:00:00{timezone_offset}")
        work_end = datetime.fromisoformat(f"{date_str}T18:00:00{timezone_offset}")
        min_slot = timedelta(minutes=30)

        merged = []
        for start, end in busy:
            start = max(start, work_start)
            end = min(end, work_end)
            if start >= end:
                continue
            if merged and start <= merged[-1][1]:
                merged[-1] = (merged[-1][0], max(merged[-1][1], end))
            else:
                merged.append((start, end))

        # Find gaps
        free_slots = []
        cursor = work_start
        for b_start, b_end in merged:
            if b_start - cursor >= min_slot:
                free_slots.append({
                    "start": cursor.strftime("%H:%M"),
                    "end": b_start.strftime("%H:%M"),
                })
            cursor = max(cursor, b_end)
        if work_end - cursor >= min_slot:
            free_slots.append({
                "start": cursor.strftime("%H:%M"),
                "end": work_end.strftime("%H:%M"),
            })

        return {
            "booked": False,
            "message": "Requested slot conflicts with existing events",
            "conflicts": conflicts,
            "available_slots": free_slots,
        }
