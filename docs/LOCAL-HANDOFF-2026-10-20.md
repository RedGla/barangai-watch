# BarangAI Watch: local continuation handoff

## Live upload completion — latest, 21 October 2026

User approved existing server key use in memory; live Supabase integration PASSED. Local API TestClient uploaded JPEG/PNG/WebP to actual private Storage and saved PostgreSQL Pending reports; verified sanitization/rotation, resident/model/staff separation, invalid/oversize rejection, app reload, logout401 and other-resident404. Direct public/publishable Storage access and anonymous report Data API denied; actual anon/authenticated DB roles saw no populated reports. Synthetic rows/photos removed, secret/password not persisted, process ended. Evidence: `artifacts/live-supabase-2026-10-20/live-upload-verified-2026-10-21.json`, updated `docs/supabase-verification-2026-10-21.md`. Security Advisor 0errors/0warnings; nine RLS-no-policy info notices intentional, do not weaken. Original local launcher still SQLite/private local media. No permanent remote app configuration or public deployment. Model repair remains stopped. User wants minimal usage and continued authorized work; further approvals only for actual policy barriers.

## Live Supabase update — 21 October 2026

User explicitly approved prepared migrations and private bucket creation. Applied Alembic head 0005 to previously empty BarangAI project ctwdmiczjdyeiwlxynab; nine RLS tables, zero client policies. Created private incident-photos with default limits; no Storage object policies. TLS verify-full passed using official CA, TLS1.3; DB roles and anonymous REST see no user rows (empty database limits proof). Evidence and remaining gates: `docs/supabase-verification-2026-10-21.md`. Live app upload test remains pending: automatic approval review rejected reading existing server secret without explicit credential-handling authorization. No secret retrieved, no cloud photo/report uploaded, no local launcher switch, Git publication or public app deployment. Password already supplied in chat; do not request it again or write it to files. Hidden-prompt session ended; no process retains credentials. Browser remains on bucket details.

## Database/upload completion update

User stopped further model repair to conserve usage, then requested database verification and working photo uploads. Docker PostgreSQL 16 verification passed: migrations 0003-to-0005 preserve a synthetic legacy row, repeat head succeeds, nine tables enforce RLS against simulated anon/authenticated roles, non-superuser owner API handles JPEG/PNG/WebP preview/submission, stripped metadata/orientation, owner-only images, logout denial and persistence after DB restart. All 18 website tests pass after isolating lazy map imports in the general UI tests. Product upload code and existing SQLite demo are unchanged. Temporary container/data removed. Reproduce with `deploy/verify-local-postgres.py`; evidence in `artifacts/database-verification-2026-10-20/results.json`; explanation in `docs/database-verification-2026-10-20.md`. Actual Supabase, trusted phone HTTPS, physical devices and human evaluation remain unavailable/pending. No model retraining, public deployment, commit or push authorized/performed.

## Completion update — supersedes running-training instructions below

Corrected 199-image local CPU comparison finished both architectures in both weighting conditions, 10 epochs each. No training remains active; `training.pid` is historical. Do not rerun completed training. All four validation F1 scores are 1.0; predefined tie selects none/EfficientNet. Test results and reserved diagnostic did not change selection. Full report: `ml/TRAINING-RESULTS-V4-2026-10-20.md`.

Both selected candidate and v3 score 10/12 reserved photos. Candidate has two garbage-to-tree false alarms, v3 one. At fixed 0.8 candidate accepts zero suggestions; v3 accepts four correct suggestions, none trees. Retain v3 launcher/hash. No tuning or replacement. All four diagnostic trees share one event; no pothole diagnostic. Existing tree failures remain material.

Private `verification-both.json` checks data/split preservation, four checkpoints and CSV metrics. `final-audit.json` independently recomputes local metrics and replays selected checkpoint through API preprocessing on 44 val/test images (all labels match, maximum probability error below 1e-5). Focused tests: 21 passed. Checkpoints omit saved epoch/optimizer/RNG metadata. Remaining delivery gates are listed in the report and below. No paid compute, billing, commit, push, deployment or new activation occurred.

## User intent and constraints

