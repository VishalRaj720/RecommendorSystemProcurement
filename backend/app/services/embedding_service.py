from functools import lru_cache

from app.core.config import EMBEDDING_DIM, EMBEDDING_MODEL


@lru_cache(maxsize=1)
def _model():
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(EMBEDDING_MODEL)


def embed_text(text: str) -> list[float]:
    vector = _model().encode(text, normalize_embeddings=True)
    values = vector.tolist()
    if len(values) != EMBEDDING_DIM:
        raise RuntimeError(f"Embedding dim {len(values)} != {EMBEDDING_DIM}")
    return values


def model_ready() -> bool:
    try:
        _model()
        return True
    except Exception:
        return False
