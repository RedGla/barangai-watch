# Verification evidence — 20 October 2026

All data below are synthetic. Results describe the local application and mocked cloud boundaries, not a public deployment or physical phone.

## Automated checks

| Check | Actual result |
| --- | --- |
| Full API suite | 90 passed. One existing Starlette/httpx deprecation warning. |
| Web component/lifecycle suites | 18 passed. |
| ML data/export suites | 10 passed; no model training required or performed. |
| TypeScript and Vite production build | Passed. |
| Render Blueprint | Passed the downloaded official Draft 2020-12 schema: one Free service, manual deploys, no Render database or disk. |
| Compose interpolation | Passed with synthetic values. Docker user config was inaccessible; no container build was performed. |

The restricted environment required Vite's runner config loader for the web checks:

```powershell
python -m pytest apps/api/tests -q -p no:cacheprovider --basetemp apps/api/.pytest_tmp_verified
# From apps/web:
npm test -- --configLoader runner
npm run build -- --configLoader runner
# From ml:
python -m pytest tests -q -p no:cacheprovider --basetemp=.pytest_tmp_final
```

API coverage includes private remote uploads/ownership, public-bucket refusal, failure cleanup, responsive health requests during blocked storage, camera rotation, Google transaction/token safeguards, PostgreSQL migration SQL and administrator deletion. Storage and Google HTTP endpoints are mocked. SQLite migration execution verifies preservation; hosted PostgreSQL has not been exercised.

## Real local browser smoke

Origin: `http://127.0.0.1:8000`, compiled website and API served together. The viewport was set to 390 × 844 for mobile-layout checks.

- Resident registration succeeded.
- The existing-photo chooser opened, selected the synthetic JPEG, showed a preview and submitted: HTTP 201.
- The camera-designated input selected a synthetic JPEG, showed a preview and submitted: HTTP 201. This proves its submission path, not physical camera access.
- Staff started verification, set a verified category, accepted, recorded an action, and advanced through In Progress to Resolved.
- The resident saw four status notifications, marked one read, and received the stored Resolved status as `Nalutas` through Filipino chat.
- An authorized image response returned HTTP 200 with `Cache-Control: private, no-store`. A separate resident received HTTP 404 for the same photo.
- After the map fix, filtering, verification, closing details and logout produced zero captured page errors. The favicon returned HTTP 200.
- `/api/health` returned `{"status":"ok"}`. Google configuration returned `{"enabled":false}` without credentials.

## Remaining evidence

No public HTTPS deployment, hosted Storage, real PostgreSQL role isolation, live Google callback, physical-phone camera/GPS, trained model, inference benchmark, duplicate quality result or participant-study result has been claimed. Docker image build remains pending because its daemon is unavailable.

Render access needs setup. The connected Supabase account exposes an unrelated project; no changes were made to it. There is no Git remote. The intended account/project and authorization to publish/deploy are required. See [feature status](feature-status.md) and [deployment setup](render-setup.md).
