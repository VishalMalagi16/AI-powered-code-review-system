from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.finding import FindingResponse, FindingSummary

class ReviewCreate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    language: str = Field(..., min_length=1, max_length=50)
    source_code: str = Field(..., min_length=1, description="Raw source code to analyze")
    enable_ai: bool = Field(default=True, description="Whether to request AI remediation analysis")
    enable_security: bool = True
    enable_performance: bool = True
    enable_style: bool = True
    enable_bugs: bool = True

class ReviewUpdateCode(BaseModel):
    source_code: str = Field(..., min_length=1)

class ReviewMetrics(BaseModel):
    loc: int = 0
    blank_lines: int = 0
    comment_lines: int = 0
    cyclomatic_complexity: int = 1
    maintainability_index: float = 100.0

class ReviewResponse(BaseModel):
    id: str
    user_id: str
    title: str
    language: str
    source_code: str
    status: str
    analysis_summary: Optional[str] = None
    quality_score: float
    metrics: Dict[str, Any]
    ai_used: bool
    ai_status: str
    ai_notes: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    findings: List[FindingResponse] = []
    finding_summary: Optional[FindingSummary] = None

    model_config = ConfigDict(from_attributes=True)

class ReviewListItem(BaseModel):
    id: str
    title: str
    language: str
    status: str
    quality_score: float
    total_findings: int = 0
    critical_findings: int = 0
    high_findings: int = 0
    ai_used: bool
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class ReviewListResponse(BaseModel):
    items: List[ReviewListItem]
    total: int
    page: int
    limit: int
    total_pages: int

class ApplyFixResponse(BaseModel):
    finding: FindingResponse
    review_quality_score: float
    updated_source_code: str
