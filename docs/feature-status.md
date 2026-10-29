# Feature status

Updated 28 October 2026 (Asia/Manila). Local verification does not imply cloud or physical-device validation.

| Priority | Capability | State |
| --- | --- | --- |
| P0 | Resident/password sessions, roles and ownership | Implemented and API tested. |
| P0 | Camera input and existing-photo uploads | Implemented; both submitted in the real local browser at phone-sized width. Physical camera check pending. |
| P0 | GPS, map pin and coordinates | Pin pre-filled from photo GPS, then phone GPS; street name via Nominatim; manual pin/coordinates remain. Tested in jsdom; physical-phone and hosted geocoder checks pending. |
| P0 | Private sanitized images | Local and live Supabase upload/download privacy checks passed, including metadata removal, logout and cross-resident denial. Mocked-provider outage tests remain separate evidence. |
| P0 | PostgreSQL migrations and photo persistence | Docker migration preservation/restart proof and live Supabase migration 0005/TLS/private Storage/client denial passed. Local API reload preserves live cloud reports/photos. Hosted application checks pending. |
| P0 | Staff verification, status workflow, actions and history | Implemented and tested. No automatic forwarding. |
| P0 | AI pre-fill and correction | Option C built and tested with mocked Cloudflare: vision model fills category, description and hazards; MobileCLIP2-S0 checker (ONNX, matches PyTorch exactly, ~70 ms locally) cross-checks and backs it up. Untuned prompts, uncalibrated 0.5 cutoff, no accuracy measured yet: run `apps/api/tools/evaluate_ai.py` on the group's verified datasets. Live Cloudflare call and Render timing unverified. |
| P0 | Duplicate review | Algorithm/decisions tested; uses checker embeddings (`mobileclip2-s0:effec85f7f21`). Similarity cutoff (0.85) not yet checked on real near-duplicate photos. Original reports preserved. |
| P0 | Hybrid chatbot and authorized tracking | Multilingual fallback and optional LLM adapter implemented/tested. Live optional provider unconfigured. |
| P0 | Administrator deletion | Authenticated dry-run, exact confirmation and receipts implemented/tested with synthetic records. Retention policy needs operator approval. |
| P1 | Resident Google sign-in | Implemented/tested; OAuth client and hosted callback check pending. |
| P1 | English/Filipino UI | Implemented; human language review pending. |
| P1 | Dashboard, filters, map and trend | Implemented and locally tested. |
| P1 | Notifications/read state | Implemented and tested. |
| P2 | Responsive presentation UI | Implemented; physical-device acceptance pending. |
| Delivery | Render/Supabase configuration and guides | Prepared; Git publication, provider setup and public HTTPS deployment pending. |
| Research | Reproducible commands and blank evaluation materials | Pilot/v3/v4 evidence saved privately; four v4 runs audited, 21 focused tests passed, selected preprocessing replay matched 44 predictions. Reserved 12-photo diagnostic completed; independent field evaluation and user study pending. |

Public application deployment, hosted end-to-end privacy checks, physical-phone smoke tests and independent model evaluation remain unfinished. Live Supabase API integration passed separately. Do not present manual categorization as measured AI performance or provider integration as public website deployment evidence.

Latest model evidence: [tree comparison and limitations](../ml/TRAINING-RESULTS-V4-2026-10-20.md). The four local tree photos show one storm event; 4/4 raw tree predictions are not broad reliability evidence and do not pass the demo confidence cutoff.

## Evidence

Synthetic data only. Raw evidence files live under the ignored `artifacts/` folder; superseded logs are in Git history before this file's 26 October update.

- **Local, 20 October:** 90 API, 18 web and 10 ML tests plus the production build passed. Real-browser smoke at 390×844 covered registration, gallery and camera-input uploads, the full staff status path, notifications, Filipino chat status and cross-resident photo denial (404).
- **Docker PostgreSQL 16, 20 October** (`deploy/verify-local-postgres.py`): migrations 0003→0005 preserve a legacy row; RLS denies simulated `anon`/`authenticated` roles; JPEG/PNG/WebP uploads are rotated, EXIF-stripped and owner-only; data persists across a DB restart.
- **Live Supabase, 21 October:** migration 0005 applied; nine RLS tables with no client policies; private `incident-photos` bucket; TLS 1.3 `verify-full`. The API passed live uploads, metadata removal, logout 401, other-resident 404 and public/publishable-key denial, then cleaned up its synthetic data. Security Advisor: 0 errors, 0 warnings, 9 intentional "RLS enabled, no policy" notices. Do not add policies to silence them.
- **Render, 21 October:** commit `5f37888` deployed; `/api/health` OK; three authenticated synthetic predictions returned. This shows availability, not accuracy.
