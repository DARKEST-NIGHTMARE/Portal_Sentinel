from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    
    app_name: str = "Employee API"
    debug: bool = False
    api_port: int = 8081
    frontend_url: str
    
    database_url: str
    
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    google_client_id: str
    google_client_secret: str
    google_redirect_uri: str
    
    class Coonfig:
        env_file = ".env"
        
settings = Settings()
