from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import text

from app.core.auth import get_current_user
from app.core.config import settings
from app.db.session import engine
from app.db.session import db_session
from app.models.case import Case

router = APIRouter(tags=["debug"])


@router.get("/debug/runtime")
def runtime(user=Depends(get_current_user)):
    """Debug endpoint to confirm services are using the same DB/Redis in prod."""
    info: dict = {
        "user": {"email": user.email, "plan": user.plan},
        "beta_mode": settings.beta_mode,
        "db": {
            "dialect": engine.dialect.name,
            "url_present": bool(settings.database_url),
            "url_prefix": (settings.database_url[:30] + "...") if settings.database_url else "(empty)",
        },
        "redis": {"url_present": bool(settings.redis_url)},
        "storage": {
            "bucket": settings.aws_bucket_name,
            "endpoint_present": bool(settings.aws_endpoint_url),
        },
    }

    with db_session() as db:
        # Confirm DB is reachable and show counts
        db.execute(text("SELECT 1"))
        info["counts"] = {
            "cases_for_user": db.query(Case).filter(Case.user_id == user.id).count(),
        }

    return info
