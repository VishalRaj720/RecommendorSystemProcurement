from urllib.parse import unquote

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_session
from app.models import Standard
from app.schemas import StandardDetailOut
from app.services.rule_engine import qco_out, walk_normative

router = APIRouter()


@router.get("/standards/{is_code}", response_model=StandardDetailOut)
def get_standard(is_code: str, session: Session = Depends(get_session)) -> StandardDetailOut:
    code = unquote(is_code).strip()
    row = session.scalar(
        select(Standard).options(selectinload(Standard.qcos)).where(Standard.is_code == code)
    )
    if row is None:
        raise HTTPException(status_code=404, detail=f"Standard not found: {code}")
    return StandardDetailOut(
        is_code=row.is_code,
        title=row.title,
        scope_summary=row.scope_summary,
        latest_revision_year=row.latest_revision_year,
        status=row.status,
        successor_is_code=row.successor_is_code,
        category=row.category,
        qcos=[qco_out(item) for item in row.qcos],
        normative_references=walk_normative(session, row.id, max_hops=1),
    )
