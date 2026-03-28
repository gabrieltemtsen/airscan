from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field


class UserMeOut(BaseModel):
    email: str
    plan: str
    credits_seconds: int
    free_analyses_used: int


class UsageOut(BaseModel):
    total_cases: int
    findings_this_month: int
    hours_analyzed_total: float
    seconds_used_total: int
    subscription_seconds_remaining: int
    policy_packs: int


class PresignedUploadIn(BaseModel):
    file_name: str
    content_type: str


class PresignedUploadOut(BaseModel):
    upload_url: str
    file_url: str
    object_key: str


class CaseCreateIn(BaseModel):
    station_name: str | None = None
    program_name: str | None = None
    broadcast_date: date | None = None
    file_url: str
    file_name: str
    policy_pack_ids: list[str] = Field(default_factory=list)


class CaseOut(BaseModel):
    id: uuid.UUID
    station_name: str | None
    program_name: str | None
    broadcast_date: date | None
    file_url: str
    file_name: str
    file_duration_seconds: int | None
    audio_url: str | None
    status: str
    error_message: str | None
    policy_pack_ids: list[str]
    created_at: datetime
    completed_at: datetime | None


class CaseListItem(BaseModel):
    id: uuid.UUID
    station_name: str | None
    program_name: str | None
    broadcast_date: date | None
    status: str
    findings_count: int
    created_at: datetime


class PaginatedCases(BaseModel):
    items: list[CaseListItem]
    total: int


class TranscriptOut(BaseModel):
    full_text: str
    segments: list[dict]


class FindingOut(BaseModel):
    id: uuid.UUID
    clause_id: uuid.UUID
    clause_section_number: str
    clause_title: str
    timestamp_start: float
    timestamp_end: float
    quote: str
    explanation: str
    severity: str
    confidence: float
    recommended_action: str
    reviewer_status: str
    reviewer_note: str | None
    reviewed_at: datetime | None


class FindingUpdateIn(BaseModel):
    reviewer_status: str | None = None
    reviewer_note: str | None = None


class PolicyPackOut(BaseModel):
    id: uuid.UUID
    name: str
    version: str
    description: str | None
    is_default: bool
    clause_count: int
    created_at: datetime


class PolicyClauseOut(BaseModel):
    id: uuid.UUID
    section_number: str
    title: str
    text: str
    prohibited_behaviors: list[str]
    severity_level: str


class BillingCheckoutIn(BaseModel):
    amount_ngn: int


class BillingCheckoutOut(BaseModel):
    authorization_url: str
    reference: str


class InvoiceOut(BaseModel):
    id: uuid.UUID
    amount_ngn: int
    credits_seconds: int
    paystack_reference: str
    status: str
    created_at: datetime
