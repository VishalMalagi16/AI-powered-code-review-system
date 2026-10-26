from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.analytics import AnalyticsOverview, AnalyticsTrends
from app.services.analytics_service import analytics_service

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/overview", response_model=AnalyticsOverview)
def get_analytics_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve aggregate analytics, quality scores, language and severity distributions."""
    return analytics_service.get_overview(db, current_user)

@router.get("/trends", response_model=AnalyticsTrends)
def get_analytics_trends(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve quality score and review trends over time."""
    return analytics_service.get_trends(db, current_user)
