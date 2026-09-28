from fastapi import APIRouter

from app.api.v1.endpoints import documents, recommend, standards, translate

api_router = APIRouter()
api_router.include_router(recommend.router, tags=["recommend"])
api_router.include_router(standards.router, tags=["standards"])
api_router.include_router(translate.router, tags=["translate"])
api_router.include_router(documents.router, tags=["documents"])
