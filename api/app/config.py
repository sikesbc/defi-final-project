"""Configuration settings for the application."""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from api directory (works whether running from root or api directory)
api_dir = Path(__file__).parent.parent
env_path = api_dir / ".env"
load_dotenv(dotenv_path=env_path)

# Also try loading from current directory (for backward compatibility)
load_dotenv()


class Settings:
    """Application settings."""
    
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    PORT: int = int(os.getenv("PORT", "8000"))
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # API Settings
    API_V1_PREFIX: str = "/api/v1"
    
    # CORS Origins
    CORS_ORIGINS: list = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]


settings = Settings()

