from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Case(Base):
    __tablename__ = "cases"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)

    station_name: Mapped[str | None] = mapped_column(String, nullable=True)
    program_name: Mapped[str | None] = mapped_column(String, nullable=True)
    broadcast_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    file_url: Mapped[str] = mapped_column(String)
    file_name: Mapped[str] = mapped_column(String)
    file_duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    audio_url: Mapped[str | None] = mapped_column(String, nullable=True)

    status: Mapped[str] = mapped_column(String, default="uploading", index=True)
    error_message: Mapped[str | None] = mapped_column(String, nullable=True)

    policy_pack_ids: Mapped[list[str]] = mapped_column(JSONB, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    transcript: Mapped[Transcript | None] = relationship("Transcript", back_populates="case", uselist=False, cascade="all, delete-orphan")
    findings: Mapped[list[Finding]] = relationship("Finding", back_populates="case", cascade="all, delete-orphan")


class Transcript(Base):
    __tablename__ = "transcripts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cases.id"), unique=True)

    segments: Mapped[list[dict]] = mapped_column(JSONB, default=list)
    full_text: Mapped[str] = mapped_column(String)

    case: Mapped[Case] = relationship("Case", back_populates="transcript")


class Finding(Base):
    __tablename__ = "findings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cases.id"), index=True)
    clause_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("policy_clauses.id"), index=True)

    timestamp_start: Mapped[float] = mapped_column()
    timestamp_end: Mapped[float] = mapped_column()
    quote: Mapped[str] = mapped_column(String)
    explanation: Mapped[str] = mapped_column(String)
    severity: Mapped[str] = mapped_column(String)
    confidence: Mapped[float] = mapped_column()
    recommended_action: Mapped[str] = mapped_column(String)

    reviewer_status: Mapped[str] = mapped_column(String, default="pending")
    reviewer_note: Mapped[str | None] = mapped_column(String, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    case: Mapped[Case] = relationship("Case", back_populates="findings")
