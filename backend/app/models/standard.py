import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import EMBEDDING_DIM
from app.models.base import Base

STATUSES = ("ACTIVE", "WITHDRAWN", "REVISED")
RELATIONSHIP_TYPES = ("TEST_METHOD", "TERMINOLOGY", "SAFETY", "INSTALLATION")


class Standard(Base):
    __tablename__ = "standards"
    __table_args__ = (
        CheckConstraint("status IN ('ACTIVE', 'WITHDRAWN', 'REVISED')", name="ck_standards_status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    is_code: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(400), nullable=False)
    scope_summary: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float]] = mapped_column(Vector(EMBEDDING_DIM), nullable=False)
    latest_revision_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    successor_is_code: Mapped[str | None] = mapped_column(String(80), nullable=True)
    category: Mapped[str] = mapped_column(String(40), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    qcos: Mapped[list["QualityControlOrder"]] = relationship(back_populates="standard", cascade="all, delete-orphan")
    normative_children: Mapped[list["NormativeReference"]] = relationship(
        foreign_keys="NormativeReference.parent_id",
        back_populates="parent",
        cascade="all, delete-orphan",
    )


class NormativeReference(Base):
    __tablename__ = "normative_references"
    __table_args__ = (
        UniqueConstraint("parent_id", "child_id", "relationship_type", name="uq_normative_edge"),
        CheckConstraint("parent_id <> child_id", name="ck_normative_no_self"),
        CheckConstraint(
            "relationship_type IN ('TEST_METHOD', 'TERMINOLOGY', 'SAFETY', 'INSTALLATION')",
            name="ck_normative_relationship",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("standards.id", ondelete="CASCADE"), nullable=False
    )
    child_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("standards.id", ondelete="CASCADE"), nullable=False
    )
    relationship_type: Mapped[str] = mapped_column(String(20), nullable=False)

    parent: Mapped[Standard] = relationship(foreign_keys=[parent_id], back_populates="normative_children")
    child: Mapped[Standard] = relationship(foreign_keys=[child_id])
