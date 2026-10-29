# Render + Supabase deployment readiness

The selected route is Render Free + Supabase Free, replacing the earlier OCI proposal. A single container serves the React website and FastAPI under one HTTPS origin. PostgreSQL and private photos persist in Supabase. The existing public service is [BarangAI](https://barangai-watch.onrender.com); its `/api/health` returned `{"status":"ok"}` on 21 October 2026. Commit `5f37888` was deployed successfully on 21 October 2026. Three authenticated synthetic photo previews returned `prediction_available=true`; unauthorized prediction was denied. This verifies availability, not classification accuracy or maximum-load memory use.

Follow [Render setup](render-setup.md), [Supabase setup](supabase-setup.md), and [Google sign-in setup](google-sign-in.md). The root render.yaml declares one Free Docker service, manual code deployments and no paid Render database or disk. Credentials belong only in server secret settings. Publishing, project selection and deployment still require the user's authorization.

## Gates before sharing a presentation link

1. Publish the intended Git repository with authorization. Select the intended Supabase Free project and create a private incident-photos bucket. Configure its HTTPS project URL, server-only secret key and PostgreSQL session-pooler URL. Do not reuse an unrelated project without approval.
2. Build the application container, apply Alembic migrations and verify PostgreSQL owner/client isolation, TLS and Storage permissions on the actual providers. Local Docker PostgreSQL and live Supabase checks passed (see [feature status](feature-status.md#evidence)); hosted application checks remain pending.
3. Run the [presentation sequence](presentation-demo.md) through the real HTTPS URL. Check mobile camera and gallery uploads, GPS/map fallback, resident submission/history/chat, staff verification/actions, notifications, logout and cross-resident photo denial. Restart the service and verify photo/report persistence.
4. Configure Google OAuth and perform a consented resident sign-in through the exact hosted callback. Keep optional LLM credentials absent unless the account is confirmed to prevent paid usage.
5. Record actual outcomes in the [evaluation pack](evaluation.md). Browser simulation does not prove a physical phone's native camera or picker works.

## AI readiness

The Render image runs the category checker on ONNX Runtime only (no PyTorch): `CHECKER_MODEL_DIR=/app/models/mobileclip2-s0`, build-time SHA-256 checks of `visual.onnx` and `checker.json`, and `VALIDATED_EMBEDDING_MODEL_VERSION=mobileclip2-s0:effec85f7f21` so duplicate review uses its embeddings. `GEOCODER=nominatim` turns on street names; set `GEOCODER_CONTACT` to a contact email for Nominatim's usage policy.

The vision model runs only when `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_WORKERS_AI_TOKEN` are set (the chatbot's account). `CLOUDFLARE_VISION_MODEL` picks the model (default `@cf/mistralai/mistral-small-3.1-24b-instruct`, about 5 neurons and 2 s per photo; Gemma 3 is not allowed on Workers Free accounts). The free tier is 10,000 neurons a day, shared with the chatbot, and never bills on the Workers Free plan (check the account's plan: Workers Paid bills overage); when it runs out the checker fills the category and the description stays empty. Llama 3.2 Vision needs a one-time licence acceptance call (`{"prompt": "agree"}`) before use.

Before release, measure checker latency and memory under the Free plan's limits, and confirm one live Cloudflare call. Re-export the checker with `apps/api/tools/export_checker.py` after changing its prompts; that changes the embedding version, so update the variable above and regenerate duplicate suggestions.

## Data and operating limits

Render Free sleeps when idle; Supabase Free can pause inactive projects and has storage/database quotas. Check current free-plan settings before a presentation, keep backups and allow time for startup. Leave paid upgrades disabled where possible. See the linked provider guides for verified restrictions.

Images are sanitized before upload. The backend rejects a public bucket and authorizes every image response. Supabase secrets never enter the browser. Review [deletion and backup handling](data-deletion.md), approve a retention policy before using real resident data, and back up Storage objects separately from database backups. Image storage and database writes are not an atomic cross-service transaction; failed cleanup logs a report identifier for operator reconciliation.

Local images are not copied automatically to Supabase; migrate and verify any existing real data before changing storage settings.
