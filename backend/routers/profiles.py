"""User profile media: account avatar + profile intro video.

Uploaded from My Account; served publicly so anyone viewing a profile sees them.
Stored via backend.storage, so these live in R2 (durable) when configured.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..deps import get_current_user
from ..models import ProfileAsset, User
from ..storage import delete_stored, save_generic, serve_stored, stored_exists

router = APIRouter(tags=["profiles"])

IMG_MAX = 50 * 1024 * 1024  # generous cap for profile pictures


def asset_dict(a: ProfileAsset) -> dict:
    ct = a.content_type or ""
    return {
        "id": a.id, "title": a.title or "file",
        "url": f"/users/{a.user_id}/assets/{a.id}/file",
        "is_image": ct.startswith("image/"),
        "content_type": ct,
    }


def _replace(old_path):
    """Remove the previously stored object/file, wherever it lived."""
    delete_stored(old_path)


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
    if u is None or not u.avatar_path or not stored_exists(u.avatar_path):
        raise HTTPException(status_code=404, detail="No avatar")
    return serve_stored(u.avatar_path, u.avatar_content_type or "image/jpeg")


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
    if u is None or not u.intro_video_path or not stored_exists(u.intro_video_path):
        raise HTTPException(status_code=404, detail="No intro video")
    return serve_stored(u.intro_video_path, u.intro_video_content_type or "video/mp4")


# ---------------- "Who we are": about text, links, and files/images ----------------

class ProfileIn(BaseModel):
    about_text: Optional[str] = Field(default=None, max_length=5000)
    links: Optional[List[dict]] = None      # [{label, url}, …] — no cap


@router.post("/me/profile")
def update_profile(body: ProfileIn, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    if body.about_text is not None:
        user.about_text = body.about_text.strip() or None
    if body.links is not None:
        clean = []
        for l in body.links:
            url = (l.get("url") or "").strip()
            if url:
                clean.append({"label": (l.get("label") or "").strip() or url, "url": url})
        user.links = clean
    db.commit()
    return {"about_text": user.about_text or "", "links": user.links or []}


@router.post("/me/assets", status_code=201)
def add_asset(file: UploadFile = File(...), title: Optional[str] = Form(None),
              user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        path, _ = save_generic(f"users/user_{user.id}/assets", file, IMG_MAX)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    a = ProfileAsset(user_id=user.id, title=(title or file.filename), path=path,
                     content_type=file.content_type)
    db.add(a)
    db.commit()
    db.refresh(a)
    return asset_dict(a)


@router.delete("/me/assets/{asset_id}")
def delete_asset(asset_id: int, user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    a = db.get(ProfileAsset, asset_id)
    if a is None or a.user_id != user.id:
        raise HTTPException(status_code=404, detail="Asset not found")
    _replace(a.path)
    db.delete(a)
    db.commit()
    return {"deleted": asset_id}


@router.get("/users/{user_id}/assets/{asset_id}/file")
def get_asset_file(user_id: int, asset_id: int, db: Session = Depends(get_db)):
    a = db.get(ProfileAsset, asset_id)
    if a is None or a.user_id != user_id or not stored_exists(a.path):
        raise HTTPException(status_code=404, detail="Asset not found")
    return serve_stored(a.path, a.content_type or "application/octet-stream")
