from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class FindingBase(BaseModel):
    rule_id: str = "CUSTOM-001"
    category: str = Field(..., description="security, bug, performance, style, maintainability, best_practice")
    severity: str = Field(..., description="critical, high, medium, low, informational")
    title: str = Field(..., min_length=2, max_length=255)
    description: str
    why_it_matters: Optional[str] = None
    file_path: str = "main"
    start_line: int = Field(default=1, ge=1)
    end_line: int = Field(default=1, ge=1)
    source: str = Field(default="static_analyzer", description="static_analyzer, ast_visitor, security_scanner, ai_llm")
    confidence: float = Field(default=0.9, ge=0.0, le=1.0)
    suggested_fix: Optional[str] = None
    suggested_code: Optional[str] = None
    original_code: Optional[str] = None
    status: str = Field(default="open", description="open, resolved, dismissed")

class FindingCreate(FindingBase):
    pass

class FindingUpdate(BaseModel):
    status: str = Field(..., pattern="^(open|resolved|dismissed)$")
    apply_to_code: Optional[bool] = Field(default=False, description="Whether to apply the suggested fix to the review code")

class FindingResponse(FindingBase):
    id: str
    review_id: str
    created_at: datetime
    updated_source_code: Optional[str] = Field(None, description="Updated source code if fix was applied")

    model_config = ConfigDict(from_attributes=True)

class FindingSummary(BaseModel):
    total: int = 0
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    informational: int = 0
    resolved: int = 0
    dismissed: int = 0
