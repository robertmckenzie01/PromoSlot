"""Platform-owner listings: create + browse.

Serializers return objects shaped like the front end's listing objects so the UI
can render real data unchanged. Ratings are derived purely from real reviews of
the owner (a brand-new listing has no rating).
"""
import os
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..deps import get_current_user
from ..models import Platform, PlatformMedia, Review, User
from ..storage import save_generic, save_media_file

router = APIRouter(prefix="/platforms", tags=["platforms"])

ALLOWED_VIDEO = {"video/mp4", "video/webm", "video/quicktime"}


class PlatformCreateIn(BaseModel):
    name: str
    platform_type: str
    handle: Optional[str] = None
    brand: Optional[str] = None
    bio: Optional[str] = None
    niches: List[str] = Field(default_factory=list)
    audience: int = 0
    avg_views: int = 0
    impressions: int = 0
    engagement_rate: float = 0            # percent, e.g. 7.4
    countries: List[str] = Field(default_factory=list)
    ages: List[str] = Field(default_factory=list)
    interests: List[str] = Field(default_factory=list)
    services: List[str] = Field(default_factory=list)
    pricing: List[dict] = Field(default_factory=list)


def _owner_rating(db: Session, owner_id: int):
    count, avg = (db.query(func.count(Review.id), func.avg(Review.rating))
                  .filter(Review.reviewee_id == owner_id).one())
    return (round(float(avg), 1) if avg is not None else None), (count or 0)


def listing_dict(db: Session, p: Platform) -> dict:
    owner = db.get(User, p.owner_id)
    rating, review_count = _owner_rating(db, p.owner_id)
    meta = p.meta or {}
    return {
        "id": f"p{p.id}",
        "ownerId": str(p.owner_id),
        "owner": owner.display_name if owner else "",
        "brand": p.brand or (owner.display_name if owner else ""),
        "name": p.name,
        "handle": p.handle or "",
        "platform": p.platform_type,
        "niches": p.niches or [],
        "bio": p.bio or "",
        "audience": p.audience or 0,
        "avgViews": p.avg_views or 0,
        "impressions": p.impressions or 0,
        "er": (p.engagement_rate or 0) / 100.0,
        "countries": meta.get("countries", []),
        "ages": meta.get("ages", []),
        "interests": meta.get("interests", []),
        "rating": rating,
        "reviewCount": review_count,
        "verified": p.verified,
        "services": p.services or [],
        "pricing": p.pricing or [],
        "past": [],
        # Defaults to the owner's profile picture until a listing-specific one is set.
        "image_url": (f"/platforms/{p.id}/image" if p.image_path
                      else (f"/users/{p.owner_id}/avatar" if (owner and owner.avatar_path) else None)),
        "has_own_image": bool(p.image_path),
        "ownerAvatar": f"/users/{p.owner_id}/avatar" if (owner and owner.avatar_path) else None,
    }


