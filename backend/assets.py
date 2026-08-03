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
import os
import re

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


def render_index(root: str) -> str:
    with open(os.path.join(root, "index.html"), "r", encoding="utf-8") as fh:
        return versioned_html(fh.read(), root)