Continue the existing BarangAI project, keep implementation simple, and minimize tokens using the caveman skill. The user requested a presentation-ready application, mobile camera/gallery uploads, and improved fallen-tree recognition. The latest request explicitly asks to transfer remaining work to a new local chat in the BarangAI project. Read AGENTS.md. Do not restart the build or repeat already completed broad app tests without a concrete reason. Appropriate subagents are authorized, but keep delegation bounded.

No paid compute, billing, commit, push, public publication/deployment, or messages to dataset owners without direct authorization. Pause at 1% remaining Codex usage and resume after the five-hour reset; check actual usage rather than assuming dates. Do not consume a reset credit. No active resume automation is currently needed/confirmed. Keep resident choice, model prediction and staff verification separate. Never auto-forward or auto-accept reports. Never fabricate data permissions, capture locations, metrics or field validation.

## Existing app and evidence

FastAPI/SQLAlchemy and React/TypeScript application implements resident/staff/admin permissions, private metadata-stripped images, gallery and camera input, report workflow, notifications, maps, audit history, English/Filipino interface and multilingual chatbot fallback. Google OAuth and Supabase private storage are optional and tested with mocks; live provider checks remain pending.

Local v3 EfficientNet checkpoint is integrated through deploy/start-local.ps1, using its exact approved hash and demo-only 0.8 cutoff. The launcher always forces local SQLite/private image storage and binds only to localhost. A server was left at http://127.0.0.1:8001; older unrelated app instance occupies8000. Check listeners before restarting. Do not kill unrelated processes. Current launcher still targets v3, not the new tree-repair models.

Verified previously:91 standard API tests passed, separate real-model/inference suite6passed,15MLtests passed, website production build passed. Real browser synthetic photo upload showed AI uncertain, accepted resident category, saved report and separate model/staff fields. Evidence artifacts/model-integration-2026-10-20/resident-report-proof.png. Physical phone camera/GPS and public HTTPS remain unverified.

## Immediate priority: finish the running corrected tree comparison

Local CPU training is RUNNING. Do not start a duplicate job. Inspect these first:

- artifacts/tree-reliability-2026-10-20/training.pid (parent process28000 when launched; verify rather than assume)
- training.stdout.log and training.stderr.log in that directory
- results-cpu/none/results.json, results-cpu/balanced/results.json
- results-cpu/selection.json (may be provisional after none mode; require both modes and both architectures)
- run_comparison.py in the same directory

The durable hidden local process uses the project .venv, two CPU threads, seed42, batch16,10epochs per architecture and mode. It trains EfficientNet-B0 and MobileNetV3-Large with unweighted and balanced loss on identical data. Official pretrained weights are cached under artifacts/torch-cache and hash checked. Scikit-learn was installed locally. At handoff: unweighted EfficientNet finished; unweighted MobileNet reached epoch9/10; balanced mode still pending. Partial EfficientNet results:validationmacroF1 1.0,test24/26,tree recall1/2. These are partial diagnostics, not final comparison results.

Select ONLY by validationmacroF1. Current runner uses deterministic ties: none before balanced, EfficientNet before MobileNet. Do not choose by test/local evaluation. Review whether any apparent improvement is supported; no reliable claim from tiny holdouts. Preserve results of every run and v3 unchanged. Do not promise100-200 scenes from27 accepted images.

## Correct data and an obsolete Kaggle package

Correct final local dataset: artifacts/tree-reliability-2026-10-20/training-v4-final/.

-199images:155train/18val/26test.
-32trainingtrees:5old plus27new. Total35treeimages including holdouts.
-All172v3 records and exact split placements preserved.
-SplitSHA256 b5e6d35e4bcd8ebc1afe324e87c57dc202337b3cce0ae2e0a24184e70202e607.
-New tree collection is one conservative training-only source group. No independent event count inferred from filenames.
-New-tree review:63images inspected,27accepted,36excluded. Source/crop hashes, emptyEXIF,manifest validation and bounded duplicate/flip checks recorded under new-trees/. Uploader-declaredCCBY4.0; underlying original ownership,country,photographers remain unverified. Private research candidates; no public redistribution claim.

