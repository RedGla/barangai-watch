# BarangAI Supabase setup — 21 October 2026

The user explicitly approved applying the prepared application migrations and creating a private incident-photos bucket. Both actions completed in the BarangAI Free project, reference `ctwdmiczjdyeiwlxynab`, Singapore. No public website deployment, Git publication, paid upgrade or model change occurred.

## Verified live

- The previously empty public schema now has Alembic revision `0005` and nine tables: users, sessions, reports, report_events, staff_actions, duplicate_suggestions, notifications, alembic_version and oauth_identities.
- Every table has row-level security enabled; there are zero application client policies.
- `incident-photos` exists with `public=false`. No custom file-size or MIME restrictions were added; existing application validation remains unchanged. No Storage object policies were added.
- Database client connects through the dashboard-confirmed session pooler using TLS 1.3, `verify-full`, the official Supabase CA and hostname validation. The pooler-to-database `pg_stat_ssl` fields are not evidence of client TLS; client SSL attributes were checked separately.
- Actual anon/authenticated PostgreSQL roles see zero user rows. The anonymous Data API request returns an empty array. The database is empty, so these checks alone do not prove access denial against populated records; RLS configuration is verified and local populated-database privacy tests passed separately.

Evidence: `artifacts/live-supabase-2026-10-20/database-verified-2026-10-21.json`, `migration-preview.sql`, and `private-bucket.png`. The artifact directory retains its session-start date. Credentials were supplied to hidden prompts and were not written into source, configuration or evidence files.

## Remaining work

The user subsequently approved proceeding with the existing server key in memory. Live integration proof passed using the local API TestClient connected to real Supabase PostgreSQL and Storage:

- JPEG, PNG and WebP preview/submission, rotated and metadata-stripped private downloads, and manual category fallback without AI.
- Corrupt and oversized image rejection; Pending reports retain separate resident/model/staff category fields.
- Logout returns 204 and subsequent image access returns 401; another resident receives 404 for the report and photo.
- A new app session reloads all three reports and Storage photos.
- Direct public downloads, publishable-key downloads/uploads and anonymous report Data API access are denied. Actual anon/authenticated database roles cannot read the populated synthetic reports.
- Only this run's synthetic reports, users, sessions, events and Storage photos were removed. No existing records were changed. Passwords and API secrets stayed in process memory; the process exited after cleanup.

Evidence: `artifacts/live-supabase-2026-10-20/live-upload-verified-2026-10-21.json` reports `passed` and successful cleanup. A key-transfer attempt failed before tests started because a dashboard banner obstructed the copy/reveal controls; it created no data. The successful transfer encrypted the key before passing it between local processes and did not print its plaintext.

The live Security Advisor showed **0 errors, 0 warnings, 9 informational notices**. All nine notices are `RLS Enabled No Policy`, matching the intentional server-only architecture. No permissive policies were added to silence these notices.

The local presentation launcher still uses SQLite and local private media; this verification did not permanently configure a cloud-backed app or publish a site. Hosted HTTPS, physical-phone acceptance and cross-service outage recovery remain pending. Supabase Auth sessions were not used: residents sign in through the application's own session system; actual database client-role isolation was tested separately.

An initial attempt to add bucket size/MIME restrictions was blocked by automatic approval review. The bucket was instead created with the approved private setting and default upload settings. No restricted bucket was created.
