# Architecture and data flow

```mermaid
flowchart LR
  R[Resident browser] --> W[React web app]
  S[Staff browser] --> W
  W -->|same-origin /api, cookie + CSRF| A[FastAPI]
  A --> P[(PostgreSQL)]
  A --> M[Private image storage]
  A -. cleaned photo, when configured .-> V[Cloudflare vision model]
  A --> C[MobileCLIP2-S0 checker, ONNX]
  A -. pin rounded to ~11 m, when configured .-> G[OpenStreetMap Nominatim]
  A -. configured free LLM when available .-> L[LLM provider]
```

FastAPI alone decides ownership, roles, status changes, and access to original images. The browser sees only authenticated `/reports/{id}/image` responses. The model prediction, resident-selected category, and staff-verified category occupy distinct report fields. Model absence requires manual selection; staff still verifies all accepted reports. Chat report status uses a server-side scoped lookup, never a model-generated status.

```mermaid
erDiagram
  USER ||--o{ LOGIN_SESSION : owns
  USER ||--o{ OAUTH_IDENTITY : links
  USER ||--o{ REPORT : submits
  USER ||--o{ NOTIFICATION : receives
  REPORT ||--o{ NOTIFICATION : triggers
  REPORT ||--o{ REPORT_EVENT : has
  REPORT ||--o{ STAFF_ACTION : has
  REPORT ||--o{ DUPLICATE_SUGGESTION : source
  REPORT ||--o{ DUPLICATE_SUGGESTION : candidate
  USER ||--o{ REPORT_EVENT : acts
  USER ||--o{ STAFF_ACTION : acts
  USER ||--o{ DUPLICATE_SUGGESTION : decides
```

`REPORT_EVENT` records actor and timestamp for each status change. `DUPLICATE_SUGGESTION` has a model version, score, decision, actor, and decision time; both original reports remain. Staff actions can record external coordination, but no API sends reports to another agency.

The selected Render container serves website and API under one origin. Supabase stores PostgreSQL rows and private photos. Sessions and authorization remain in FastAPI; Supabase client roles have no application-table policies. Storage credentials stay on the server, which checks report permissions before returning image bytes. Google identities map by provider and subject; matching password-account emails are not automatically linked.

## Status rules

`Pending` to `Under Verification` to `Accepted` to `In Progress` to `Resolved`. `Under Verification` may instead become `Rejected`. Acceptance requires a verified category. Residents can read their own reports and history; staff and administrators can read and update all reports.
