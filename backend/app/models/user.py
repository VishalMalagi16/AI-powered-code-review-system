import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, JSON
from sqlalchemy.orm import relationship
from app.db.session import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="developer", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    preferences = Column(JSON, default=lambda: {
        "theme": "dark",
        "default_language": "python",
        "enable_security_checks": True,
        "enable_performance_checks": True,
        "enable_style_checks": True,
        "enable_ai_explanation": True
    }, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    reviews = relationship("Review", back_populates="user", cascade="all, delete-orphan")
