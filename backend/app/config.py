"""
Configuration settings for SignalHub application.
"""
from pydantic_settings import BaseSettings
from typing import List, Optional, Union
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database Configuration
    database_url: str = "postgresql://signalhub:signalhub123@localhost:5432/signalhub"
    # For SQLite: "sqlite:///./signalhub.db"
    
    # Application Configuration
    app_name: str = "SignalHub"
    debug: bool = True
    secret_key: str = "your-secret-key-here-change-in-production"
    
    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8001  # Changed from 8000 to avoid conflicts
    
    # Logging
    log_level: str = "DEBUG"
    log_file: str = "logs/signalhub.log"
    
    # API Configuration
    api_v1_str: str = "/api/v1"
    project_name: str = "Contact Center SignalHub"
    
    # CORS Configuration (for future frontend)
    backend_cors_origins: List[str] = ["http://localhost:3000", "http://localhost:8080"]
    
    # File Upload Configuration
    max_file_size: Union[int, str] = 100 * 1024 * 1024  # 100MB in bytes
    upload_dir: str = "audio_uploads"
    
    @property
    def max_file_size_bytes(self) -> int:
        """Convert max_file_size to bytes if it's a string."""
        if isinstance(self.max_file_size, str):
            # Handle string format like "100MB"
            size_str = self.max_file_size.upper()
            if size_str.endswith('MB'):
                return int(size_str[:-2]) * 1024 * 1024
            elif size_str.endswith('KB'):
                return int(size_str[:-2]) * 1024
            elif size_str.endswith('GB'):
                return int(size_str[:-2]) * 1024 * 1024 * 1024
            else:
                return int(size_str)
        return self.max_file_size
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Create settings instance
settings = Settings()


def get_database_url() -> str:
    """Get database URL from environment or use default."""
    return os.getenv("DATABASE_URL", settings.database_url)


def get_secret_key() -> str:
    """Get secret key from environment or use default."""
    return os.getenv("SECRET_KEY", settings.secret_key)
