# ML and Deployment Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans task by task. Steps use checkbox syntax.

**Goal:** Train and validate five-class inference, then deploy and smoke-test the complete prototype within a verified ₱0 recurring budget.

**Architecture (updated 20 October):** `ml/` owns provenance, grouped splits, comparison, prediction exports and versioned checkpoints. FastAPI loads only a validated checkpoint. The user approved Render Free plus Supabase Free: one container serves React/FastAPI, while PostgreSQL and private photos persist in Supabase. Baseline hosting excludes vision dependencies until actual memory, startup and latency measurements prove the selected model fits the free host. Current readiness is tracked in [feature status](../../feature-status.md).

**Tech Stack:** PyTorch/TorchVision, FastAPI, PostgreSQL, Render, Supabase private Storage, Vite.

**Spec:** `docs/superpowers/specs/2026-10-14-barangai-core-design.md`

## Global constraints

- No invented data, weights, performance, deployment, or user evaluations.
- No paid subscriptions, paid API calls, or automatic billing.
- Private resident images and credentials never enter Git or a public bucket.
- No commits or push without direct user request.

## Review focus

- Repeated photos or the same incident crossing train/test: reject split.
- Dataset code license mistaken for image rights: reject row during human rights review.
- Checkpoint class order differs from API categories: fail startup, not mislabel reports.
- CPU memory or latency exceeds free host budget: do not claim deployable P0 AI.
- Free hosting limits or inactivity pauses prevent the required workflow: record the measured blocker and require approval before changing scope.

---

### Task 1: Licensed dataset and model comparison

**Files:** `ml/manifest.csv` outside Git, `ml/barangai_ml/{data,cli}.py`, `ml/tests/*`, `ml/README.md`.

**Interfaces:** `load_manifest(path, image_root) -> list[Record]`; `split_records(records, seed) -> list[str]`; CLI `prepare` and `train` outputs split CSV, checkpoint, and JSON measurements.

- [ ] Acquire/consent and review image-specific rights for all five classes, including local Philippine phone photos.
- [x] Write tests for provenance and grouped split; observe failure, implement validation, rerun tests.
- [x] Implement reproducible comparison script for EfficientNet-B0 and MobileNetV3-Large.
- [ ] Run both models on fixed data; record held-out metrics, uncertainty threshold, and target CPU latency/size.

### Task 2: Validated API inference and embeddings

**Files:** `apps/api/barangai/inference.py`, `apps/api/barangai/reports.py`, `apps/api/tests/test_inference.py`, model metadata outside Git.

**Interfaces:** `predict(sanitized_image: bytes) -> Prediction | None`; `Prediction` has `category`, `confidence`, `embedding`, `model_version`. Only set report `model_category` when above validated uncertainty threshold. Persist embedding/version for duplicate suggestions.

- [ ] Write failing tests for class order mismatch, missing weights, low confidence, secure model metadata, and embedding version.
- [ ] Implement model loading and prediction without automatic downloads at request time.
- [ ] Run API suite and benchmark inference on selected free host hardware.

### Task 3: Zero-cost deployment

**Files:** `deploy/*`, `.env.example`, `docs/deployment.md`, production smoke tests.

- [ ] Verify current provider quotas and availability. Oracle's published Always Free A1 allowance is 2 OCPU/12 GB RAM and may face capacity or idle reclamation ([official limits](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)).
- [ ] Configure PostgreSQL, private media, migrations, HTTPS, same-origin proxy, body limits, backups/deletion, and secret injection. Disable paid upgrades and keep actual cost evidence.
- [ ] Deploy with user-authorized account access; run real HTTPS resident submit, classification, staff verify, status track, duplicate review, and chat smoke tests.
- [ ] Publish URL and actual evidence only after success. If capacity, data, model, or account access blocks completion, record exact blocker.
