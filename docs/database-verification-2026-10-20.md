# Local PostgreSQL and photo-upload verification

Completed 20 October 2026 with Docker PostgreSQL 16 and synthetic data. The temporary container and its database were removed after verification. Existing application databases, reports and servers were not changed.

## Passed

- Applied migrations through `0003`, inserted a synthetic legacy user, then upgraded to `0005`. The legacy row survived; repeating the head migration succeeded.
- Used a non-superuser table owner with no RLS bypass privilege for the API connection.
- All nine application/migration tables have RLS enabled and no client policies.
- Local roles named `anon` and `authenticated` could read no rows from any table, update/delete no existing user, and could not insert a user, even with explicit table grants. These are simulated local client roles, not Supabase sessions.
- An authenticated resident previewed and submitted actual multipart JPEG, PNG and WebP images through the API backed by PostgreSQL. Each report remained Pending, with resident category separate from empty model and staff categories. Manual reporting worked without AI.
- Uploaded images were rotated according to EXIF, re-encoded with empty EXIF, and served with `private, no-store`. Invalid image bytes added no report or image.
- Logged-out image requests returned 401; another resident's report and image requests returned 404.
- Restarted PostgreSQL and reopened the app; all three reports and their private photos remained accessible to their owner. Photos used a separate local temporary media directory, not container storage. This proves database restart persistence, not a host disk failure or cloud backup recovery.
- All 18 website tests passed, including gallery/camera input submission, photo preview selection, unsupported/oversized-photo guidance and separate map lifecycle tests. The general interface tests now mock Leaflet; dedicated map tests retain map lifecycle coverage. This fixes delayed test imports without changing application behavior.

## Reproduce

With Docker running and the project's API/test dependencies installed:

```powershell
.venv/Scripts/python.exe deploy/verify-local-postgres.py
```

The script uses the official `postgres:16` image, generates temporary passwords in memory, binds a randomly assigned port only on `127.0.0.1`, ignores inherited database settings, and removes only its own uniquely named container. Docker may assign a different host port after restart; the verifier discovers the new port before reconnecting. Never point these synthetic checks at a real resident database.

Private machine-readable evidence: `artifacts/database-verification-2026-10-20/results.json`. Website proof command: `npm test` from `apps/web`, 18/18 passed with no unhandled errors.

## Still pending

Supabase TLS, actual provider roles/Data API, private bucket policies, hosted upload/download/logout checks and cross-service failure recovery require the intended test project. Physical Android/iPhone camera, gallery and GPS require real devices and a trusted reachable HTTPS origin. This local proof does not establish those results, hosting feasibility, human language quality or user-study outcomes. The existing local demo still uses its SQLite database; this verification did not switch it to PostgreSQL.
