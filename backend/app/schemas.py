from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator

Language = Literal["en", "hi", "ta", "te", "mr", "bn"]
Source = Literal["dashboard", "extension"]


class RecommendRequest(BaseModel):
    description: str = Field(min_length=1)
    language: Language = "en"
    source: Source = "dashboard"

    @field_validator("description")
    @classmethod
    def description_not_blank(cls, value: str) -> str:
        text = value.strip()
        if not text:
            raise ValueError("description must not be empty")
        return text


class QcoOut(BaseModel):
    qco_title: str
    issuing_ministry: str
    notification_date: date | None
    notification_ref: str
    is_mandatory: bool
    certification_scheme: str
    evidence_level: str
    source_url: str


class NormativeOut(BaseModel):
    is_code: str
    title: str
    relationship_type: str
    hop: int


class MatchOut(BaseModel):
    is_code: str
    title: str
    status: str
    latest_revision_year: int | None
    successor_is_code: str | None
    distance: float | None
    alerts: list[str]
    qco: QcoOut | None
    normative_references: list[NormativeOut]


class RecommendResponse(BaseModel):
    translation_mode: str
    extraction_mode: str
    english_text: str
    explicit_codes: list[str]
    warnings: list[str]
    matches: list[MatchOut]


class TranslateRequest(BaseModel):
    text: str = Field(min_length=1)
    source_lang: Language
    target_lang: str = Field(min_length=2, max_length=8)


class TranslateResponse(BaseModel):
    text: str
    translation_mode: str
    warnings: list[str] = []


class DocumentTextOut(BaseModel):
    text: str


class HealthOut(BaseModel):
    status: str
    embedding_model: str
    db: str


class StandardDetailOut(BaseModel):
    is_code: str
    title: str
    scope_summary: str
    latest_revision_year: int | None
    status: str
    successor_is_code: str | None
    category: str
    qcos: list[QcoOut]
    normative_references: list[NormativeOut]
