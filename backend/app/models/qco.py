import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class QualityControlOrder(Base):
    __tablename__ = "quality_control_orders"
    __table_args__ = (
        CheckConstraint("evidence_level IN ('cited', 'unverified')", name="ck_qco_evidence"),
        CheckConstraint(
            "certification_scheme IN ('ISI', 'CRS', 'HALLMARK', 'NONE')",
            name="ck_qco_scheme",
        ),
        CheckConstraint(
            "(evidence_level = 'cited' AND notification_ref <> '' AND source_url <> '') OR evidence_level = 'unverified'",
            name="ck_qco_cited_has_source",
        ),
        CheckConstraint(
            "evidence_level <> 'unverified' OR is_mandatory = false",
            name="ck_qco_unverified_not_mandatory",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    standard_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("standards.id", ondelete="CASCADE"), nullable=False
    )
    qco_title: Mapped[str] = mapped_column(String(300), nullable=False)
    issuing_ministry: Mapped[str] = mapped_column(String(200), nullable=False)
    notification_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    notification_ref: Mapped[str] = mapped_column(String(400), nullable=False, default="")
    is_mandatory: Mapped[bool] = mapped_column(Boolean, nullable=False)
    certification_scheme: Mapped[str] = mapped_column(String(20), nullable=False)
    evidence_level: Mapped[str] = mapped_column(String(20), nullable=False)
    source_url: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    standard: Mapped["Standard"] = relationship(back_populates="qcos")
