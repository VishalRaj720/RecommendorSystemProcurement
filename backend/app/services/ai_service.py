from __future__ import annotations

import json
import logging
import re

import httpx

from app.core.config import llm_api_key, llm_base_url, llm_model

logger = logging.getLogger(__name__)

RULE_TAGS: list[tuple[str, tuple[str, ...]]] = [
    (
        "fire door hospital shutter fireproof fire-rated doorset",
        ("fire door", "fireproof", "fire-rated", "hospital door", "shutter", "doorset", "अग्निरोधक"),
    ),
    (
        "laptop server computer information technology equipment ICT safety CRS",
        ("laptop", "notebook", "server", "desktop", "computer", "IT equipment", "ICT"),
    ),
    (
        "plain and reinforced concrete cement road pavement mix",
        ("cement", "concrete", "reinforced", "road", "pavement", "सीमेंट", "कंक्रीट"),
    ),
    (
        "electrical accessories boxes enclosures switch socket wiring",
        ("electrical accessor", "enclosure", "switch socket", "lamp holder", "RCCB"),
    ),
]


def extract_attributes(english_text: str) -> tuple[str, str]:
    """Return (extraction_mode, text used for embedding)."""
    if llm_api_key():
        try:
            enriched = _llm_extract(english_text)
            if enriched:
                return "llm", f"{english_text}\n{enriched}"
        except Exception:
            logger.exception("LLM extraction failed; using rules tagger")
    tags = rules_tagger(english_text)
    if tags:
        return "rules", f"{english_text}\n{tags}"
    return "rules", english_text


def rules_tagger(text: str) -> str:
    lowered = text.lower()
    hits: list[str] = []
    for label, needles in RULE_TAGS:
        if any(needle.lower() in lowered for needle in needles):
            hits.append(label)
    return " ".join(hits)


def _llm_extract(text: str) -> str:
    prompt = (
        "Extract procurement attributes as compact JSON with keys "
        "product_type, material, usage_environment, safety_parameters. "
        "Use short English phrases. No IS codes invented.\n\n"
        f"Specification:\n{text[:4000]}"
    )
    payload = {
        "model": llm_model(),
        "messages": [
            {"role": "system", "content": "You extract technical attributes for Indian public procurement."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0,
    }
    headers = {
        "Authorization": f"Bearer {llm_api_key()}",
        "Content-Type": "application/json",
    }
    url = f"{llm_base_url()}/chat/completions"
    with httpx.Client(timeout=30.0) as client:
        response = client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        body = response.json()
    content = body["choices"][0]["message"]["content"]
    try:
        parsed = json.loads(content)
        return " ".join(str(value) for value in parsed.values() if value)
    except json.JSONDecodeError:
        cleaned = re.sub(r"[`*]", "", content).strip()
        return cleaned[:800]
