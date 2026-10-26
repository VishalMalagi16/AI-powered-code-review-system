from typing import List, Dict, Any
from pydantic import BaseModel

class SeverityCount(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    informational: int = 0

class CategoryCount(BaseModel):
    security: int = 0
    bug: int = 0
    performance: int = 0
    style: int = 0
    maintainability: int = 0
    best_practice: int = 0

class LanguageDistributionItem(BaseModel):
    language: str
    count: int
    percentage: float

class TrendItem(BaseModel):
    date: str
    reviews_count: int
    average_quality_score: float
    issues_found: int

class AnalyticsOverview(BaseModel):
    total_reviews: int = 0
    total_findings: int = 0
    critical_high_count: int = 0
    resolved_count: int = 0
    dismissed_count: int = 0
    average_quality_score: float = 100.0
    severities: SeverityCount
    categories: CategoryCount
    languages: List[LanguageDistributionItem] = []
    recent_activity: List[Dict[str, Any]] = []

class AnalyticsTrends(BaseModel):
    trends: List[TrendItem] = []
