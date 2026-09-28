from __future__ import annotations

import json
import logging
import re
import unicodedata
from pathlib import Path

import httpx

from app.core.config import (
    DEMO_PHRASES_PATH,
    bhashini_api_key,
    bhashini_configured,
    bhashini_pipeline_id,
    bhashini_user_id,
)

logger = logging.getLogger(__name__)

UNTRANSLATED_WARNING = (
    "Text was not translated. Configure Bhashini or use a mapped demo phrase."
)


def _load_demo_map(path: Path = DEMO_PHRASES_PATH) -> dict[str, str]:
    if not path.exists():
        return {}
    with path.open(encoding="utf-8") as handle:
        raw = json.load(handle)
    return {_norm_phrase(key): value for key, value in raw.items()}


def _norm_phrase(text: str) -> str:
    collapsed = re.sub(r"\s+", " ", text.strip())
    return unicodedata.normalize("NFC", collapsed)


def _lookup_demo(text: str) -> str | None:
    key = _norm_phrase(text)
    table = _load_demo_map()
    if key in table:
        return table[key]
    for demo_key, english in table.items():
        if demo_key and demo_key in key:
            return english
    return None


def translate_to_english(text: str, source_lang: str) -> tuple[str, str, list[str]]:
    """Return (english_or_original, translation_mode, warnings)."""
    if source_lang == "en":
        return text, "english_input", []

    mapped = _lookup_demo(text)
    if mapped:
        return mapped, "demo_map", []

    if bhashini_configured():
        try:
            translated = _call_bhashini(text, source_lang, "en")
            if translated:
                return translated, "bhashini", []
        except Exception:
            logger.exception("Bhashini translation failed")
        return text, "untranslated", [UNTRANSLATED_WARNING]

    return text, "untranslated", [UNTRANSLATED_WARNING]


def translate_prose(text: str, source_lang: str, target_lang: str) -> tuple[str, str, list[str]]:
    if target_lang == "en":
        return translate_to_english(text, source_lang)
    if source_lang == target_lang:
        return text, "english_input" if target_lang == "en" else "passthrough", []
    if not bhashini_configured():
        return text, "unavailable", []
    translated = _call_bhashini(text, source_lang, target_lang)
    if not translated:
        raise RuntimeError("Bhashini returned empty text")
    return translated, "bhashini", []


def _call_bhashini(text: str, source_lang: str, target_lang: str) -> str:
    pipeline_id = bhashini_pipeline_id()
    url = f"https://dhruva-api.bhashini.gov.in/services/inference/pipeline"
    headers = {
        "Content-Type": "application/json",
        "userID": bhashini_user_id(),
        "ulcaApiKey": bhashini_api_key(),
    }
    payload = {
        "pipelineTasks": [
            {
                "taskType": "translation",
                "config": {
                    "language": {
                        "sourceLanguage": source_lang,
                        "targetLanguage": target_lang,
                    },
                    "serviceId": pipeline_id,
                },
            }
        ],
        "inputData": {"input": [{"source": text}]},
    }
    with httpx.Client(timeout=20.0) as client:
        response = client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        body = response.json()
    outputs = body.get("pipelineResponse") or body.get("output") or []
    if not outputs:
        return ""
    first = outputs[0]
    inner = first.get("output") or first.get("nmtTargetText") or []
    if isinstance(inner, list) and inner:
        return str(inner[0].get("target") or inner[0].get("source") or "").strip()
    if isinstance(inner, str):
        return inner.strip()
    return ""
