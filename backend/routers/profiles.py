"""User profile media: account avatar + profile intro video.

Uploaded from My Account; served publicly so anyone viewing a profile sees them.
Same disk-storage flow as proofs/media (migrates together to object storage).
"""
import os

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..deps import get_current_user
from ..models import User
from ..storage import save_generic

router = APIRouter(tags=["profiles"])

IMG_MAX = 50 * 1024 * 1024  # generous cap for profile pictures


def _replace(old_path):
    if old_path and os.path.exists(old_path):
        try:
            os.remove(old_path)
        except OSError:
            pass


@router.post("/me/avatar", status_code=201)
def upload_avatar(file: UploadFile = File(...), user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    try:
        path, _ = save_generic(f"users/user_{user.id}", file, IMG_MAX)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    _replace(user.avatar_path)
    user.avatar_path, user.avatar_content_type = path, file.content_type
    db.commit()
    return {"avatar_url": f"/users/{user.id}/avatar"}


@router.get("/users/{user_id}/avatar")
def get_avatar(user_id: int, db: Session = Depends(get_db)):
    u = db.get(User, user_id)
    if u is None or not u.avatar_path or not os.path.exists(u.avatar_path):
        raise HTTPException(status_code=404, detail="No avatar")
    return FileResponse(u.avatar_path, media_type=u.avatar_content_type or "image/jpeg",
                        content_disposition_type="inline")


@router.post("/me/intro-video", status_code=201)
def upload_intro_video(file: UploadFile = File(...), user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    try:
        path, _ = save_generic(f"users/user_{user.id}", file, settings.max_video_bytes)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    _replace(user.intro_video_path)
    user.intro_video_path, user.intro_video_content_type = path, file.content_type
    db.commit()
    return {"intro_video_url": f"/users/{user.id}/intro-video"}


@router.get("/users/{user_id}/intro-video")
def get_intro_video(user_id: int, db: Session = Depends(get_db)):
    u = db.get(User, user_id)
    if u is None or not u.intro_video_path or not os.path.exists(u.intro_video_path):
        raise HTTPException(status_code=404, detail="No intro video")
    return FileResponse(u.intro_video_path, media_type=u.intro_video_content_type or "video/mp4")