IMPORTANT: old Kaggle private dataset BarangAI Tree Repair v4 contains superseded201-image package with29 provisional additions. Two final quality rejects were removed after upload. Do not use that package or its outputs as the final run. Browser access was temporarily disabled, now RESTORED. Kaggle existing tab2: https://www.kaggle.com/code/reddelmundo/barangai-watch-model-training/edit . UI confirmed DraftSessionoff, so no GPU should be running. User authorized free private training, not public publication. No need to rerun Kaggle while corrected local comparison runs.

## Training changes already implemented

ml/barangai_ml/cli.py supports --class-weighting none|balanced (defaultbalanced), counts TRAIN records only, inverse-frequency weights normalized to mean1, recorded in checkpoints/results. All train/val/test use EXIF-aware full-image aspect-preserving224letterbox with blackpadding; training horizontalflip only. Metadata preprocessing_version=letterbox_224_v1. API inference.py admits this metadata and uses matching preprocessing; old checkpoint without version keeps old preprocessing. Unknown versions rejected. API still refuses invalid checkpoint hash/config at startup; RuntimeError during model forward falls back to manual reporting. Do not weaken admission.

## Final evaluation still required

Reserved local-evaluation/manifest.csv contains12previously unused realPhilippinephotos:4trees(oneVamcoevent),5floods,2garbage,1sign. No pothole evaluation because ambiguous defect cause or unknownmunicipality excluded. It is not photographer-independent and not representative field validation. No flagged overlap against oldv3 sources/hashes/groups/perceptualscreen; related unknown sources can escape. These local photos NEVER enter training or model selection. Parent visually reviewed contact sheet. Existing v3 scored10/12,tree4/4,but bothgarbagewrong; all4trees fromONEstorm, so no broad tree reliability claim.

After selecting new checkpoint by validation only, run evaluate_local.py with selected checkpoint AND existingv3checkpoint so results.json preserves comparison. Script records perclass recall, falsepositives, and demo0.8 threshold coverage. Do not tune thresholds or choose checkpoints against these local results. Existing2oldtreeholdouts had0/2v3recall. Report both oldtest and newlocaldiagnostic honestly.

Then verify checkpoint hashes,trainingepochs,splitdigest,preprocessing/classweights and recompute reportedmetrics frompredictionCSVs. Save concise results report and update ml/TRAINING-STATUS.md, docs/feature-status.md. If model warrants local demo replacement, update launcher exacthash/path, run realcheckpoint API proof for newmetadata and browserphoto flow. Otherwise retainv3 and clearly report why; do not force a replacement to claim success.

## Remaining project work after model repair

1. More diverse real ground-level tree/flood examples and independent local events; current27supplement cannot establish reliability. Define mixed tree+flood label decisions and measure treefalsealarms. Synthetic photos remain supplemental only, never real evaluation.
2. Independent Philippine field evaluation and confidence calibration, including irrelevant/standing-tree inputs. Retainmanualcategory/staffverification.
3. Physical Android/iPhone camera/gallery/size/format/GPS test on trusted reachableHTTPS. Desktop emulation does not prove devicecamera.
4. Hosting: RenderFree+SupabaseFree config prepared, no publicdeployment authorized. Need user repository/provider setup and direct publication/deploymentauthorization. Render image excludesTorch; real model hostmemory/latency still gate. LocalCPU timings are not hostingbenchmarks. No OCI account required for selectedsetup.
5. Live PostgreSQL migrations, privateSupabasebucket/session/ownership/access/logout checks; currentlymockedprovider tests.
6. Optional GoogleOAuth credentials/callback and optional chatbotprovider only if needed; do not block localdemo on optionalservices.
7. Duplicate embedding quality/threshold validation; do not enable validatedembeddingflag merely because checkpoint emits vectors.
8. Presentation runbook and honest limits; human language review, blank userstudymaterials, no inventeduserstudyresults. Retention policy needs operator decision.

## Useful files

AGENTS.md; README.md; docs/feature-status.md; docs/presentation-demo.md; docs/deployment.md; ml/TRAINING-STATUS.md; ml/TRAINING-RESULTS-V3-2026-10-20.md; artifacts/tree-reliability-2026-10-20/package-summary.json; new-trees/README.md; local-evaluation/summary.json.

No commit/push/deployment performed. Whole project is currently untracked in Git; do not assume gitdiff lists changes. Private artifacts/checkpoints/.venv are ignored.