@router.post("", status_code=201)
def create_platform(body: PlatformCreateIn, user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    if not user.is_platform_owner:
        raise HTTPException(status_code=403, detail="Only platform owners can list a platform")
    p = Platform(
        owner_id=user.id,
        brand=body.brand or user.display_name,
        name=body.name,
        platform_type=body.platform_type,
        handle=body.handle,
        bio=body.bio,
        niches=body.niches,
        audience=body.audience,
        avg_views=body.avg_views,
        impressions=body.impressions,
        engagement_rate=round(body.engagement_rate * 100),
        services=body.services,
        pricing=body.pricing,
        meta={"countries": body.countries, "ages": body.ages, "interests": body.interests},
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return listing_dict(db, p)


@router.get("")
def browse_platforms(db: Session = Depends(get_db)):
    rows = db.query(Platform).order_by(Platform.id.desc()).all()
    return [listing_dict(db, p) for p in rows]


@router.get("/mine")
def my_platforms(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(Platform).filter_by(owner_id=user.id).order_by(Platform.id.desc()).all()
    return [listing_dict(db, p) for p in rows]


@router.get("/{platform_id:int}")
def get_platform(platform_id: int, db: Session = Depends(get_db)):
    p = db.get(Platform, platform_id)
    if p is None:
        raise HTTPException(status_code=404, detail="Platform not found")
    return listing_dict(db, p)


# -------------------- Platform media (My Work + Past campaigns) --------------------

def media_dict(m: PlatformMedia) -> dict:
    return {
        "id": m.id,
        "platform_id": m.platform_id,
        "kind": m.kind,
        "title": m.title or "",
        "brand": m.brand or "",
        "stat": m.stat or "",
        "has_video": bool(m.video_path),
        "video_url": f"/platforms/{m.platform_id}/media/{m.id}/video" if m.video_path else None,
        # Link-based work samples (external content + its own cover image).
        "link_url": m.link_url or None,
        "has_cover": bool(m.cover_path),
        "cover_url": f"/platforms/{m.platform_id}/media/{m.id}/cover" if m.cover_path else None,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


def _own_platform(db: Session, platform_id: int, user: User) -> Platform:
    p = db.get(Platform, platform_id)
    if p is None:
        raise HTTPException(status_code=404, detail="Platform not found")
    if p.owner_id != user.id:
        raise HTTPException(status_code=403, detail="You don't own this listing")
    return p


@router.get("/{platform_id:int}/media")
def list_media(platform_id: int, kind: Optional[str] = None, db: Session = Depends(get_db)):
    """Public: a listing's portfolio ('work') and/or past-campaign entries."""
    q = db.query(PlatformMedia).filter_by(platform_id=platform_id)
    if kind:
        q = q.filter_by(kind=kind)
    return [media_dict(m) for m in q.order_by(PlatformMedia.id.desc()).all()]


# Cover images carry no size/type restriction (owner-chosen thumbnails).
_COVER_MAX_BYTES = 2 * 1024 * 1024 * 1024


@router.post("/{platform_id:int}/media", status_code=201)
def add_media(
    platform_id: int,
    kind: str = Form(...),
    title: Optional[str] = Form(None),
    brand: Optional[str] = Form(None),
    stat: Optional[str] = Form(None),
    link_url: Optional[str] = Form(None),
    video: Optional[UploadFile] = File(None),
    cover: Optional[UploadFile] = File(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    p = _own_platform(db, platform_id, user)
    if kind not in ("work", "past_campaign"):
        raise HTTPException(status_code=422, detail="kind must be 'work' or 'past_campaign'")

    has_video = video is not None and (video.filename or "") != ""
    has_link = bool(link_url and link_url.strip())
    has_cover = cover is not None and (cover.filename or "") != ""
    # A work sample is either an uploaded video OR an external link.
    if kind == "work" and not (has_video or has_link):
        raise HTTPException(status_code=422, detail="A work sample needs a video or a link")

    video_path = content_type = original_filename = None
    if has_video:
        if video.content_type not in ALLOWED_VIDEO:
            raise HTTPException(status_code=415, detail=f"Unsupported video type: {video.content_type}")
        try:
            video_path, _size = save_media_file(p.id, video, settings.max_video_bytes)
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))
        content_type = video.content_type
        original_filename = video.filename

    cover_path = cover_content_type = None
    if has_cover:  # any type, no size restriction
        try:
            cover_path, _cs = save_media_file(p.id, cover, _COVER_MAX_BYTES)
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))
        cover_content_type = cover.content_type

    m = PlatformMedia(platform_id=p.id, owner_id=user.id, kind=kind, title=title,
                      brand=brand, stat=stat, video_path=video_path,
                      content_type=content_type, original_filename=original_filename,
                      link_url=link_url.strip() if has_link else None,
                      cover_path=cover_path, cover_content_type=cover_content_type)
    db.add(m)
    db.commit()
    db.refresh(m)
    return media_dict(m)


@router.get("/{platform_id:int}/media/{media_id:int}/video")
def get_media_video(platform_id: int, media_id: int, db: Session = Depends(get_db)):
    m = db.get(PlatformMedia, media_id)
    if m is None or m.platform_id != platform_id or not m.video_path or not os.path.exists(m.video_path):
        raise HTTPException(status_code=404, detail="Video not found")
    # Public showcase. NOTE: dev serves via FileResponse (limited range/seeking);
    # production moves to object storage + CDN/signed URLs with range support —
    # migrated together with proof-of-delivery storage.
    return FileResponse(m.video_path, media_type=m.content_type or "video/mp4")


@router.get("/{platform_id:int}/media/{media_id:int}/cover")
def get_media_cover(platform_id: int, media_id: int, db: Session = Depends(get_db)):
    m = db.get(PlatformMedia, media_id)
    if m is None or m.platform_id != platform_id or not m.cover_path or not os.path.exists(m.cover_path):
        raise HTTPException(status_code=404, detail="Cover not found")
    return FileResponse(m.cover_path, media_type=m.cover_content_type or "image/jpeg",
                        content_disposition_type="inline")


@router.post("/{platform_id:int}/image", status_code=201)
def upload_platform_image(platform_id: int, file: UploadFile = File(...),
                          user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = _own_platform(db, platform_id, user)
    try:
        path, _ = save_generic(f"platform_img/platform_{p.id}", file, _COVER_MAX_BYTES)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    if p.image_path and os.path.exists(p.image_path):
        try:
            os.remove(p.image_path)
        except OSError:
            pass
    p.image_path, p.image_content_type = path, file.content_type
    db.commit()
    return {"image_url": f"/platforms/{p.id}/image"}


@router.get("/{platform_id:int}/image")
def get_platform_image(platform_id: int, db: Session = Depends(get_db)):
    p = db.get(Platform, platform_id)
    if p is None or not p.image_path or not os.path.exists(p.image_path):
        raise HTTPException(status_code=404, detail="No image")
    return FileResponse(p.image_path, media_type=p.image_content_type or "image/jpeg",
                        content_disposition_type="inline")


@router.delete("/{platform_id:int}/media/{media_id:int}")
def delete_media(platform_id: int, media_id: int, user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    _own_platform(db, platform_id, user)
    m = db.get(PlatformMedia, media_id)
    if m is None or m.platform_id != platform_id:
        raise HTTPException(status_code=404, detail="Media not found")
    for path in (m.video_path, m.cover_path):
        if path and os.path.exists(path):
            try:
                os.remove(path)
            except OSError:
                pass
    db.delete(m)
    db.commit()
    return {"deleted": media_id}
