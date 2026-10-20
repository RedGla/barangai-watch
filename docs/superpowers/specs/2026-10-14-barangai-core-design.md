# BarangAI Watch core design

## Intent and authority

Build a presentation-ready academic demo for one Philippine barangay. Residents submit photographed, located concerns. Barangay staff verify and manage them. Residents track their own reports and receive bilingual guidance. The attached chapters define purpose and workflows. The pasted build brief defines the approved stack and P0/P1 scope. The user's direct AGENTS.md rules control repository actions. The later user-approved hosting choice is Render Free plus Supabase Free; mobile camera and gallery uploads are required. See [current feature status](../../feature-status.md) and [verification evidence](../../verification-2026-10-20.md). Presentation readiness does not imply measured model quality or certified live municipal operation.

## Scope and order

P0: resident credentials, report submission with private image and map location, separate model/resident/staff categories, AI inference with uncertainty, report history, server-side roles and transitions, staff action/coordination log, duplicate suggestions with human decision, grounded chatbot tracking with safe fallback, security checks. Five research classes: flooding, potholes, fallen trees, uncollected garbage, damaged signage. Residents may manually select a class when prediction is uncertain or unavailable.

P1 after P0: Google sign-in, bilingual interface, operations dashboard, in-app notifications. P2: visual polish.

First vertical slice: register/login, upload and select location/category, submit, view own report, staff verify and change status, inspect audit history. A clearly labeled unavailable inference state is acceptable during development; real trained inference is required for P0 completion.

## Architecture

- `apps/web`: React, TypeScript, Vite, Tailwind, shadcn/ui primitives, Lucide, Leaflet. Mobile-first resident and staff routes. Browser geolocation needs an HTTPS or localhost context and always has a manual pin fallback.
- `apps/api`: FastAPI with SQLAlchemy/PostgreSQL. API owns all authorization, report state changes, media access, duplicate decisions, and chatbot report lookup. Browser never gets database or private storage credentials.
- `ml`: isolated PyTorch training/evaluation/inference artifacts. The API loads an explicitly versioned validated model only after metrics and resource benchmarks exist. Until then it returns `prediction_available: false` and requires resident manual category.
- Database schema: users, sessions, reports, report_events, staff_actions, duplicate_suggestions. IDs are opaque UUIDs. Report stores separate `model_category`, `resident_category`, `verified_category`.
- Private media adapter: local private directory for development; managed private object storage in cloud. Decode and re-encode image to strip metadata, cap size and pixels, check format. Authorized API route streams image. Deletion removes media and data under documented procedure.
- Chat: deterministic report lookup scoped to current resident. LLM receives only curated guidance context and limited tool output when a free, nonbilling provider is configured; otherwise a clear deterministic fallback. No arbitrary SQL or raw resident record access.

## API contracts

- `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`: opaque cookie session; registration creates residents only. Staff/admin are provisioned out of band.
- `POST /reports`: multipart image, optional description, latitude, longitude, resident category. API validates input, stores sanitized image, creates Pending report and first event atomically.
- `GET /reports`, `GET /reports/{id}`, `GET /reports/{id}/image`: own reports for residents; all reports for staff/admin. Never expose another resident's private report to residents.
- `POST /reports/{id}/status`: staff/admin only. Enforce exact transition graph and record actor, timestamp, note. Accepted requires staff verified category.
- `POST /reports/{id}/actions`: staff/admin action or external coordination record; no automatic external transmission.
- `GET /reports/{id}/duplicates`, `POST /duplicates/{id}/decision`: staff/admin only; candidates use category, distance, image embeddings when model is available; a suggestion is never an automatic merge.
- `POST /chat`: localized guidance and authorized lookup. No invented status; unavailable LLM returns explicit fallback.

## Security and failure behavior

Argon2id password hashes; random opaque session tokens stored hashed in DB; HttpOnly, Secure in production, SameSite=Lax cookies. CSRF protection on cookie-authenticated mutations. Rate-limit registration, login, upload, and chat. Keep CORS to configured origin. Strip EXIF/GPS metadata before private storage. Restrict image bytes, dimensions, format, and response access. Audit staff state changes and duplicate decisions. Do not log passwords, tokens, or images. Missing model and LLM fail into clear manual/deterministic paths. Deployed images must never use a public bucket.

## Validation

API unit/integration tests cover ownership, role restrictions, transitions, audit, upload validation, and fallbacks. Browser end-to-end tests cover resident-to-verification flow. ML work records source/license, split strategy, per-class metrics, confusion matrices, latency, and model size; no metric is claimed until measured. Deployment gets real HTTPS smoke tests and a documented monthly cost check.

## Open external dependencies

GitHub, hosting, private object storage, a licensed five-class dataset including local imagery, and any LLM provider require verified availability or account access. Their absence does not block local workflow development. A public deployment and validated model remain incomplete until measured and connected.
