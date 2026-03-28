from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user
from app.db.session import db_session
from app.models.case import Case, Finding
from app.schemas.common import FindingUpdateIn

router = APIRouter(tags=["findings"])


@router.patch("/findings/{finding_id}")
def update_finding(finding_id: str, payload: FindingUpdateIn, user=Depends(get_current_user)):
    with db_session() as db:
        f = db.query(Finding).filter(Finding.id == finding_id).one_or_none()
        if not f:
            raise HTTPException(status_code=404, detail="Not found")

        c = db.query(Case).filter(Case.id == f.case_id, Case.user_id == user.id).one_or_none()
        if not c:
            raise HTTPException(status_code=403, detail="Forbidden")

        if payload.reviewer_status is not None:
            f.reviewer_status = payload.reviewer_status
            f.reviewed_at = datetime.utcnow()
        if payload.reviewer_note is not None:
            f.reviewer_note = payload.reviewer_note
            f.reviewed_at = datetime.utcnow()

        db.add(f)
        return {"ok": True}
