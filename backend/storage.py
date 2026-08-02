"""File storage for every upload in the app.

ONE place handles all of it: delivery proof, My Work videos and covers, profile
avatars and intro videos, profile assets, and listing/campaign images.

Two backends:
  * Cloudflare R2 (S3-compatible) when R2 env vars are configured — the
    production path. Objects survive redeploys, restarts and instance moves.
  * Local disk under STORAGE_DIR otherwise — dev convenience only. On an
    ephemeral host (Render) local files are destroyed on every deploy, which is
    exactly what this module exists to avoid.

What we persist in the database is a "storage ref":
  * R2  -> the object key, e.g. "proofs/deal_12/9f3a…_shot.png"
  * disk -> the filesystem path, e.g. "./storage/proofs/deal_12/9f3a…_shot.png"
Both are handled transparently, so rows written before the R2 migration keep
working without a data backfill.
"""
import mimetypes
import os
import re
import uuid

from fastapi.responses import FileResponse, RedirectResponse, StreamingResponse

from .config import settings

_SAFE = re.compile(r"[^A-Za-z0-9._-]")
_CHUNK = 1024 * 1024


def _safe_name(name: str) -> str:
    return _SAFE.sub("_", name or "file")[:120]


def _object_key(folder: str, filename: str) -> str:
    return f"{folder.strip('/')}/{uuid.uuid4().hex}_{_safe_name(filename)}"


# --------------------------------------------------------------------------
# R2 / S3 client
# --------------------------------------------------------------------------

_client = None


def remote_enabled() -> bool:
    return bool(settings.r2_endpoint_url and settings.r2_access_key_id
                and settings.r2_secret_access_key and settings.r2_bucket)


def _s3():
    """Lazily build the S3 client (R2 speaks the S3 API)."""
    global _client
    if _client is None:
        import boto3
        from botocore.config import Config
        _client = boto3.client(
            "s3",
            endpoint_url=settings.r2_endpoint_url,
            aws_access_key_id=settings.r2_access_key_id,
            aws_secret_access_key=settings.r2_secret_access_key,
            region_name="auto",                       # R2 uses "auto"
            config=Config(signature_version="s3v4", retries={"max_attempts": 3}),
        )
    return _client


def _is_remote_ref(ref: str) -> bool:
    """A ref is remote unless it points at a real file on this disk."""
    if not ref:
        return False
    if os.path.exists(ref):
        return False
    return remote_enabled()


# --------------------------------------------------------------------------
# Writing
# --------------------------------------------------------------------------

def _stream_to_disk(folder: str, upload, max_bytes: int) -> tuple:
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, f"{uuid.uuid4().hex}_{_safe_name(upload.filename)}")
    size = 0
    with open(path, "wb") as f:
        while True:
            chunk = upload.file.read(_CHUNK)
            if not chunk:
                break
            size += len(chunk)
            if size > max_bytes:
                f.close()
                os.remove(path)
                raise ValueError("file too large")
            f.write(chunk)
    if size == 0:
        os.remove(path)
        raise ValueError("empty file")
    return path, size


def _stream_to_r2(folder: str, upload, max_bytes: int) -> tuple:
    """Upload straight to R2, enforcing the size cap while streaming."""
    key = _object_key(folder, upload.filename)
    content_type = (upload.content_type
                    or mimetypes.guess_type(upload.filename or "")[0]
                    or "application/octet-stream")

    # Size-check without buffering the whole file in memory: read in chunks and
    # abort as soon as the cap is exceeded.
    upload.file.seek(0, os.SEEK_END)
    size = upload.file.tell()
    upload.file.seek(0)
    if size == 0:
        raise ValueError("empty file")
    if size > max_bytes:
        raise ValueError("file too large")

    _s3().upload_fileobj(
        upload.file, settings.r2_bucket, key,
        ExtraArgs={"ContentType": content_type},
    )
    return key, size


def save_upload(folder: str, upload, max_bytes: int) -> tuple:
    """Store an upload. Returns (storage_ref, size_bytes)."""
    if remote_enabled():
        return _stream_to_r2(folder, upload, max_bytes)
    return _stream_to_disk(os.path.join(settings.storage_dir, folder), upload, max_bytes)


# Backwards-compatible helpers used across the routers.
def save_proof_file(deal_id: int, upload, max_bytes: int) -> tuple:
    """Delivery evidence for a deal."""
    return save_upload(f"proofs/deal_{deal_id}", upload, max_bytes)


def save_media_file(platform_id: int, upload, max_bytes: int) -> tuple:
    """My Work videos / covers for a listing."""
    return save_upload(f"media/platform_{platform_id}", upload, max_bytes)


def save_generic(subfolder: str, upload, max_bytes: int) -> tuple:
    """Avatars, intro videos, profile assets, listing/campaign images."""
    return save_upload(subfolder, upload, max_bytes)


# --------------------------------------------------------------------------
# Reading / serving / deleting
# --------------------------------------------------------------------------

def stored_exists(ref: str) -> bool:
    if not ref:
        return False
    if os.path.exists(ref):
        return True
    if not remote_enabled():
        return False
    try:
        _s3().head_object(Bucket=settings.r2_bucket, Key=ref)
        return True
    except Exception:
        return False


def delete_stored(ref: str) -> None:
    """Best-effort delete; never raises."""
    if not ref:
        return
    if os.path.exists(ref):
        try:
            os.remove(ref)
        except OSError:
            pass
        return
    if remote_enabled():
        try:
            _s3().delete_object(Bucket=settings.r2_bucket, Key=ref)
        except Exception:
            pass


def presigned_url(ref: str, media_type: str = None, inline: bool = True,
                  expires: int = None) -> str:
    """Short-lived signed URL for a private object."""
    params = {"Bucket": settings.r2_bucket, "Key": ref}
    if media_type:
        params["ResponseContentType"] = media_type
    params["ResponseContentDisposition"] = "inline" if inline else "attachment"
    return _s3().generate_presigned_url(
        "get_object", Params=params,
        ExpiresIn=expires or settings.r2_url_ttl_seconds,
    )


def serve_stored(ref: str, media_type: str = None, inline: bool = True):
    """Return a Response that serves the stored file, wherever it lives.

    Remote objects are served by redirecting to a short-lived presigned URL:
    the caller's permission check has already run before we get here, the link
    expires quickly, and the browser gets native HTTP range support (so video
    seeking works, which streaming through the app did not give us).
    """
    if ref and os.path.exists(ref):
        return FileResponse(ref, media_type=media_type,
                            content_disposition_type="inline" if inline else "attachment")
    return RedirectResponse(presigned_url(ref, media_type, inline), status_code=307)


def open_stream(ref: str):
    """Read an object back as a file-like stream (used by tests/verification)."""
    if ref and os.path.exists(ref):
        return open(ref, "rb")
    obj = _s3().get_object(Bucket=settings.r2_bucket, Key=ref)
    return obj["Body"]


def backend_name() -> str:
    return f"r2:{settings.r2_bucket}" if remote_enabled() else f"disk:{settings.storage_dir}"
