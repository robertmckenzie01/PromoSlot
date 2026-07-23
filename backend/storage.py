"""Server-side file storage for delivery proof.

Proof only counts once a real file is actually written to disk here (or a real
URL is provided). No placeholder / auto-filled proof.
"""
import os
import re
import uuid

from .config import settings

_SAFE = re.compile(r"[^A-Za-z0-9._-]")


def _safe_name(name: str) -> str:
    return _SAFE.sub("_", name or "file")[:120]


def save_proof_file(deal_id: int, upload, max_bytes: int) -> tuple[str, int]:
    """Stream an UploadFile to disk. Returns (path, size). Enforces a size cap."""
    folder = os.path.join(settings.storage_dir, "proofs", f"deal_{deal_id}")
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
