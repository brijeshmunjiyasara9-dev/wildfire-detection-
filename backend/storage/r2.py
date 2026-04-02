"""
Cloudflare R2 Storage Module (S3-compatible via boto3).
Handles all binary file operations: videos, models, datasets.
"""

import boto3
import os
import asyncio
from botocore.config import Config
from botocore.exceptions import ClientError
from typing import Optional


def get_r2_client():
    """Create and return an R2 (S3-compatible) boto3 client."""
    account_id = os.getenv("R2_ACCOUNT_ID", "")
    access_key = os.getenv("R2_ACCESS_KEY_ID", "")
    secret_key = os.getenv("R2_SECRET_ACCESS_KEY", "")

    return boto3.client(
        "s3",
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


def get_bucket_name() -> str:
    return os.getenv("R2_BUCKET_NAME", "wildfirewatch")


def get_public_url(r2_key: str) -> str:
    """Return the public URL for a given R2 object key."""
    base_url = os.getenv("R2_PUBLIC_URL", "").rstrip("/")
    return f"{base_url}/{r2_key}"


async def upload_file(local_path: str, r2_key: str) -> str:
    """
    Upload a local file to R2. Returns the public URL.
    Runs in executor to avoid blocking event loop.
    """
    def _upload():
        client = get_r2_client()
        bucket = get_bucket_name()
        client.upload_file(local_path, bucket, r2_key)
        return get_public_url(r2_key)

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _upload)


async def download_file(r2_key: str, local_path: str) -> None:
    """
    Download a file from R2 to a local path.
    Runs in executor to avoid blocking event loop.
    """
    def _download():
        client = get_r2_client()
        bucket = get_bucket_name()
        os.makedirs(os.path.dirname(os.path.abspath(local_path)), exist_ok=True)
        client.download_file(bucket, r2_key, local_path)

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _download)


async def delete_file(r2_key: str) -> None:
    """Delete a file from R2."""
    def _delete():
        client = get_r2_client()
        bucket = get_bucket_name()
        client.delete_object(Bucket=bucket, Key=r2_key)

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _delete)


def generate_presigned_url(r2_key: str, expiration: int = 3600) -> str:
    """Generate a pre-signed URL for temporary access to a private object."""
    client = get_r2_client()
    bucket = get_bucket_name()
    url = client.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": r2_key},
        ExpiresIn=expiration,
    )
    return url


def check_r2_configured() -> bool:
    """Check if R2 credentials are properly configured."""
    required = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"]
    return all(os.getenv(k) for k in required)
