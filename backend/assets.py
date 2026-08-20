"""Content-hashed asset URLs for index.html.

There is no build step in this project, so index.html carried a hand-written
`?v=N` on its script tags. That only worked while someone remembered to bump it;
forgetting it leaves browsers running the previous deploy's JavaScript from
cache, which is exactly what happened once already.

This computes the version instead. Each local script src gets `?v=<sha256 prefix
of the file's bytes>` injected when index.html is served, so the URL changes if
and only if the file's contents change. Nothing to remember, and no rename or
build artifact on disk — the source file keeps plain `src="api.js"`.

The hash is cached against (mtime_ns, size) so a normal request does no hashing
at all, while an edited file is picked up immediately without a restart.
"""
import hashlib
import html as _html
import os
import re

from .config import settings

# src="foo.js" / src='foo.js' — only local paths, and any existing query is
# replaced so a stale hand-written ?v= cannot survive.
_SCRIPT_SRC = re.compile(r'(<script\b[^>]*\bsrc=")([^"]+)(")', re.IGNORECASE)

_cache = {}          # abs path -> (mtime_ns, size, hash)


def file_version(path: str) -> str:
    """Short content hash for one file, or "" if it cannot be read."""
    try:
        st = os.stat(path)
    except OSError:
        return ""
    key = (st.st_mtime_ns, st.st_size)
    hit = _cache.get(path)
    if hit and hit[0] == key:
        return hit[1]
    h = hashlib.sha256()
    try:
        with open(path, "rb") as fh:
            for chunk in iter(lambda: fh.read(65536), b""):
                h.update(chunk)
    except OSError:
        return ""
    digest = h.hexdigest()[:12]
    _cache[path] = (key, digest)
    return digest


def _is_local(src: str) -> bool:
    return not (src.startswith("http://") or src.startswith("https://")
                or src.startswith("//") or src.startswith("data:"))


def versioned_html(html: str, root: str) -> str:
    """Rewrite every local <script src> in `html` to carry its content hash."""
    def sub(m):
        prefix, src, suffix = m.group(1), m.group(2), m.group(3)
        if not _is_local(src):
            return m.group(0)
        bare = src.split("?", 1)[0].split("#", 1)[0]
        rel = bare[2:] if bare.startswith("./") else bare.lstrip("/")
        v = file_version(os.path.join(root, rel))
        if not v:
            return m.group(0)               # unknown file — leave it exactly as-is
        return f"{prefix}{bare}?v={v}{suffix}"
    return _SCRIPT_SRC.sub(sub, html)


# ----------------------------------------------------------------------
# Per-page <title>/description/canonical/social tags.
#
# The real app is a single-page app with client-side routing that never
# touched the URL bar, so every "page" — marketplace, pricing, about, all
# of it — only ever existed at "/". A crawler (or a person refreshing a
# deep link) had exactly one indexable, shareable URL for the entire site.
# main.py now serves these same public/marketing routes at their own real
# paths, and this table is what makes each one worth crawling on its own:
# a distinct, accurate title and description injected server-side, so it's
# present in the raw HTML response with no dependency on JavaScript ever
# running (the app's own boot sequence fetches React from a CDN and can be
# slow or fail — meta tags must not ride on that).
#
# Keys are the URL path with no leading/trailing slash; "" is home. Keep
# this in sync with main.py's PUBLIC_PAGES and with the real on-page copy
# each route renders — these are meant to describe what's actually there,
# not invent separate marketing copy.
PAGE_META = {
    "": {
        "title": "PromoSlot — Brands buy traction. Platform owners monetise their reach.",
        "description": "PromoSlot brings businesses and platform owners together around "
                       "clear deliverables, funded agreements and documented delivery. "
                       "No subscription, no listing fee — funds are held until delivery "
                       "is verified.",
    },
    "marketplace": {
        "title": "Marketplace — PromoSlot",
        "description": "Browse platform listings and business campaigns on PromoSlot. "
                       "Find audiences, find paid opportunities — every deal covered by "
                       "Payment Protection.",
    },
    "how-it-works": {
        "title": "How it works — PromoSlot",
        "description": "From agreement to payout, every step stays clear. Set the terms, "
                       "fund the deal and follow delivery, evidence and payment in one "
                       "place.",
    },
    "pricing": {
        "title": "Pricing — PromoSlot",
        "description": "No subscription. No listing fee. See exactly what you'll fund or "
                       "receive before a deal begins.",
    },
    "payment-protection": {
        "title": "Payment Protection — PromoSlot",
        "description": "Funds are held from the moment a deal is agreed, and only "
                       "released once a reviewer has checked the submitted evidence "
                       "against the accepted terms.",
    },
    "resources": {
        "title": "Resources — PromoSlot",
        "description": "A growing library of practical guidance on choosing platforms, "
                       "agreeing deliverables, payment models and evidence.",
    },
    "about": {
        "title": "About — PromoSlot",
        "description": "Promotion is becoming a marketplace, not a favor economy — the "
                       "direct line between businesses and the people who move "
                       "audiences, with no agency in between.",
    },
}


def _meta_html(path: str) -> str:
    key = path.strip("/")
    meta = PAGE_META.get(key, PAGE_META[""])
    title = _html.escape(meta["title"])
    desc = _html.escape(meta["description"])
    base = settings.app_base_url.rstrip("/")
    canonical = base if not key else f"{base}/{key}"
    # Placeholder until a purpose-built 1200x630 share image exists — real,
    # on-brand photography rather than no image at all, which most social
    # platforms render worse than an imperfect one.
    og_image = f"{base}/img/signup-hero.jpg"
    return (
        f'<title>{title}</title>\n'
        f'<meta name="description" content="{desc}">\n'
        f'<link rel="canonical" href="{canonical}">\n'
        f'<meta property="og:type" content="website">\n'
        f'<meta property="og:site_name" content="PromoSlot">\n'
        f'<meta property="og:title" content="{title}">\n'
        f'<meta property="og:description" content="{desc}">\n'
        f'<meta property="og:url" content="{canonical}">\n'
        f'<meta property="og:image" content="{og_image}">\n'
        f'<meta name="twitter:card" content="summary_large_image">\n'
        f'<meta name="twitter:title" content="{title}">\n'
        f'<meta name="twitter:description" content="{desc}">\n'
        f'<meta name="twitter:image" content="{og_image}">\n'
    )


def render_index(root: str, path: str = "") -> str:
    with open(os.path.join(root, "index.html"), "r", encoding="utf-8") as fh:
        html = versioned_html(fh.read(), root)
    # Injected into the real <head> (not the dc/helmet element the rest of
    # the app's <title> lives in), so it's there unconditionally in the raw
    # response — a crawler gets it even if it never runs the page's JS.
    if "</head>" in html:
        html = html.replace("</head>", _meta_html(path) + "</head>", 1)
    return html
