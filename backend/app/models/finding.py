import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class Finding(Base):
    __tablename__ = "findings"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    review_id = Column(String(36), ForeignKey("reviews.id", ondelete="CASCADE"), nullable=False, index=True)
    
    rule_id = Column(String(50), nullable=False, default="CUSTOM-001")
    category = Column(String(50), nullable=False, index=True)  # security, bug, performance, style, maintainability, best_practice
    severity = Column(String(50), nullable=False, index=True)  # critical, high, medium, low, informational
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    why_it_matters = Column(Text, nullable=True)
    
    file_path = Column(String(255), default="main", nullable=False)
    start_line = Column(Integer, nullable=False, default=1)
    end_line = Column(Integer, nullable=False, default=1)
    
    source = Column(String(50), nullable=False, default="static_analyzer")  # static_analyzer, ast_visitor, security_scanner, ai_llm
    confidence = Column(Float, default=0.9, nullable=False)
    suggested_fix = Column(Text, nullable=True)
    suggested_code = Column(Text, nullable=True)
    original_code = Column(Text, nullable=True)
    
    status = Column(String(50), default="open", nullable=False, index=True)  # open, resolved, dismissed
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    review = relationship("Review", back_populates="findings")
