from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.auth import get_current_user
from app.schemas.common import PresignedUploadIn, PresignedUploadOut
from app.services.storage import make_object_key, object_url, presigned_put_url

router = APIRouter(tags=["upload"])


@router.post("/upload/presigned", response_model=PresignedUploadOut)
def get_presigned_upload(payload: PresignedUploadIn, _user=Depends(get_current_user)):
    key = make_object_key(payload.file_name)
    upload_url = presigned_put_url(key, payload.content_type)
    return PresignedUploadOut(upload_url=upload_url, file_url=object_url(key), object_key=key)
