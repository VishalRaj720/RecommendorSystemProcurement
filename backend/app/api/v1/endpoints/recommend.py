from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.schemas import RecommendRequest, RecommendResponse
from app.services.recommend_service import recommend

router = APIRouter()


@router.post("/recommend", response_model=RecommendResponse)
def post_recommend(payload: RecommendRequest, session: Session = Depends(get_session)) -> RecommendResponse:
    return recommend(session, payload)
