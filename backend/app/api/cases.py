from __future__ import annotations

import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse
from sqlalchemy import func

from app.core.auth import get_current_user
from app.db.session import db_session
from app.models.case import Case, Finding, Transcript
from app.models.policy import PolicyClause
from app.schemas.common import (
    CaseCreateIn,
    CaseOut,
    PaginatedCases,
    TranscriptOut,
)
from app.services.export import build_pdf_report
from app.worker.jobs import analyze_case
from app.worker.queue import get_queue

router = APIRouter(tags=["cases"])


@router.post("/cases", response_model=CaseOut)
def create_case(payload: CaseCreateIn, user=Depends(get_current_user)):
    from app.core.config import settings
    from app.models.policy import PolicyPack

    with db_session() as db:
        # free plan cutoff (skip in beta mode)
        is_unlimited = settings.beta_mode or user.plan in ("beta", "starter", "pro", "enterprise")
        if not is_unlimited and user.plan == "free" and user.free_analyses_used >= 3:
            raise HTTPException(status_code=402, detail="Free trial used. Top up credits or subscribe.")

        # If no policy packs selected, auto-use all default packs
        pack_ids = payload.policy_pack_ids
        if not pack_ids:
            defaults = db.query(PolicyPack).filter(PolicyPack.is_default == True).all()  # noqa: E712
            pack_ids = [str(p.id) for p in defaults]

        c = Case(
            user_id=user.id,
            station_name=payload.station_name,
            program_name=payload.program_name,
            broadcast_date=payload.broadcast_date,
            file_url=payload.file_url,
            file_name=payload.file_name,
            status="uploading",
            policy_pack_ids=pack_ids,
        )
        db.add(c)
        db.flush()
        db.refresh(c)

        q = get_queue()
        q.enqueue(analyze_case, str(c.id), job_timeout=60 * 60)

        return CaseOut(**c.__dict__)


