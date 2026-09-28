import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_DIR.parent / ".env")
load_dotenv(BACKEND_DIR / ".env")

DEFAULT_DATABASE_URL = "postgresql+psycopg://bis:bis@localhost:5433/bis_recommend"
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_MODEL_SHORT = "all-MiniLM-L6-v2"
EMBEDDING_DIM = 384
SEED_PATH = BACKEND_DIR / "app" / "data" / "standards_seed.json"
DEMO_PHRASES_PATH = BACKEND_DIR / "app" / "data" / "demo_phrases.json"
SUPPORTED_LANGUAGES = ("en", "hi", "ta", "te", "mr", "bn")
MAX_PDF_BYTES = 10 * 1024 * 1024
NORMATIVE_MAX_HOPS = 2
MATCH_LIMIT = 5
DISTANCE_ACTIVE_TIE = 0.05


def get_database_url() -> str:
    return os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)


def llm_api_key() -> str:
    return os.getenv("LLM_API_KEY", "").strip()


def llm_base_url() -> str:
    return os.getenv("LLM_BASE_URL", "https://api.openai.com/v1").rstrip("/")


def llm_model() -> str:
    return os.getenv("LLM_MODEL", "gpt-4o-mini").strip() or "gpt-4o-mini"


def bhashini_user_id() -> str:
    return os.getenv("BHASHINI_USER_ID", "").strip()


def bhashini_api_key() -> str:
    return os.getenv("BHASHINI_API_KEY", "").strip()


def bhashini_pipeline_id() -> str:
    return os.getenv("BHASHINI_PIPELINE_ID", "").strip()


def bhashini_configured() -> bool:
    return bool(bhashini_user_id() and bhashini_api_key() and bhashini_pipeline_id())
