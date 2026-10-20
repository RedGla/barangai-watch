# Render + Supabase deployment readiness

The selected route is Render Free + Supabase Free, replacing the earlier OCI proposal. A single container serves the React website and FastAPI under one HTTPS origin. PostgreSQL and private photos persist in Supabase. No public deployment has been performed.

Follow [Render setup](render-setup.md), [Supabase setup](supabase-setup.md), and [Google sign-in setup](google-sign-in.md). The root render.yaml declares one Free Docker service, manual code deployments and no paid Render database or disk. Credentials belong only in server secret settings. Publishing, project selection and deployment still require the user's authorization.

## Gates before sharing a presentation link

1. Publish the intended Git repository with authorization. Select the intended Supabase Free project and create a private incident-photos bucket. Configure its HTTPS project URL, server-only secret key and PostgreSQL session-pooler URL. Do not reuse an unrelated project without approval.
2. Build the application container, apply Alembic migrations and verify PostgreSQL owner/client isolation, TLS and Storage permissions on the actual providers. Docker is available; [local PostgreSQL migrations, isolation and upload persistence passed](database-verification-2026-10-20.md). Application-image build and actual provider checks remain pending. Local proof does not establish hosted behavior.
3. Run the [presentation sequence](presentation-demo.md) through the real HTTPS URL. Check mobile camera and gallery uploads, GPS/map fallback, resident submission/history/chat, staff verification/actions, notifications, logout and cross-resident photo denial. Restart the service and verify photo/report persistence.
4. Configure Google OAuth and perform a consented resident sign-in through the exact hosted callback. Keep optional LLM credentials absent unless the account is confirmed to prevent paid usage.
5. Record actual outcomes in the [evaluation pack](evaluation.md). Browser simulation does not prove a physical phone's native camera or picker works.

## AI readiness

The baseline Render image excludes Torch, TorchVision and weights. Private trained checkpoints and local integration evidence exist; see [latest model comparison](../ml/TRAINING-RESULTS-V4-2026-10-20.md). No checkpoint has been benchmarked against the Free service's memory and CPU limits. Manual categorization is explicit; automatic duplicate suggestions also require validated embeddings. These remain real requirements for the complete AI demonstration.

Use the [ML commands](../ml/README.md) to train both approved architectures. Choose uncertainty thresholds using validation predictions only; reserve the test set for final evaluation. Record actual accuracy, macro F1, class metrics, confusion matrix, size, memory, cold-start and latency measurements. If the model cannot fit the approved zero-cost hosting, document the measured limitation and obtain approval before changing architecture or scope.

The optional inference adapter requires MODEL_CHECKPOINT, MODEL_APPROVED_SHA256 and MODEL_CONFIDENCE_THRESHOLD. It checks trusted file digest, architecture, classes and preprocessing before loading. Embedding-based duplicates additionally require VALIDATED_EMBEDDING_MODEL_VERSION. Do not enable these settings in the baseline image without adding and benchmarking the optional vision dependencies.

## Data and operating limits

Render Free sleeps when idle; Supabase Free can pause inactive projects and has storage/database quotas. Check current free-plan settings before a presentation, keep backups and allow time for startup. Leave paid upgrades disabled where possible. See the linked provider guides for verified restrictions.

Images are sanitized before upload. The backend rejects a public bucket and authorizes every image response. Supabase secrets never enter the browser. Review [deletion and backup handling](data-deletion.md), approve a retention policy before using real resident data, and back up Storage objects separately from database backups. Image storage and database writes are not an atomic cross-service transaction; failed cleanup logs a report identifier for operator reconciliation.

Existing Compose/Caddy files are an optional self-managed environment, not the selected cloud deployment. Local images are not copied automatically to Supabase; migrate and verify any existing real data before changing storage settings.
