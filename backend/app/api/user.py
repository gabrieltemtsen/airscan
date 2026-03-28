from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import extract, func

from app.core.auth import get_current_user
from app.db.session import db_session
from app.models.case import Case, Finding
from app.models.policy import PolicyPack
from app.schemas.common import UsageOut, UserMeOut

router = APIRouter(tags=["user"])


@router.get("/user/me", response_model=UserMeOut)
def me(user=Depends(get_current_user)):
    return UserMeOut(
        email=user.email,
        plan=user.plan,
        credits_seconds=user.credits_seconds,
        free_analyses_used=user.free_analyses_used,
    )


@router.get("/user/usage", response_model=UsageOut)
def usage(user=Depends(get_current_user)):
    now = datetime.utcnow()
    with db_session() as db:
        total_cases = db.query(func.count(Case.id)).filter(Case.user_id == user.id).scalar() or 0
        seconds_used = (
            db.query(func.coalesce(func.sum(Case.file_duration_seconds), 0))
            .filter(Case.user_id == user.id, Case.status == "complete")
            .scalar()
            or 0
        )
        hours_analyzed = float(seconds_used) / 3600.0

        findings_this_month = (
            db.query(func.count(Finding.id))
            .join(Case, Case.id == Finding.case_id)
            .filter(
                Case.user_id == user.id,
                extract("year", Case.created_at) == now.year,
                extract("month", Case.created_at) == now.month,
            )
            .scalar()
            or 0
        )

        policy_packs = db.query(func.count(PolicyPack.id)).scalar() or 0

        # subscription remaining: simplistic for now
        subscription_seconds_remaining = 0

        return UsageOut(
            total_cases=int(total_cases),
            findings_this_month=int(findings_this_month),
            hours_analyzed_total=hours_analyzed,
            seconds_used_total=int(seconds_used),
            subscription_seconds_remaining=int(subscription_seconds_remaining),
            policy_packs=int(policy_packs),
        )
