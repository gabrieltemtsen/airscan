from __future__ import annotations

import time
from functools import lru_cache

import requests
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt

from app.core.config import settings
from app.db.session import db_session
from app.models.user import User

security = HTTPBearer(auto_error=False)


@lru_cache(maxsize=1)
def _jwks():
    if not settings.clerk_jwks_url:
        return None
    res = requests.get(settings.clerk_jwks_url, timeout=10)
    res.raise_for_status()
    return res.json()


def _verify_and_decode(token: str) -> dict:
    # If issuer/JWKS are provided, verify signature.
    if settings.clerk_jwks_url and settings.clerk_issuer:
        jwks = _jwks()
        try:
            return jwt.decode(
                token,
                jwks,
                algorithms=["RS256"],
                issuer=settings.clerk_issuer,
                options={"verify_aud": False},
            )
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

    # Fallback (dev): decode without signature verification.
    try:
        return jwt.get_unverified_claims(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


def _fetch_clerk_user(clerk_user_id: str) -> dict:
    # Clerk Backend API
    url = f"https://api.clerk.com/v1/users/{clerk_user_id}"
    res = requests.get(url, headers={"Authorization": f"Bearer {settings.clerk_secret_key}"}, timeout=12)
    if res.status_code >= 400:
        raise HTTPException(status_code=401, detail="Unable to fetch user from Clerk")
    return res.json()


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(security)) -> User:
    if not credentials:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    claims = _verify_and_decode(credentials.credentials)
    sub = claims.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Token missing sub")

    clerk_user = None
    email = claims.get("email")

    # Ensure email via Clerk API when not present.
    if not email:
        clerk_user = _fetch_clerk_user(sub)
        emails = clerk_user.get("email_addresses") or []
        primary_id = clerk_user.get("primary_email_address_id")
        primary = next((e for e in emails if e.get("id") == primary_id), emails[0] if emails else None)
        email = (primary or {}).get("email_address")

    if not email:
        raise HTTPException(status_code=401, detail="Could not determine user email")

    with db_session() as db:
        user = db.query(User).filter(User.clerk_id == sub).one_or_none()
        if user is None:
            user = User(clerk_id=sub, email=email, plan="free", credits_seconds=0, free_analyses_used=0)
            db.add(user)
            db.flush()
        else:
            if user.email != email:
                user.email = email
        db.refresh(user)
        return user


def require_admin_user(user: User = Depends(get_current_user)) -> User:
    # Placeholder for future enterprise admin roles.
    return user
