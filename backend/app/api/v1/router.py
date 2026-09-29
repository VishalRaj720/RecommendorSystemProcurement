from fastapi import APIRouter, Depends

from app.api.v1.endpoints import documents, recommend, standards, translate, auth
from app.api.deps import get_current_user

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(recommend.router, tags=["recommend"], dependencies=[Depends(get_current_user)])
api_router.include_router(standards.router, tags=["standards"], dependencies=[Depends(get_current_user)])
api_router.include_router(translate.router, tags=["translate"], dependencies=[Depends(get_current_user)])
api_router.include_router(documents.router, tags=["documents"], dependencies=[Depends(get_current_user)])
