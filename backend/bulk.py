"""Batch lookups for list serializers.

The list endpoints used to serialize row-by-row, and each row re-queried the
same three things: the owning user, that user's review aggregate, and a count
of related deals. On SQLite that is invisible; against a networked Postgres
every one of those is a round-trip, so a 140-row page cost hundreds of them.

A Ctx is built once per request with three grouped queries, then handed to the
serializer. Passing ctx=None keeps the old per-row behaviour, so the endpoints
that serialize a single row (create, update, get-one) are unchanged.
"""
from typing import Dict, Iterable, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from .models import Campaign, Deal, DealStatus, Platform, Review, User


class Ctx:
    """Pre-resolved lookups shared by every row in one response."""

    __slots__ = ("users", "ratings", "campaign_applicants", "platform_deals")

    def __init__(self):
        self.users: Dict[int, User] = {}
        self.ratings: Dict[int, tuple] = {}            # user_id -> (avg, count)
        self.campaign_applicants: Dict[int, int] = {}
        self.platform_deals: Dict[int, int] = {}

    def user(self, uid, db: Session):
        if uid not in self.users:                       # single-row fallback
            self.users[uid] = db.get(User, uid)
        return self.users[uid]

    def rating(self, uid, db: Session):
        if uid not in self.ratings:
            count, avg = (db.query(func.count(Review.id), func.avg(Review.rating))
                          .filter(Review.reviewee_id == uid).one())
            self.ratings[uid] = ((round(float(avg), 1) if avg is not None else None),
                                 (count or 0))
        return self.ratings[uid]


def load_users(db: Session, ctx: Ctx, ids: Iterable[int]) -> None:
    want = {i for i in ids if i is not None and i not in ctx.users}
    if not want:
        return
    for u in db.query(User).filter(User.id.in_(want)).all():
        ctx.users[u.id] = u
    for i in want:                                      # remember misses too
        ctx.users.setdefault(i, None)


def load_ratings(db: Session, ctx: Ctx, ids: Iterable[int]) -> None:
    want = {i for i in ids if i is not None and i not in ctx.ratings}
    if not want:
        return
    rows = (db.query(Review.reviewee_id, func.count(Review.id), func.avg(Review.rating))
            .filter(Review.reviewee_id.in_(want))
            .group_by(Review.reviewee_id).all())
    for uid, count, avg in rows:
        ctx.ratings[uid] = ((round(float(avg), 1) if avg is not None else None), (count or 0))
    for i in want:                                      # no reviews yet -> no rating
        ctx.ratings.setdefault(i, (None, 0))


def load_campaign_applicants(db: Session, ctx: Ctx, campaign_ids: Iterable[int]) -> None:
    want = {i for i in campaign_ids if i is not None}
    if not want:
        return
    rows = (db.query(Deal.campaign_id, func.count(Deal.id))
            .filter(Deal.campaign_id.in_(want), Deal.status != DealStatus.CANCELLED)
            .group_by(Deal.campaign_id).all())
    for cid, n in rows:
        ctx.campaign_applicants[cid] = n or 0
    for i in want:
        ctx.campaign_applicants.setdefault(i, 0)


def for_listings(db: Session, rows) -> Ctx:
    ctx = Ctx()
    owner_ids = [p.owner_id for p in rows]
    load_users(db, ctx, owner_ids)
    load_ratings(db, ctx, owner_ids)
    return ctx


def for_campaigns(db: Session, rows) -> Ctx:
    ctx = Ctx()
    biz_ids = [c.business_id for c in rows]
    load_users(db, ctx, biz_ids)
    load_ratings(db, ctx, biz_ids)
    load_campaign_applicants(db, ctx, [c.id for c in rows])
    return ctx


def applicants_for(ctx: Optional[Ctx], db: Session, campaign_id: int) -> int:
    if ctx is not None and campaign_id in ctx.campaign_applicants:
        return ctx.campaign_applicants[campaign_id]
    return (db.query(func.count(Deal.id))
            .filter(Deal.campaign_id == campaign_id,
                    Deal.status != DealStatus.CANCELLED)
            .scalar() or 0)
