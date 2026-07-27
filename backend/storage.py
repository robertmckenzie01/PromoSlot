"""Server-side file storage for delivery proof and platform media.

Files are streamed to local disk under STORAGE_DIR. This is dev/local storage:
delivery proof lives under storage/proofs/ and platform media (portfolio /
past-campaign videos) under storage/media/. Both are intended to migrate to
object storage (S3/GCS + CDN/signed URLs) TOGETHER in a single future change —
keep them on the same backing store so it's one move, not two.
"""
import os
import re
import uuid

from .config import settings

_SAFE = re.compile(r"[^A-Za-z0-9._-]")


def _safe_name(name: str) -> str:
    return _SAFE.sub("_", name or "file")[:120]


def _stream_to_disk(folder: str, upload, max_bytes: int) -> tuple:
    """Stream an UploadFile to disk in `folder`. Returns (path, size); size-capped."""
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, f"{uuid.uuid4().hex}_{_safe_name(upload.filename)}")
    size = 0
    with open(path, "wb") as f:
        while True:
            chunk = upload.file.read(1024 * 1024)
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


def save_proof_file(deal_id: int, upload, max_bytes: int) -> tuple:
    """Store a delivery-proof file under storage/proofs/deal_{id}/."""
    return _stream_to_disk(os.path.join(settings.storage_dir, "proofs", f"deal_{deal_id}"),
                           upload, max_bytes)


def save_media_file(platform_id: int, upload, max_bytes: int) -> tuple:
    """Store a platform media (video) file under storage/media/platform_{id}/."""
    return _stream_to_disk(os.path.join(settings.storage_dir, "media", f"platform_{platform_id}"),
                           upload, max_bytes)


def save_generic(subfolder: str, upload, max_bytes: int) -> tuple:
    """Store any upload (avatars, profile videos, listing/campaign images) under
    storage/<subfolder>/. Same disk-storage flow as proofs/media; migrates with them."""
    return _stream_to_disk(os.path.join(settings.storage_dir, subfolder), upload, max_bytes)
