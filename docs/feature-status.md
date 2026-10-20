# Feature status

Updated 20 October 2026 (Asia/Manila). Local verification does not imply cloud or physical-device validation.

Supabase update 21 October 2026: approved live migrations reached 0005; all nine tables have RLS and no client policies. Private incident-photos bucket and verified TLS connection work. Live API integration passed JPEG/PNG/WebP uploads, metadata removal, reload, logout/cross-resident denial, and direct public/client denial; synthetic data cleaned up. Security Advisor: zero errors/warnings, nine intentional default-deny informational notices. See [live setup evidence](supabase-verification-2026-10-21.md). Public hosting and physical devices remain pending.

| Priority | Capability | State |
| --- | --- | --- |
| P0 | Resident/password sessions, roles and ownership | Implemented and API tested. |
| P0 | Camera input and existing-photo uploads | Implemented; both submitted in the real local browser at phone-sized width. Physical camera check pending. |
| P0 | GPS, map pin and coordinates | Implemented; hosted phone permission checks pending. |
| P0 | Private sanitized images | Local and live Supabase upload/download privacy checks passed, including metadata removal, logout and cross-resident denial. Mocked-provider outage tests remain separate evidence. |
| P0 | PostgreSQL migrations and photo persistence | Docker migration preservation/restart proof and live Supabase migration 0005/TLS/private Storage/client denial passed. Local API reload preserves live cloud reports/photos. Hosted application checks pending. |
| P0 | Staff verification, status workflow, actions and history | Implemented and tested. No automatic forwarding. |
| P0 | AI classification and correction | v3 retained locally after completed 199-image tree comparison. Validation-selected v4 gets 1/2 old test trees and 10/12 reserved photos, but adds tree false alarms and accepts zero suggestions at 0.8. No replacement justified. Real-checkpoint API/manual fallback proof exists; cutoff uncalibrated. See v4 report. |
| P0 | Duplicate review | Algorithm/decisions tested; validated embeddings and quality measurement missing. Original reports preserved. |
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

Latest database/upload evidence: [local PostgreSQL verification](database-verification-2026-10-20.md). All 18 website tests passed, including gallery and camera-input submission. Physical-device acceptance remains pending.
