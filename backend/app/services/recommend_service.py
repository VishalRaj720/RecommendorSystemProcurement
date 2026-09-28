from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app.schemas import RecommendRequest, RecommendResponse
from app.services.ai_service import extract_attributes
from app.services.bhashini_service import translate_to_english
from app.services.embedding_service import embed_text
from app.services.rule_engine import extract_explicit_codes, lookup_standard, merge_matches, semantic_candidates

logger = logging.getLogger(__name__)


def recommend(session: Session, payload: RecommendRequest) -> RecommendResponse:
    original = payload.description.strip()
    explicit = extract_explicit_codes(original)
    english, translation_mode, warnings = translate_to_english(original, payload.language)
    if translation_mode != "english_input":
        explicit = extract_explicit_codes(original, english)
    extraction_mode, embed_source = extract_attributes(english)
    logger.info(
        "recommend source=%s translation_mode=%s extraction_mode=%s explicit_count=%s",
        payload.source,
        translation_mode,
        extraction_mode,
        len(explicit),
    )
    vector = embed_text(embed_source)
    explicit_rows = []
    missing = []
    for code in explicit:
        row = lookup_standard(session, code)
        if row:
            explicit_rows.append(row)
        else:
            missing.append(code)
    if missing:
        warnings.append(f"No catalogue row for: {', '.join(missing)}")
    semantic = semantic_candidates(session, vector)
    matches = merge_matches(session, explicit_rows, semantic)
    return RecommendResponse(
        translation_mode=translation_mode,
        extraction_mode=extraction_mode,
        english_text=english,
        explicit_codes=[row.is_code for row in explicit_rows],
        warnings=warnings,
        matches=matches,
    )
