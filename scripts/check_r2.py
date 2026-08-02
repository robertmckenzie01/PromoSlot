"""Prove object storage actually works — and that objects OUTLIVE the process.

    python scripts/check_r2.py            # full round-trip write/read/delete
    python scripts/check_r2.py --write    # write a durability marker, then stop
    python scripts/check_r2.py --verify   # read markers written by earlier runs

The --write / --verify pair is the redeploy test: write a marker before a
deploy, verify it after. A local disk on an ephemeral host loses it; R2 keeps it.
"""
import io
import sys
import time
import warnings

warnings.filterwarnings("ignore")
sys.path.insert(0, __file__.rsplit("/scripts/", 1)[0])

from backend.config import settings           # noqa: E402
from backend import storage                   # noqa: E402

MARKER_PREFIX = "durability-check/"


class _Fake:
    """Minimal stand-in for an UploadFile."""
    def __init__(self, name, data, ctype):
        self.filename, self.file, self.content_type = name, io.BytesIO(data), ctype


def banner():
    print(f"backend: {storage.backend_name()}")
    print(f"remote (durable across redeploys): {storage.remote_enabled()}")
    if not storage.remote_enabled():
        print("\n!! Local disk is EPHEMERAL on Render — uploads die on each deploy.")
        print("   Set R2_ENDPOINT_URL, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET.")
    print()


def write_marker():
    stamp = time.strftime("%Y-%m-%dT%H:%M:%S")
    payload = f"PromoSlot durability marker written at {stamp}\n".encode()
    ref, size = storage.save_upload(MARKER_PREFIX.rstrip("/"),
                                    _Fake(f"marker-{int(time.time())}.txt", payload,
                                          "text/plain"),
                                    1024 * 1024)
    print(f"WROTE marker\n  ref:  {ref}\n  size: {size} bytes\n  at:   {stamp}")
    return ref


def verify_markers():
    """List every marker still present — these are what survived."""
    if not storage.remote_enabled():
        import os
        folder = os.path.join(settings.storage_dir, MARKER_PREFIX.rstrip("/"))
        found = sorted(os.listdir(folder)) if os.path.isdir(folder) else []
        print(f"markers on local disk: {len(found)}")
        for f in found:
            print("  -", f)
        return found
    s3 = storage._s3()
    resp = s3.list_objects_v2(Bucket=settings.r2_bucket, Prefix=MARKER_PREFIX)
    items = resp.get("Contents", [])
    print(f"markers in bucket '{settings.r2_bucket}': {len(items)}")
    for o in items:
        body = s3.get_object(Bucket=settings.r2_bucket, Key=o["Key"])["Body"].read()
        print(f"  - {o['Key']}  ({o['Size']} bytes)  {body.decode(errors='replace').strip()}")
    return items


def round_trip():
    """Write, read back, compare bytes, then clean up."""
    data = b"promoslot round-trip " + str(time.time()).encode()
    ref, size = storage.save_upload("durability-check/roundtrip",
                                    _Fake("roundtrip.txt", data, "text/plain"),
                                    1024 * 1024)
    print(f"1. wrote      -> {ref} ({size} bytes)")

    exists = storage.stored_exists(ref)
    print(f"2. exists     -> {exists}")

    got = storage.open_stream(ref).read()
    match = got == data
    print(f"3. read back  -> {len(got)} bytes, identical: {match}")

    if storage.remote_enabled():
        url = storage.presigned_url(ref, "text/plain")
        host = url.split("?")[0]
        print(f"4. signed URL -> {host[:80]}…  (expires in {settings.r2_url_ttl_seconds}s)")

    storage.delete_stored(ref)
    gone = not storage.stored_exists(ref)
    print(f"5. deleted    -> removed: {gone}")

    ok = exists and match and gone
    print("\nROUND TRIP:", "PASS" if ok else "FAIL")
    return ok


if __name__ == "__main__":
    banner()
    arg = sys.argv[1] if len(sys.argv) > 1 else ""
    if arg == "--write":
        write_marker()
    elif arg == "--verify":
        verify_markers()
    else:
        ok = round_trip()
        print()
        verify_markers()
        sys.exit(0 if ok else 1)
