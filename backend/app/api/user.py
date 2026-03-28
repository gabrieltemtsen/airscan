from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import extract, func

from app.core.auth import get_current_user
from app.core.config import settings
from app.db.session import db_session
from app.models.case import Case, Finding
from app.models.policy import PolicyPack
from app.models.user import User
from app.schemas.common import UsageOut, UserMeOut

router = APIRouter(tags=["user"])


@router.get("/user/me", response_model=UserMeOut)
def me(user=Depends(get_current_user)):
    # Auto-upgrade to beta plan if email is on the beta list
    if (
        user.email.lower() in settings.beta_email_list
        and user.plan not in ("beta", "starter", "pro", "enterprise")
    ):
        with db_session() as db:
            db_user = db.query(User).filter(User.id == user.id).one()
            db_user.plan = "beta"
            db.commit()
        user.plan = "beta"

    return UserMeOut(
        email=user.email,
        plan=user.plan,
        credits_seconds=user.credits_seconds,
        free_analyses_used=user.free_analyses_used,
        beta_mode=settings.beta_mode,
    )


@router.post("/admin/grant-beta")
def grant_beta(email: str, user=Depends(get_current_user)):
    """Grant beta (unlimited) access to a user by email. Only works when BETA_MODE=true."""
    if not settings.beta_mode:
        raise HTTPException(status_code=403, detail="Admin actions require BETA_MODE=true")
    with db_session() as db:
        target = db.query(User).filter(User.email == email.lower()).one_or_none()
        if not target:
            raise HTTPException(status_code=404, detail="User not found. They must sign up first.")
        target.plan = "beta"
        db.commit()
    return {"ok": True, "message": f"{email} upgraded to beta plan (unlimited access)"}


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
