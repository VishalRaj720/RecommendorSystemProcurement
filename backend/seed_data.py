"""Load the curated BIS catalogue into Postgres and embed it with MiniLM.

Running this file twice upserts standards and replaces QCO and normative rows
from backend/app/data/standards_seed.json. It does not call government websites.
"""

from __future__ import annotations

import json
import sys
from datetime import date
from pathlib import Path

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import EMBEDDING_DIM, EMBEDDING_MODEL, SEED_PATH  # noqa: E402
from app.core.database import get_engine, init_db  # noqa: E402
from app.models import NormativeReference, QualityControlOrder, Standard  # noqa: E402

ALLOWED_STATUS = {"ACTIVE", "WITHDRAWN", "REVISED"}
ALLOWED_RELATIONSHIP = {"TEST_METHOD", "TERMINOLOGY", "SAFETY", "INSTALLATION"}
ALLOWED_SCHEME = {"ISI", "CRS", "HALLMARK", "NONE"}
ALLOWED_EVIDENCE = {"cited", "unverified"}
FIRE_DOOR_QUERY = "fireproof barrier for hospital doors"


def load_catalogue(path: Path) -> dict:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def validate_catalogue(catalogue: dict) -> None:
    standards = catalogue["standards"]
    codes = [row["is_code"] for row in standards]
    if len(codes) != len(set(codes)):
        raise SystemExit("Duplicate is_code in seed file")
    if len(codes) > 100:
        raise SystemExit("Seed cap is 100 standards")
    code_set = set(codes)

    for row in standards:
        if row["status"] not in ALLOWED_STATUS:
            raise SystemExit(f"Bad status for {row['is_code']}")
        if row["status"] in {"WITHDRAWN", "REVISED"} and not row.get("successor_is_code"):
            raise SystemExit(f"{row['is_code']} needs a successor_is_code")
        if row.get("successor_is_code") and row["successor_is_code"] not in code_set:
            raise SystemExit(f"Unknown successor for {row['is_code']}")

    for link in catalogue["normative_references"]:
        if link["parent_is_code"] not in code_set or link["child_is_code"] not in code_set:
            raise SystemExit(f"Normative link references a missing code: {link}")
        if link["parent_is_code"] == link["child_is_code"]:
            raise SystemExit("Normative self-link is not allowed")
        if link["relationship_type"] not in ALLOWED_RELATIONSHIP:
            raise SystemExit(f"Bad relationship type: {link}")
        pair = {link["parent_is_code"], link["child_is_code"]}
        if pair == {"IS 1382", "IS 3614"}:
            raise SystemExit("IS 1382 must not be linked to the fire-door standard")

    qco_codes = []
    for qco in catalogue["quality_control_orders"]:
        if qco["is_code"] not in code_set:
            raise SystemExit(f"QCO references missing code {qco['is_code']}")
        if qco["is_code"] == "IS 456":
            raise SystemExit("IS 456 must not have a QCO row")
        if qco["evidence_level"] not in ALLOWED_EVIDENCE:
            raise SystemExit(f"Bad evidence level for {qco['is_code']}")
        if qco["certification_scheme"] not in ALLOWED_SCHEME:
            raise SystemExit(f"Bad certification scheme for {qco['is_code']}")
        if qco["evidence_level"] == "cited" and not (qco["notification_ref"] and qco["source_url"]):
            raise SystemExit(f"Cited QCO for {qco['is_code']} needs notification_ref and source_url")
        if qco["evidence_level"] == "unverified" and qco["is_mandatory"]:
            raise SystemExit(f"Unverified QCO for {qco['is_code']} cannot be mandatory")
        qco_codes.append(qco["is_code"])


def embed_texts(texts: list[str]) -> list[list[float]]:
    from sentence_transformers import SentenceTransformer

    model = SentenceTransformer(EMBEDDING_MODEL)
    vectors = model.encode(texts, normalize_embeddings=True)
    result = [vector.tolist() for vector in vectors]
    if any(len(vector) != EMBEDDING_DIM for vector in result):
        raise SystemExit(f"Expected {EMBEDDING_DIM}-d embeddings")
    return result


def document_text(row: dict) -> str:
    return f"{row['is_code']}. {row['title']}. {row['category']}. {row['scope_summary']}"


