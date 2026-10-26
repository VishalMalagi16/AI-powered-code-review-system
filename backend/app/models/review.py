import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.db.session import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class Review(Base):
    __tablename__ = "reviews"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    language = Column(String(50), nullable=False, index=True)
    source_code = Column(Text, nullable=False)
    status = Column(String(50), default="pending", nullable=False, index=True)  # pending, analyzing, completed, failed
    analysis_summary = Column(Text, nullable=True)
    quality_score = Column(Float, default=100.0, nullable=False)
    metrics = Column(JSON, default=lambda: {
        "loc": 0,
        "blank_lines": 0,
        "comment_lines": 0,
        "cyclomatic_complexity": 1,
        "maintainability_index": 100.0
    }, nullable=False)
    
    ai_used = Column(Boolean, default=False, nullable=False)
    ai_status = Column(String(50), default="unconfigured", nullable=False)  # success, fallback_static, unconfigured, failed
    ai_notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="reviews")
    findings = relationship("Finding", back_populates="review", cascade="all, delete-orphan")