@router.get("/cases", response_model=PaginatedCases)
def list_cases(
    page: int = 1,
    page_size: int = 25,
    status: str | None = None,
    user=Depends(get_current_user),
):
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)

    with db_session() as db:
        q = db.query(Case).filter(Case.user_id == user.id)
        if status:
            q = q.filter(Case.status == status)
        total = q.count()

        cases = (
            q.order_by(Case.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )

        # findings count
        ids = [c.id for c in cases]
        counts = dict(
            db.query(Finding.case_id, func.count(Finding.id)).filter(Finding.case_id.in_(ids)).group_by(Finding.case_id).all()
        )

        items = []
        for c in cases:
            items.append(
                {
                    "id": c.id,
                    "station_name": c.station_name,
                    "program_name": c.program_name,
                    "broadcast_date": c.broadcast_date,
                    "status": c.status,
                    "findings_count": int(counts.get(c.id, 0)),
                    "created_at": c.created_at,
                }
            )

        return {"items": items, "total": total}


@router.get("/cases/{case_id}", response_model=CaseOut)
def case_detail(case_id: str, user=Depends(get_current_user)):
    with db_session() as db:
        c = db.query(Case).filter(Case.id == case_id, Case.user_id == user.id).one_or_none()
        if not c:
            raise HTTPException(status_code=404, detail="Not found")
        return CaseOut(**c.__dict__)


@router.delete("/cases/{case_id}")
def delete_case(case_id: str, user=Depends(get_current_user)):
    with db_session() as db:
        c = db.query(Case).filter(Case.id == case_id, Case.user_id == user.id).one_or_none()
        if not c:
            raise HTTPException(status_code=404, detail="Not found")
        db.delete(c)
        return {"ok": True}


@router.get("/cases/{case_id}/transcript", response_model=TranscriptOut)
def get_transcript(case_id: str, user=Depends(get_current_user)):
    with db_session() as db:
        c = db.query(Case).filter(Case.id == case_id, Case.user_id == user.id).one_or_none()
        if not c:
            raise HTTPException(status_code=404, detail="Not found")
        t = db.query(Transcript).filter(Transcript.case_id == c.id).one_or_none()
        if not t:
            raise HTTPException(status_code=404, detail="Transcript not found")
        return TranscriptOut(full_text=t.full_text, segments=t.segments)


@router.get("/cases/{case_id}/findings")
def get_findings(case_id: str, severity: str | None = None, user=Depends(get_current_user)):
    with db_session() as db:
        c = db.query(Case).filter(Case.id == case_id, Case.user_id == user.id).one_or_none()
        if not c:
            raise HTTPException(status_code=404, detail="Not found")

        q = db.query(Finding, PolicyClause).join(PolicyClause, PolicyClause.id == Finding.clause_id).filter(Finding.case_id == c.id)
        if severity:
            q = q.filter(Finding.severity == severity)
        q = q.order_by(Finding.timestamp_start.asc())

        out = []
        for f, clause in q.all():
            out.append(
                {
                    "id": f.id,
                    "clause_id": f.clause_id,
                    "clause_section_number": clause.section_number,
                    "clause_title": clause.title,
                    "timestamp_start": f.timestamp_start,
                    "timestamp_end": f.timestamp_end,
                    "quote": f.quote,
                    "explanation": f.explanation,
                    "severity": f.severity,
                    "confidence": f.confidence,
                    "recommended_action": f.recommended_action,
                    "reviewer_status": f.reviewer_status,
                    "reviewer_note": f.reviewer_note,
                    "reviewed_at": f.reviewed_at,
                }
            )
        return out


@router.get("/cases/{case_id}/export/csv")
def export_csv(case_id: str, user=Depends(get_current_user)):
    with db_session() as db:
        c = db.query(Case).filter(Case.id == case_id, Case.user_id == user.id).one_or_none()
        if not c:
            raise HTTPException(status_code=404, detail="Not found")

        rows = (
            db.query(Finding, PolicyClause)
            .join(PolicyClause, PolicyClause.id == Finding.clause_id)
            .filter(Finding.case_id == c.id)
            .order_by(Finding.timestamp_start.asc())
            .all()
        )

        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["timestamp_start", "timestamp_end", "severity", "confidence", "clause_section", "clause_title", "quote", "explanation", "recommended_action", "reviewer_status", "reviewer_note"])
        for f, clause in rows:
            w.writerow(
                [
                    f.timestamp_start,
                    f.timestamp_end,
                    f.severity,
                    f.confidence,
                    clause.section_number,
                    clause.title,
                    f.quote,
                    f.explanation,
                    f.recommended_action,
                    f.reviewer_status,
                    f.reviewer_note or "",
                ]
            )

        return Response(content=buf.getvalue(), media_type="text/csv")


@router.get("/cases/{case_id}/export/pdf")
def export_pdf(case_id: str, user=Depends(get_current_user)):
    with db_session() as db:
        c = db.query(Case).filter(Case.id == case_id, Case.user_id == user.id).one_or_none()
        if not c:
            raise HTTPException(status_code=404, detail="Not found")

        rows = (
            db.query(Finding, PolicyClause)
            .join(PolicyClause, PolicyClause.id == Finding.clause_id)
            .filter(Finding.case_id == c.id)
            .order_by(Finding.timestamp_start.asc())
            .all()
        )

        findings = []
        for f, clause in rows:
            findings.append(
                {
                    "timestamp_start": f.timestamp_start,
                    "timestamp_end": f.timestamp_end,
                    "quote": f.quote,
                    "severity": f.severity,
                    "confidence": f.confidence,
                    "recommended_action": f.recommended_action,
                    "clause_section_number": clause.section_number,
                    "clause_title": clause.title,
                }
            )

        pdf = build_pdf_report(
            case={
                "station_name": c.station_name,
                "program_name": c.program_name,
                "broadcast_date": c.broadcast_date.isoformat() if c.broadcast_date else None,
                "file_name": c.file_name,
                "file_duration_seconds": c.file_duration_seconds,
            },
            findings=findings,
        )

        return StreamingResponse(io.BytesIO(pdf), media_type="application/pdf")