def upsert_standards(session: Session, standards: list[dict], vectors: list[list[float]]) -> dict[str, object]:
    for row, vector in zip(standards, vectors, strict=True):
        values = {
            "is_code": row["is_code"],
            "title": row["title"],
            "scope_summary": row["scope_summary"],
            "embedding": vector,
            "latest_revision_year": row["latest_revision_year"],
            "status": row["status"],
            "successor_is_code": row["successor_is_code"],
            "category": row["category"],
        }
        statement = insert(Standard).values(**values)
        statement = statement.on_conflict_do_update(
            index_elements=[Standard.is_code],
            set_={key: statement.excluded[key] for key in values if key != "is_code"},
        )
        session.execute(statement)
    session.flush()
    rows = session.scalars(select(Standard)).all()
    return {row.is_code: row.id for row in rows}


def replace_links(session: Session, catalogue: dict, ids: dict[str, object]) -> None:
    codes = [row["is_code"] for row in catalogue["standards"]]
    session.execute(delete(Standard).where(Standard.is_code.not_in(codes)))
    session.execute(delete(NormativeReference))
    session.execute(delete(QualityControlOrder))
    session.flush()
    ids = {row.is_code: row.id for row in session.scalars(select(Standard)).all()}

    session.add_all(
        [
            NormativeReference(
                parent_id=ids[link["parent_is_code"]],
                child_id=ids[link["child_is_code"]],
                relationship_type=link["relationship_type"],
            )
            for link in catalogue["normative_references"]
        ]
    )
    session.add_all(
        [
            QualityControlOrder(
                standard_id=ids[qco["is_code"]],
                qco_title=qco["qco_title"],
                issuing_ministry=qco["issuing_ministry"],
                notification_date=date.fromisoformat(qco["notification_date"]) if qco["notification_date"] else None,
                notification_ref=qco["notification_ref"] or "",
                is_mandatory=qco["is_mandatory"],
                certification_scheme=qco["certification_scheme"],
                evidence_level=qco["evidence_level"],
                source_url=qco["source_url"] or "",
            )
            for qco in catalogue["quality_control_orders"]
        ]
    )


def acceptance_checks(session: Session, expected_count: int) -> None:
    from sentence_transformers import SentenceTransformer

    count = session.scalar(select(func.count()).select_from(Standard))
    if count != expected_count:
        raise SystemExit(f"Expected {expected_count} standards, found {count}")

    bad_dim = session.scalar(
        select(func.count()).select_from(Standard).where(func.vector_dims(Standard.embedding) != EMBEDDING_DIM)
    )
    if bad_dim:
        raise SystemExit(f"{bad_dim} embeddings are not {EMBEDDING_DIM}-d")

    codes = dict(session.execute(select(Standard.id, Standard.is_code)).all())
    links = session.execute(select(NormativeReference.parent_id, NormativeReference.child_id)).all()
    for parent_id, child_id in links:
        pair = {codes[parent_id], codes[child_id]}
        if "IS 1382" in pair and "IS 3614" in pair:
            raise SystemExit("Fire-door standard is linked to IS 1382")

    concrete = session.scalar(select(Standard).where(Standard.is_code == "IS 456"))
    if concrete is None or len(concrete.qcos) != 0:
        raise SystemExit("IS 456 must have zero QCO rows")

    cited_gaps = session.scalar(
        select(func.count())
        .select_from(QualityControlOrder)
        .where(
            (QualityControlOrder.evidence_level == "cited")
            & ((QualityControlOrder.notification_ref == "") | (QualityControlOrder.source_url == ""))
        )
    )
    if cited_gaps:
        raise SystemExit("A cited QCO is missing notification_ref or source_url")

    model = SentenceTransformer(EMBEDDING_MODEL)
    query = model.encode(FIRE_DOOR_QUERY, normalize_embeddings=True).tolist()
    nearest_rows = session.scalars(
        select(Standard).order_by(Standard.embedding.cosine_distance(query)).limit(3)
    ).all()
    nearest = nearest_rows[0] if nearest_rows else None
    if nearest is None or nearest.is_code != "IS 3614":
        found = ", ".join(row.is_code for row in nearest_rows) or "none"
        raise SystemExit(f"Fire-door query nearest rows were {found}, expected IS 3614 first")

    print(f"standards={count}")
    print(f"embedding_dim={EMBEDDING_DIM}")
    print(f"fire_door_top={nearest.is_code}")
    print("is_456_qco=0")
    print("glass_fire_link=0")
    print("cited_qco_gaps=0")


def main() -> None:
    catalogue = load_catalogue(SEED_PATH)
    validate_catalogue(catalogue)
    engine = get_engine()
    init_db(engine)
    vectors = embed_texts([document_text(row) for row in catalogue["standards"]])
    with Session(engine) as session:
        ids = upsert_standards(session, catalogue["standards"], vectors)
        replace_links(session, catalogue, ids)
        session.commit()
        acceptance_checks(session, len(catalogue["standards"]))
    print("seed_ok")


if __name__ == "__main__":
    main()
