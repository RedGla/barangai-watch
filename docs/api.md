# API contract

Local development: Vite proxies `/api` to FastAPI on port 8000. The selected Render setup mounts `/api` and serves the compiled website from the same container. OpenAPI is exposed at `/api/openapi.json` and docs at `/api/docs`. Routes below omit the public `/api` prefix. Resident and staff routes use an HttpOnly `session` cookie. For authenticated POST requests, send the readable `csrf_token` cookie value in `X-CSRF-Token`. Registration and login set both cookies. Staff/admin accounts are provisioned through the CLI.

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | Register resident with `{email,password}`; password at least 12 characters. |
| POST | `/auth/login` | Public | Log in with `{email,password}`. |
| POST | `/auth/logout` | Signed in | Revoke session. |
| GET | `/auth/me` | Signed in | Current `{id,email,role}`. |
| GET | `/auth/google/config` | Public | `{enabled}`; no credentials exposed. |
| GET | `/auth/google/start` | Public | Start configured resident Google authorization with PKCE/state. |
| GET | `/auth/google/callback` | OAuth transaction | Verify identity and create app session; no automatic local-email linking. |
| GET | `/health` | Public | Process readiness response. |
| POST | `/reports/predict` | Resident | Multipart `image`, optional `language` (`en`/`fil`/`taglish`). Returns what the AI can pre-fill: `prediction_available`, `model_category`, `confidence` (checker), `category_source` (`agreed`/`vision`/`checker`), `needs_check`, `problem_seen` (`false` when nothing looks broken; the category is then the closest guess and the description says the AI is uncertain), `suggested_description`, `hazards`. Requires CSRF. |
| GET | `/geo/reverse?lat=&lng=` | Signed in | `{label}`: street name from OpenStreetMap Nominatim, or `null`. 503 unless `GEOCODER=nominatim`. |
| POST | `/reports` | Resident | Multipart `image`, `latitude`, `longitude`, `resident_category`, optional `description` (trimmed, at most 1,000 characters). The server adds `model_category`, `hazards` and `location_label` itself. |
| GET | `/reports` | Signed in | Own reports for residents; all for staff/admin. |
| GET | `/reports/{id}` | Owner or staff/admin | Report with status events and staff actions. |
| GET | `/reports/{id}/image` | Owner or staff/admin | Sanitized private JPEG. |
| POST | `/reports/{id}/status` | Staff/admin | `{status,verified_category?,note?}` with exact transition graph. |
| POST | `/reports/{id}/actions` | Staff/admin | `{kind:"action"|"coordination",note}`. |
| GET | `/notifications` | Signed in | Latest 100 notifications belonging to the caller. |
| POST | `/notifications/{id}/read` | Owner | Mark a notification read; requires CSRF. |
| GET | `/reports/{id}/duplicates` | Staff/admin | Saved suggestions, or an explicit unavailable response. |
| POST | `/reports/{id}/duplicates/generate` | Staff/admin | Generate idempotent suggestions when validated embeddings exist. |
| POST | `/duplicates/{id}/decision` | Staff/admin | `{decision:"confirmed"|"rejected",note?}`. |
| POST | `/chat` | Resident | `{message,language:"en"|"fil"|"taglish",report_id?}`. Generic guidance may use Workers AI; report status stays deterministic and owner-scoped. |

Categories: `flooding`, `fallen_trees`, `broken_streetlights`, `exposed_wiring`, `potholes`, `uncollected_garbage`, `damaged_signage`, `other`. The AI suggests from all eight; residents can change any suggestion. Status sequence: `Pending`, `Under Verification`, `Accepted`, `In Progress`, `Resolved`; verification may instead end in `Rejected`. A report has distinct `model_category`, `resident_category`, and `verified_category`. The API never accepts a client-supplied model category: submission reuses the server's own analysis of the same photo from the preview (kept 30 minutes by photo hash), or runs only the local checker when there is none. On `/reports/predict`, `prediction_available:false` means neither model answered; on a report, it means no checker embedding was stored. An uncertain prediction can be available with `model_category:null`. Another resident's report or image returns 404.

Current duplicate and chat behavior is intentionally explicit: without a validated embedding model, duplicate lookup returns `embedding_available:false`, empty suggestions, and `manual_review_required:true`. Chat uses deterministic guidance when Workers AI is unconfigured, times out, fails, exhausts the Free allocation (`429`), or returns an invalid response; that returns `llm_available:false` and `source:"deterministic"`. A valid Workers AI answer returns `llm_available:true` and `source:"workers_ai"`.

Each successful staff status transition creates an in-app notification for the report owner in the same database transaction. Notifications contain only report ID, status, and timestamps; another account cannot list or mark them read. The resident UI refreshes notifications on page load and when the tab regains focus.

Optional generic guidance uses Cloudflare's [`@cf/mistralai/mistral-small-3.1-24b-instruct` REST model](https://developers.cloudflare.com/workers-ai/models/mistral-small-3.1-24b-instruct/), the same model that writes photo descriptions (confirmed to work on a Workers Free account; it replaced the Gemma-based SEA-LION model because Gemma 3 is not allowed there). Set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_WORKERS_AI_TOKEN` only on the API server and use a Workers Free account. The adapter sends only a locally derived generic topic and requested language. It never sends the raw message, report ID/status, photograph, location, notes, or resident record. Requests time out after eight seconds. Tracking with `report_id` never contacts Workers AI. Cloudflare documents a [10,000 neuron daily Free allocation](https://developers.cloudflare.com/workers-ai/platform/pricing/) and a [429 response when it is exhausted](https://developers.cloudflare.com/workers-ai/platform/errors/); this prototype does not query the account's billing plan, so do not configure a paid account if charges must be impossible. No Workers AI call is made unless both credentials are configured.
