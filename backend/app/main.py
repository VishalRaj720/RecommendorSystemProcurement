from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import EMBEDDING_MODEL_SHORT
from app.core.database import ping_db
from app.schemas import HealthOut

app = FastAPI(
    title="IS Recommendation Engine",
    version="0.2.0",
    description="Hybrid Indian Standard recommender for SIH 26108 (curated demo catalogue).",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1):\d+|chrome-extension://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health", response_model=HealthOut)
def health() -> HealthOut:
    db_ok = ping_db()
    return HealthOut(
        status="ok" if db_ok else "degraded",
        embedding_model=EMBEDDING_MODEL_SHORT,
        db="ok" if db_ok else "error",
    )
