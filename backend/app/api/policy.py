from __future__ import annotations

import os
import tempfile

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import func

from app.core.auth import get_current_user
from app.db.session import db_session
from app.models.policy import PolicyClause, PolicyPack
from app.schemas.common import PolicyClauseOut, PolicyPackOut
from app.services.policy_extract import extract_clauses_from_document

router = APIRouter(tags=["policy"])


@router.get("/policy-packs", response_model=list[PolicyPackOut])
def list_policy_packs(user=Depends(get_current_user)):
    with db_session() as db:
        packs = db.query(PolicyPack).order_by(PolicyPack.created_at.desc()).all()
        counts = dict(
            db.query(PolicyClause.pack_id, func.count(PolicyClause.id)).group_by(PolicyClause.pack_id).all()
        )
        out = []
        for p in packs:
            out.append(
                PolicyPackOut(
                    id=p.id,
                    name=p.name,
                    version=p.version,
                    description=p.description,
                    is_default=p.is_default,
                    clause_count=int(counts.get(p.id, 0)),
                    created_at=p.created_at,
                )
            )
        return out


@router.post("/policy-packs", response_model=PolicyPackOut)
def create_policy_pack(
    name: str,
    version: str = "v1",
    description: str | None = None,
    user=Depends(get_current_user),
):
    with db_session() as db:
        p = PolicyPack(name=name, version=version, description=description, is_default=False, created_by=user.id)
        db.add(p)
        db.flush()
        db.refresh(p)
        return PolicyPackOut(
            id=p.id,
            name=p.name,
            version=p.version,
            description=p.description,
            is_default=p.is_default,
            clause_count=0,
            created_at=p.created_at,
        )


@router.get("/policy-packs/{pack_id}/clauses", response_model=list[PolicyClauseOut])
def list_clauses(pack_id: str, user=Depends(get_current_user)):
    with db_session() as db:
        p = db.query(PolicyPack).filter(PolicyPack.id == pack_id).one_or_none()
        if not p:
            raise HTTPException(status_code=404, detail="Not found")
        clauses = db.query(PolicyClause).filter(PolicyClause.pack_id == p.id).order_by(PolicyClause.section_number.asc()).all()
        return [
            PolicyClauseOut(
                id=c.id,
                section_number=c.section_number,
                title=c.title,
                text=c.text,
                prohibited_behaviors=c.prohibited_behaviors,
                severity_level=c.severity_level,
            )
            for c in clauses
        ]


@router.post("/policy-packs/upload")
def upload_policy_doc(
    file: UploadFile = File(...),
    name: str = Form(...),
    version: str = Form("v1"),
    user=Depends(get_current_user),
):
    suffix = os.path.splitext(file.filename or "policy")[1]
    with tempfile.TemporaryDirectory() as td:
        path = os.path.join(td, f"upload{suffix}")
        with open(path, "wb") as f:
            f.write(file.file.read())

        clauses = extract_clauses_from_document(path)
        if not clauses:
            raise HTTPException(status_code=400, detail="Could not extract clauses from document")

        with db_session() as db:
            p = PolicyPack(name=name, version=version, description="Uploaded policy document", is_default=False, created_by=user.id)
            db.add(p)
            db.flush()

            for c in clauses:
                db.add(
                    PolicyClause(
                        pack_id=p.id,
                        section_number=c["section_number"],
                        title=c["title"],
                        text=c["text"],
                        prohibited_behaviors=c.get("prohibited_behaviors") or [],
                        severity_level=c.get("severity_level") or "medium",
                    )
                )

            db.flush()
            db.refresh(p)
            return {"id": str(p.id)}
