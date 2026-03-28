from __future__ import annotations

import hashlib
import hmac

import requests
from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.auth import get_current_user
from app.core.config import settings
from app.db.session import db_session
from app.models.billing import CreditTransaction
from app.models.user import User
from app.schemas.common import BillingCheckoutIn, BillingCheckoutOut, InvoiceOut

router = APIRouter(tags=["billing"])


def _credits_for_amount(amount_ngn: int) -> int:
    # Define packs in seconds.
    mapping = {
        5000: 60 * 60,
        20000: 5 * 60 * 60,
        100000: 30 * 60 * 60,
    }
    if amount_ngn not in mapping:
        raise HTTPException(status_code=400, detail="Invalid pack amount")
    return mapping[amount_ngn]


@router.post("/billing/express/checkout", response_model=BillingCheckoutOut)
def express_checkout(payload: BillingCheckoutIn, user=Depends(get_current_user)):
    credits_seconds = _credits_for_amount(payload.amount_ngn)

    # Paystack expects amount in kobo.
    init_payload = {
        "email": user.email,
        "amount": payload.amount_ngn * 100,
        "currency": "NGN",
        "callback_url": f"{settings.frontend_url}/billing",
        "metadata": {
            "airscan_user_id": str(user.id),
            "credits_seconds": credits_seconds,
        },
    }

    res = requests.post(
        "https://api.paystack.co/transaction/initialize",
        headers={"Authorization": f"Bearer {settings.paystack_secret_key}", "Content-Type": "application/json"},
        json=init_payload,
        timeout=15,
    )
    if res.status_code >= 400:
        raise HTTPException(status_code=400, detail=res.text)
    data = res.json()
    if not data.get("status"):
        raise HTTPException(status_code=400, detail=data.get("message") or "Paystack init failed")

    auth_url = data["data"]["authorization_url"]
    reference = data["data"]["reference"]

    with db_session() as db:
        tx = CreditTransaction(
            user_id=user.id,
            amount_ngn=payload.amount_ngn,
            credits_seconds=credits_seconds,
            paystack_reference=reference,
            status="pending",
        )
        db.add(tx)

    return BillingCheckoutOut(authorization_url=auth_url, reference=reference)


@router.post("/billing/webhook")
async def paystack_webhook(request: Request):
    raw = await request.body()
    sig = request.headers.get("x-paystack-signature")
    expected = hmac.new(settings.paystack_secret_key.encode(), raw, hashlib.sha512).hexdigest()
    if not sig or not hmac.compare_digest(sig, expected):
        raise HTTPException(status_code=401, detail="Invalid signature")

    event = await request.json()
    if event.get("event") != "charge.success":
        return {"ok": True}

    data = event.get("data") or {}
    reference = data.get("reference")
    if not reference:
        return {"ok": True}

    # Verify transaction
    v = requests.get(
        f"https://api.paystack.co/transaction/verify/{reference}",
        headers={"Authorization": f"Bearer {settings.paystack_secret_key}"},
        timeout=15,
    )
    vdata = v.json() if v.status_code < 400 else None
    if not vdata or not vdata.get("status"):
        raise HTTPException(status_code=400, detail="Verify failed")

    status = vdata["data"].get("status")

    with db_session() as db:
        tx = db.query(CreditTransaction).filter(CreditTransaction.paystack_reference == reference).one_or_none()
        if not tx:
            return {"ok": True}

        if status == "success" and tx.status != "success":
            tx.status = "success"
            user = db.query(User).filter(User.id == tx.user_id).one()
            user.plan = "express" if user.plan == "free" else user.plan
            user.credits_seconds += tx.credits_seconds
        elif status != "success":
            tx.status = "failed"

    return {"ok": True}


@router.get("/billing/invoices", response_model=list[InvoiceOut])
def invoices(user=Depends(get_current_user)):
    with db_session() as db:
        txs = (
            db.query(CreditTransaction)
            .filter(CreditTransaction.user_id == user.id)
            .order_by(CreditTransaction.created_at.desc())
            .limit(200)
            .all()
        )
        return [
            InvoiceOut(
                id=t.id,
                amount_ngn=t.amount_ngn,
                credits_seconds=t.credits_seconds,
                paystack_reference=t.paystack_reference,
                status=t.status,
                created_at=t.created_at,
            )
            for t in txs
        ]
