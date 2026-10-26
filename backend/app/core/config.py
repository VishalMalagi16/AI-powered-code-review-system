import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = "CodeGuard AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Security
    SECRET_KEY: str = Field(
        default="codeguard-super-secret-production-grade-key-change-in-prod-8f92a3",
        description="Secret key for JWT generation and verification"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ]
    
    # Database (Default to SQLite for zero-friction local run; seamless Postgres support)
    DATABASE_URL: str = "sqlite:///./codeguard.db"
    
    # AI Configuration (Server-side keys only)
    AI_PROVIDER: str = "auto"  # "gemini", "openai", "auto", "mock_demo", "none"
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-1.5-pro"
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o"
    MOCK_AI_FALLBACK: bool = True  # If true and no external API key is present, use intelligent local heuristic synthesis
    
    # Limits and constraints
    MAX_CODE_SIZE_BYTES: int = 500_000  # 500 KB limit for source code uploads
    ANALYSIS_TIMEOUT_SECONDS: int = 30
    RATE_LIMIT_PER_MINUTE: int = 60

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
        "extra": "ignore"
    }

settings = Settings()
