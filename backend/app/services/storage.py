from __future__ import annotations

import os
import uuid
from urllib.parse import urlparse

import boto3

from app.core.config import settings


def s3_client():
    return boto3.client(
        "s3",
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
        endpoint_url=settings.aws_endpoint_url,
        region_name=settings.aws_region,
    )


def make_object_key(filename: str) -> str:
    base = os.path.basename(filename)
    return f"uploads/{uuid.uuid4()}/{base}"


def presigned_put_url(key: str, content_type: str, expires: int = 3600) -> str:
    client = s3_client()
    return client.generate_presigned_url(
        ClientMethod="put_object",
        Params={
            "Bucket": settings.aws_bucket_name,
            "Key": key,
            "ContentType": content_type,
        },
        ExpiresIn=expires,
    )


def presigned_get_url(bucket: str, key: str, expires: int = 3600) -> str:
    client = s3_client()
    return client.generate_presigned_url(
        ClientMethod="get_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=expires,
    )


def object_url(key: str) -> str:
    """Return a stable internal URL for storage.

    We store `s3://bucket/key` in the DB to avoid coupling to any particular public endpoint
    and to keep parsing unambiguous across S3/R2/custom domains.
    """
    return f"s3://{settings.aws_bucket_name}/{key}"


def parse_s3_style_url(url: str) -> tuple[str, str]:
    # Supports either path-style {endpoint}/{bucket}/{key} or s3://bucket/key
    if url.startswith("s3://"):
        p = urlparse(url)
        bucket = p.netloc
        key = p.path.lstrip("/")
        return bucket, key

    p = urlparse(url)
    parts = p.path.lstrip("/").split("/", 1)
    if len(parts) < 2:
        raise ValueError("Unsupported file_url format")
    bucket, key = parts[0], parts[1]
    return bucket, key


def download_to_path(file_url: str, out_path: str) -> None:
    client = s3_client()
    bucket, key = parse_s3_style_url(file_url)
    client.download_file(bucket, key, out_path)


def upload_file(local_path: str, key: str, content_type: str) -> str:
    client = s3_client()
    client.upload_file(local_path, settings.aws_bucket_name, key, ExtraArgs={"ContentType": content_type})
    return object_url(key)
