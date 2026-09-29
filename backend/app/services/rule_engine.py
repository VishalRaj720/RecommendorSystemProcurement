from __future__ import annotations

import re
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import DISTANCE_ACTIVE_TIE, MATCH_LIMIT, NORMATIVE_MAX_HOPS
from app.models import NormativeReference, QualityControlOrder, Standard
from app.schemas import MatchOut, NormativeOut, QcoOut

IS_CODE_RE = re.compile(
    r"IS(?:\s*/\s*IEC)?\s*\d+(?:\s*-\s*\d+)?(?:\s*\([^)]+\))?(?:\s*:\s*\d{4})?",
    re.IGNORECASE,
)

GAZETTE_NOTICE = "Dataset status is not a gazette. Confirm before publishing the tender."


def extract_explicit_codes(*texts: str) -> list[str]:
    found: list[str] = []
    seen: set[str] = set()
    for text in texts:
        for match in IS_CODE_RE.finditer(text or ""):
            code = normalize_is_code(match.group(0))
            key = code.casefold()
            if key not in seen:
                seen.add(key)
                found.append(code)
    return found


def normalize_is_code(raw: str) -> str:
    text = re.sub(r"\s+", " ", raw.strip())
    text = re.sub(r"(?i)^is\s*/\s*iec", "IS/IEC", text)
    text = re.sub(r"(?i)^is\b", "IS", text)
    text = re.sub(r"\s+:", ":", text)
    return text


def lookup_standard(session: Session, code: str) -> Standard | None:
    loader = selectinload(Standard.qcos)
    exact = session.scalar(select(Standard).options(loader).where(Standard.is_code == code))
    if exact:
        return exact
    no_year = re.sub(r":\d{4}$", "", code).strip()
    if no_year != code:
        row = session.scalar(select(Standard).options(loader).where(Standard.is_code == no_year))
        if row:
            return row
    prefix = no_year
    candidates = session.scalars(
        select(Standard).options(loader).where(Standard.is_code.startswith(prefix))
    ).all()
    if len(candidates) == 1:
        return candidates[0]
    part_match = [row for row in candidates if "(Part" in row.is_code]
    if len(part_match) == 1:
        return part_match[0]
    return None


def alerts_for(standard: Standard, qco: QualityControlOrder | None) -> list[str]:
    alerts: list[str] = []
    if qco and qco.evidence_level == "cited" and qco.is_mandatory:
        alerts.append("MANDATORY_COMPLIANCE")
    if qco and qco.evidence_level == "unverified":
        alerts.append("UNVERIFIED_QCO")
    if standard.status in {"WITHDRAWN", "REVISED"}:
        alerts.append("LATEST_VERSION_ALERT")
    return alerts


def pick_qco(orders: list[QualityControlOrder]) -> QualityControlOrder | None:
    if not orders:
        return None
    cited = [row for row in orders if row.evidence_level == "cited" and row.is_mandatory]
    if cited:
        return cited[0]
    unverified = [row for row in orders if row.evidence_level == "unverified"]
    if unverified:
        return unverified[0]
    return orders[0]


def qco_out(row: QualityControlOrder) -> QcoOut:
    return QcoOut(
        qco_title=row.qco_title,
        issuing_ministry=row.issuing_ministry,
        notification_date=row.notification_date,
        notification_ref=row.notification_ref,
        is_mandatory=row.is_mandatory,
        certification_scheme=row.certification_scheme,
        evidence_level=row.evidence_level,
        source_url=row.source_url,
    )


def walk_normative(session: Session, root_id: uuid.UUID, max_hops: int = NORMATIVE_MAX_HOPS) -> list[NormativeOut]:
    results: list[NormativeOut] = []
    seen_edges: set[tuple[uuid.UUID, uuid.UUID, str]] = set()
    frontier = [root_id]
    for hop in range(1, max_hops + 1):
        next_frontier: list[uuid.UUID] = []
        links = session.scalars(
            select(NormativeReference)
            .options(selectinload(NormativeReference.child))
            .where(NormativeReference.parent_id.in_(frontier))
        ).all()
        for link in links:
            edge = (link.parent_id, link.child_id, link.relationship_type)
            if edge in seen_edges:
                continue
            seen_edges.add(edge)
            child = link.child
            results.append(
                NormativeOut(
                    is_code=child.is_code,
                    title=child.title,
                    relationship_type=link.relationship_type,
                    hop=hop,
                )
            )
            next_frontier.append(link.child_id)
        frontier = next_frontier
        if not frontier:
            break
    return results


def semantic_candidates(session: Session, embedding: list[float], limit: int = 8) -> list[tuple[Standard, float]]:
    from app.core.chroma_store import get_chroma_collection
    
    collection = get_chroma_collection()
    results = collection.query(query_embeddings=[embedding], n_results=limit)
    
    if not results or not results["ids"] or not results["ids"][0]:
        return []
        
    chroma_ids = results["ids"][0]
    chroma_distances = results["distances"][0] if "distances" in results and results["distances"] else [0.0]*len(chroma_ids)
    id_to_dist = dict(zip(chroma_ids, chroma_distances))
    
    rows = session.execute(
        select(Standard)
        .options(selectinload(Standard.qcos))
        .where(Standard.is_code.in_(chroma_ids))
    ).scalars().all()
    
    matched = [(row, id_to_dist.get(row.is_code, 0.0)) for row in rows]
    
    ranked = sorted(
        matched,
        key=lambda item: (
            item[1] + (0.0 if item[0].status == "ACTIVE" else DISTANCE_ACTIVE_TIE),
            item[1],
        ),
    )
    return ranked


def to_match(session: Session, standard: Standard, distance: float | None) -> MatchOut:
    qco = pick_qco(list(standard.qcos))
    return MatchOut(
        is_code=standard.is_code,
        title=standard.title,
        status=standard.status,
        latest_revision_year=standard.latest_revision_year,
        successor_is_code=standard.successor_is_code,
        distance=None if distance is None else round(distance, 4),
        alerts=alerts_for(standard, qco),
        qco=qco_out(qco) if qco else None,
        normative_references=walk_normative(session, standard.id),
    )


def merge_matches(
    session: Session,
    explicit_rows: list[Standard],
    semantic_rows: list[tuple[Standard, float]],
) -> list[MatchOut]:
    ordered: list[tuple[Standard, float | None]] = []
    seen: set[str] = set()
    for row in explicit_rows:
        if row.is_code in seen:
            continue
        seen.add(row.is_code)
        ordered.append((row, 0.0))
    for row, dist in semantic_rows:
        if row.is_code in seen:
            continue
        seen.add(row.is_code)
        ordered.append((row, dist))
    trimmed = ordered[:MATCH_LIMIT]
    ids = [row.id for row, _ in trimmed]
    loaded = {
        item.id: item
        for item in session.scalars(
            select(Standard).options(selectinload(Standard.qcos)).where(Standard.id.in_(ids))
        ).all()
    }
    return [to_match(session, loaded[row.id], dist) for row, dist in trimmed]
