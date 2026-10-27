# BarangAI

Community incident reporting for a single Philippine barangay, prepared for an academic presentation demo. Residents submit photographed, located concerns; barangay staff verify and manage them. No report is forwarded automatically. See the [presentation guide](docs/presentation-demo.md), [feature status](docs/feature-status.md), and [deployment guide](docs/deployment.md) for capabilities and remaining gates.

## Current state

The local application includes resident, staff and administrator permissions, private sanitized photo uploads, ownership checks, status transitions, actions and audit history. Residents can choose an existing photo or use a camera input, preview the selection and submit it. Reviewed v3 model weights and measured development results exist privately; the local presentation launcher enables AI suggestions. Both models missed the two held-out tree images, so staff verification remains essential. Embedding quality for duplicate review is not validated. Chat supports English, Filipino and Taglish with authorized tracking and optional Workers AI guidance. The public demo is [BarangAI](https://barangai-watch.onrender.com). The reviewed AI image was deployed on 21 October 2026; three authenticated synthetic photo previews returned predictions successfully.

The staff portal includes filters, category counts, a seven-day trend and an incident map. In-app notifications record status changes and read/unread state. The interface supports English and Filipino. Resident Google sign-in is implemented and hidden until credentials are configured. The administrator [deletion command](docs/data-deletion.md) defaults to a dry run and requires explicit confirmation.

The selected hosting setup is **Render Free + Supabase Free**. One container serves the website and API; PostgreSQL and a private photo bucket persist separately. Local storage remains available for development. Hosted privacy checks, physical-phone camera checks and target-host performance must pass before claiming the hosted demo ready.

## Local setup

Use Python 3.12, Node.js 22, and PostgreSQL. Copy [`.env.example`](.env.example) into your local environment, fill `DATABASE_URL`, and keep it out of Git. For local HTTP only, set `COOKIE_SECURE=false`; production defaults to a secure cookie. Store `PRIVATE_MEDIA_DIR` outside any public web root. Do not use real resident information in tests or demos.

```powershell
cd apps/api
python -m pip install -e '.[test]'
$env:DATABASE_URL = 'postgresql+psycopg2://USER:PASSWORD@localhost/barangai'
alembic upgrade head
python -m barangai.bootstrap_staff staff@example.test --role staff
uvicorn barangai.main:app --host 127.0.0.1 --port 8000
```

In another terminal:

```powershell
cd apps/web
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. Vite proxies `/api` to local FastAPI. Create a resident account in the browser. Staff accounts are created only through the CLI. Local development may use SQLite (`DATABASE_URL=sqlite:///./barangai-dev.db`) for quick checks, but PostgreSQL is the intended deployed database.

## Verification commands

```powershell
python -m pytest apps/api/tests -q --basetemp apps/api/.pytest_tmp
cd ml; python -m pytest tests -q --basetemp=.pytest_tmp
cd ../apps/web; npm test; npm run build
```

## Local presentation with AI

The reviewed checkpoint is included in this private repository at [models/efficientnet_b0-v3.pt](models/efficientnet_b0-v3.pt). See its [model notes](models/README.md) for the approved hash, measured limits and private-use scope. Install the CPU runtime in the project environment, then build and start:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e './apps/api[test]'
.\.venv\Scripts\python.exe -m pip install torch==2.11.0 torchvision==0.26.0 --index-url https://download.pytorch.org/whl/cpu
cd apps/web
npm ci
npm run build
cd ../..
.\deploy\start-local.ps1
```

Open `http://127.0.0.1:8000`. The launcher serves the built website and API together, uses the approved checkpoint hash, and always uses the local SQLite database and private image folder. It overrides remote database/storage settings in its process so presentation reports stay local. Stop with Ctrl+C. This launcher binds only to this computer; phone access still requires a trusted reachable HTTPS deployment. Use `.\deploy\start-local.ps1 -Port 8001` if port 8000 is occupied.

The `0.8` confidence cutoff is a presentation guard, **not a calibrated production threshold**. Suggestions can be wrong even at high confidence. Residents can choose another category; personnel verify independently. Runtime inference errors fall back to manual reporting. Bad checkpoint hashes, missing dependencies and invalid model configuration still stop startup.

To exercise the real checkpoint through the API with synthetic test photos:

```powershell
$env:BARANGAI_TEST_CHECKPOINT = (Resolve-Path 'models/efficientnet_b0-v3.pt').Path
$env:OMP_NUM_THREADS = '2'
$env:MKL_NUM_THREADS = '2'
.\.venv\Scripts\python.exe -m pytest apps/api/tests/test_real_model.py -q
```

For ML data, rights and commands, see [`ml/README.md`](ml/README.md). The [evaluation pack](docs/evaluation.md) contains blank participant tasks, questionnaires and technical cases. Publishing needs the intended Git repository, Render/Supabase access and explicit authorization. Deployment-host measurements and independent Philippine evaluation remain outstanding.
