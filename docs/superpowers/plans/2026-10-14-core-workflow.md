# Core Workflow Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans task by task. Steps use checkbox syntax.

**Goal:** Deliver a locally testable resident report-to-staff-verification workflow with private photos and audit history.

**Architecture:** React browser calls FastAPI. FastAPI owns opaque sessions, RBAC, image sanitization, reports, and state transitions in PostgreSQL. Tests use the same API contracts with an isolated database.

**Tech Stack:** React, TypeScript, Vite, Tailwind, shadcn/ui, Lucide, Leaflet; FastAPI, SQLAlchemy, PostgreSQL, Pillow, Argon2.

**Spec:** `docs/superpowers/specs/2026-10-14-barangai-core-design.md`

## Global constraints

- One barangay; no automatic forwarding.
- Five categories: flooding, potholes, fallen trees, uncollected garbage, damaged signage.
- Model, resident, and verified categories remain distinct.
- Production photographs private; development photos outside web root.
- No fabricated model output or metrics. No paid or automatically billed services.
- Do not commit or push unless the user directly requests it.

## Review focus

- Resident requests another resident's report or image: return 404.
- Resident forges staff status or role: return 403; preserve report.
- Invalid or oversized image: reject without saving media or report.
- Concurrent or invalid status change: reject and preserve complete event history.
- Model unavailable: require manual category, report unavailability explicitly.

---

### Task 1: Backend contract, database, and auth

**Files:** `apps/api/pyproject.toml`, `apps/api/barangai/{main,db,models,auth}.py`, `apps/api/tests/test_auth.py`, `apps/api/migrations/*`, `.env.example`.

**Interfaces:** `get_current_user(request, db) -> User`; `require_role(user, roles) -> None`; auth routes listed in spec. Registration creates resident; staff/admin bootstrap requires separate CLI/admin action.

- [ ] Write failing tests for registration, login/logout, cookie protection, password hashing, resident-only registration, and role forgery.
- [ ] Run tests and confirm feature failures.
- [ ] Implement DB models, migration, session auth, CSRF, and bounded auth rate limits.
- [ ] Run tests and confirm pass.

### Task 2: Report upload and resident read path

**Files:** `apps/api/barangai/{reports,media}.py`, `apps/api/tests/test_reports.py`.

**Interfaces:** `POST /reports`, `GET /reports`, `GET /reports/{id}`, `GET /reports/{id}/image`; `sanitize_image(data: bytes) -> bytes`; Pending event on creation.

- [ ] Write failing tests for valid submission, owner-only reads, invalid image, large image, metadata removal, bounds, and manual category when inference unavailable.
- [ ] Run tests and confirm feature failures.
- [ ] Implement routes and private media storage with rollback cleanup.
- [ ] Run focused and full API tests.

### Task 3: Staff review and history

**Files:** `apps/api/barangai/workflow.py`, `apps/api/tests/test_workflow.py`.

**Interfaces:** `POST /reports/{id}/status`, `POST /reports/{id}/actions`; status graph in spec; `GET /reports/{id}` returns event history and actions under permission rules.

- [ ] Write failing tests for every transition, wrong role, verification requirement, actor/time audit, and coordination records.
- [ ] Run tests and confirm feature failures.
- [ ] Implement transition service and staff routes under one transaction.
- [ ] Run focused and full API tests.

### Task 4: Resident and staff web flow

**Files:** `apps/web/package.json`, `apps/web/src/{App,api}.tsx`, `apps/web/src/components/*`, `apps/web/src/index.css`, `apps/web/tests/*`.

**Interfaces:** Consume Tasks 1-3 routes. Mobile resident form includes image, map pin, category correction, and status timeline. Staff sees pending reports and permitted transitions.

- [ ] Write failing browser/component tests for registration, report form, owner timeline, and staff verification.
- [ ] Run tests and confirm feature failures.
- [ ] Implement minimum responsive routes and Leaflet pin fallback.
- [ ] Run tests, TypeScript check, and Vite build.

### Task 5: Integration and security proof

**Files:** `README.md`, `docs/api.md`, `apps/api/tests/test_security.py`, end-to-end test files.

- [ ] Run PostgreSQL-backed migration and local end-to-end workflow; add failing tests for any discovered gap.
- [ ] Fix failures, rerun complete suites and build.
- [ ] Document setup, synthetic demo data, limitations, and exact evidence. Do not claim trained inference or deployment.

## Later plans

Create separate specs and plans for model research/training, duplicate review and chatbot, P1 features, and deployment after first workflow and hosting evidence. Those remain required deliverables.
