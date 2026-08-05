# Production environment status (Render)

You cannot see the live Render dashboard or its environment variables directly. Your local `.env` and local dev setup are NOT the same as production — do not infer production's state from what you see locally. The following have been independently verified against the actual live Render deployment (not just the code) and are confirmed working as of this writing. **Do not flag these as "still outstanding" or "needs configuring" in status summaries** unless you have specific, fresh evidence of an actual failure reproduced against the real production URL (e.g. a live request that actually 401s/500s there) — not just an assumption based on local config.

- **`DATABASE_URL`** — set correctly on Render with the current (rotated) Neon password. Confirmed working; the live app runs on it daily.
- **`R2_*` vars (all four)** — set correctly on Render. Confirmed via a real durability test (survived a redeploy) and real file uploads/downloads in production.
- **`RESEND_API_KEY`** — set correctly on Render with a valid, working key. Confirmed via real delivered emails (welcome email, password reset, support ticket alerts) reaching real inboxes including Gmail and iCloud. Your local `.env` may have an old/rotated-out key that 401s — that's expected and local-only, it does not reflect production.
- **`MAIL_FROM`** — correctly set to an address on the verified `usepromoslot.com` domain (not the Resend sandbox default). Confirmed via real delivered email headers.
- **Database migrations** — Render's build command runs `alembic upgrade head` automatically on every deploy. Any migration you commit and push will be applied automatically; there is no separate manual step. Don't describe a migration as "still outstanding" just because you can't see Render's live migration state — if it was pushed, it ran.
- **`SUPPORT_EMAIL`** — set correctly, points to the real `support@usepromoslot.com` inbox (Google Workspace).

If something in this list ever appears to actually be broken in production (not just locally), say so clearly and explain what you observed — don't silently assume this file is wrong, but don't repeat the generic warning either without real evidence.
