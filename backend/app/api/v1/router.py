from fastapi import APIRouter
from app.api.v1.endpoints import auth, reviews, findings, analytics, system

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(reviews.router)
api_router.include_router(findings.router)
api_router.include_router(analytics.router)
api_router.include_router(system.router)
