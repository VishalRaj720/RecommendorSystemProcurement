from fastapi import APIRouter, HTTPException

from app.core.config import SUPPORTED_LANGUAGES, bhashini_configured
from app.schemas import TranslateRequest, TranslateResponse
from app.services.bhashini_service import translate_prose

router = APIRouter()


@router.post("/translate", response_model=TranslateResponse)
def post_translate(payload: TranslateRequest) -> TranslateResponse:
    target = payload.target_lang.lower()
    if payload.source_lang not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=422, detail="Unsupported source language")
    if target != "en":
        if not bhashini_configured():
            raise HTTPException(
                status_code=501,
                detail="Non-English output needs Bhashini (BHASHINI_USER_ID, BHASHINI_API_KEY, BHASHINI_PIPELINE_ID).",
            )
        try:
            text, mode, warnings = translate_prose(payload.text, payload.source_lang, target)
        except Exception as exc:
            raise HTTPException(status_code=502, detail="Bhashini request failed") from exc
        return TranslateResponse(text=text, translation_mode=mode, warnings=warnings)
    text, mode, warnings = translate_prose(payload.text, payload.source_lang, "en")
    return TranslateResponse(text=text, translation_mode=mode, warnings=warnings)
