from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from ..core import dependencies
from ..repositories.user_repo import UserRepository
from ..repositories.session_repo import SessionRepository
from ..services.security_service import SecurityService
from ..models import User, EventType, ClioConnection
import httpx
from ..core.config import settings

class AuthService:
    def __init__(self, db: AsyncSession, http_client: httpx.AsyncClient):
        self.db = db
        self.http_client = http_client
        self.user_repo = UserRepository(db)
        self.session_repo = SessionRepository(db)

    async def authenticate_local(self, email: str, password: str, client_ip: str, location_str: str, location_source: str, lat: float, lon: float, device_info: str):
        if await SecurityService.is_ip_locked_out(self.db, client_ip):
            target_user = await self.user_repo.get_by_email(email)
            await SecurityService.log_event(
                self.db, 
                EventType.ACCOUNT_LOCKED, 
                client_ip, 
                user_id=target_user.id if target_user else None, 
                event_metadata={
                    "reason": "Too many failed attempts",
                    "targeted_email": email,
                    "location": location_str, 
                    "location_source": location_source,
                    "lat": lat,
                    "lon": lon
                }
            )
            raise HTTPException(status_code=429, detail="Too many failed login attempts. Please try again in 5 minutes.")

        db_user = await self.user_repo.get_by_email(email)

        if not db_user or not db_user.password_hash or not dependencies.verify_password(password, db_user.password_hash):
            await SecurityService.log_event(
                self.db, EventType.FAILED_LOGIN, client_ip, 
                user_id=db_user.id if db_user else None, 
                event_metadata={
                    "attempted_email": email,
                    "location": location_str, 
                    "location_source": location_source,
                    "lat": lat,
                    "lon": lon
                }
            )
            raise HTTPException(status_code=401, detail="Invalid credentials")

        return await self._finalize_login(db_user, client_ip, location_str, location_source, lat, lon, device_info)

    async def authenticate_google(self, code: str, client_ip: str, location_str: str, location_source: str, lat: float, lon: float, device_info: str):
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": settings.google_redirect_uri,
        }
        
        token_res = await self.http_client.post(token_url, data=token_data)
        if token_res.status_code != 200:
            print("Google Error:", token_res.text)
            raise HTTPException(status_code=400, detail="Invalid Google Code")
            
        access_token = token_res.json().get("access_token")
        user_info_res = await self.http_client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        user_info = user_info_res.json()

        email = user_info.get("email")
        name = user_info.get("name")
        avatar = user_info.get("picture")

        db_user = await self.user_repo.get_by_email(email)
        
        if not db_user:
            db_user = await self.user_repo.create(email=email, name=name, avatar_url=avatar, provider="google")
            print(f"Created New User: {email}")
        else:
            await self.user_repo.update(db_user, name=name, avatar_url=avatar)
            print(f"Welcome back: {email}")

        return await self._finalize_login(db_user, client_ip, location_str, location_source, lat, lon, device_info, provider="google")

    async def authenticate_clio(self, code: str, client_ip: str, location_str: str, location_source: str, lat: float, lon: float, device_info: str):
        base_url = settings.clio_base_url
        
        token_url = f"{base_url}/oauth/token"
        token_data = {
            "client_id": settings.clio_client_id,
            "client_secret": settings.clio_client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": settings.clio_redirect_uri,
        }
        print("Sending to Clio:", {k: v if k != "client_secret" else "REDACTED" for k, v in token_data.items()})
        print("Redirect URI in Config:", settings.clio_redirect_uri)
        
        token_res = await self.http_client.post(token_url, data=token_data)
        if token_res.status_code != 200:
            print(f"Clio Token Error ({token_res.status_code}):", token_res.text)
            raise HTTPException(status_code=400, detail=f"Clio OAuth Failed: {token_res.text}")
            
        token_json = token_res.json()
        access_token = token_json.get("access_token")
        
        # Fetch user info from Clio
        #endpoint is who_am_i
        user_info_res = await self.http_client.get(
            f"{base_url}/api/v4/users/who_am_i",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json"
            }
        )
        
        if user_info_res.status_code != 200:
            print(f"Clio User Info Error ({user_info_res.status_code}):", user_info_res.text)
            raise HTTPException(status_code=400, detail=f"Failed to fetch Clio user info: {user_info_res.text}")
            
        user_json = user_info_res.json()
        print("Clio Who Am I Data:", user_json)
        user_data = user_json.get("data", {})
        user_id = user_data.get("id")
        
        email = user_data.get("email")
        name = f"{user_data.get('first_name', '')} {user_data.get('last_name', '')}".strip() or user_data.get("name")

        # If email is missing, we must fetch the full user record
        if not email and user_id:
            print(f"Email missing from who_am_i, fetching full user record for ID: {user_id}")
            full_user_res = await self.http_client.get(
                f"{base_url}/api/v4/users/{user_id}.json",
                params={"fields": "id,email,name,first_name,last_name"},
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json"
                }
            )
            if full_user_res.status_code == 200:
                full_user_data = full_user_res.json().get("data", {})
                print("Clio Full User Data:", full_user_data)
                email = full_user_data.get("email")
                if not name:
                    name = f"{full_user_data.get('first_name', '')} {full_user_data.get('last_name', '')}".strip() or full_user_data.get("name")

        if not email:
            raise HTTPException(status_code=400, detail="Clio account does not have an email associated")

        db_user = await self.user_repo.get_by_email(email)
        
        if not db_user:
            db_user = await self.user_repo.create(
                email=email, 
                name=name, 
                provider="clio"
            )
            print(f"Created New Clio User: {email}")
        
        await self.db.refresh(db_user, ["clio_connection"])
        
        if not db_user.clio_connection:
            clio_conn = ClioConnection(
                user_id=db_user.id,
                access_token=access_token,
                refresh_token=token_json.get("refresh_token"),
                base_url=settings.clio_base_url
            )
            self.db.add(clio_conn)
        else:
            db_user.clio_connection.access_token = access_token
            db_user.clio_connection.refresh_token = token_json.get("refresh_token")
            db_user.clio_connection.base_url = settings.clio_base_url
        
        await self.db.commit()
        print(f"Updated Clio connection for: {email}")

        return await self._finalize_login(db_user, client_ip, location_str, location_source, lat, lon, device_info, provider="clio")

    async def _finalize_login(self, db_user, client_ip, location_str, location_source, lat, lon, device_info, provider="local"):
        await SecurityService.check_suspicious_activity(self.db, db_user.id, client_ip)
        await SecurityService.log_event(
            self.db, 
            EventType.ACTIVE_SESSION, 
            client_ip, 
            user_id=db_user.id,
            event_metadata={
                "provider": provider,
                "location": location_str, 
                "location_source": location_source,
                "lat": lat,
                "lon": lon
            } 
        )

        refresh_token = dependencies.create_refresh_token(db_user.email)
        
        new_session = await self.session_repo.create(
            user_id=db_user.id,
            refresh_token=refresh_token,
            device_info=device_info,
            ip_address=client_ip,
            location=location_str
        )

        access_token = dependencies.create_jwt_token(db_user.email, db_user.name, new_session.id)
        print(f"DEBUG: Login Token for {db_user.email}: {access_token}")
        
        return access_token, refresh_token, db_user

    async def refresh_token(self, refresh_token_str: str):
        if not refresh_token_str:
            raise HTTPException(status_code=401, detail="Refresh token missing")
        
        active_session = await self.session_repo.get_active_by_refresh_token(refresh_token_str)
        if not active_session:
            raise HTTPException(status_code=401, detail="Session expired or revoked")
        
        email = dependencies.verify_refresh_token(refresh_token_str)
        if not email:
            raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
        
        db_user = await self.user_repo.get_by_email(email)
        if not db_user:
            raise HTTPException(status_code=401, detail="User not found")
            
        await self.session_repo.update_last_active(active_session)
        
        new_access_token = dependencies.create_jwt_token(db_user.email, db_user.name, active_session.id)
        return new_access_token

    async def logout(self, refresh_token_str: str):
        if refresh_token_str:
            active_session = await self.session_repo.get_active_by_refresh_token(refresh_token_str)
            if active_session:
                await self.session_repo.revoke(active_session)

    async def register(self, email: str, name: str, password: str, avatar_url: str = None):
        existing_user = await self.user_repo.get_by_email(email)
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        hashed_password = dependencies.hash_password(password)
        new_user = await self.user_repo.create(
            email=email, 
            name=name, 
            avatar_url=avatar_url, 
            provider="local",
            password_hash=hashed_password
        )
        return new_user
