# BarangAI project rules

- Follow the user's global AGENTS.md instructions.
- Build a single-barangay academic prototype (scope: DLSU-D Chapters 1–2). Never auto-forward reports to outside offices.
- Required roles: resident, staff, administrator. Enforce permissions in the API.
- Keep model prediction, resident category, and staff-verified category distinct.
- Categories: flooding, fallen_trees, broken_streetlights, exposed_wiring, potholes, uncollected_garbage, damaged_signage, other. The model predicts only its trained subset.
- Required report path: Pending, Under Verification, Accepted, In Progress, Resolved; Under Verification may become Rejected.
- Store private photographs outside public web roots. Strip metadata before storage.
- Use synthetic people and incidents in demos and tests. Never invent model metrics or user-study results.
- Keep external services optional in local tests. No paid API use or automatic billing.
- Do not commit, push, or deploy without the user's direct request or existing authorization in this chat.

## Decisions (26 Oct 2026)

- Hosting: Render Free (one container, same-origin `/api`) + Supabase Free (Postgres, private bucket). Not Vercel: a split origin weakens cookie auth, and the API runs a local model.
- Auth: keep the app's own sessions (argon2, cookie + CSRF, Google OAuth). Not Supabase Auth.
- Frontend: Vite React SPA in feature folders, React Router, TanStack Query, Tailwind + shadcn/ui (guided by the `ui-ux-pro-max` skill). Not Next.js. Apple-like look: system font, blue accent matched to Kap's vest, warm neutrals, light/dark following the device with an in-app toggle. Residents use phones (bottom tabs, Home first); staff and admins use desktops (sidebar dashboard). UI changes need the user's approval of `visual-check` screenshots.
- Mascot Kap: 2D stills cut from the user's own pose sheet (salakot, vest recoloured blue), animated with CSS/Motion; never redrawn or regenerated. 3D is shelved (procedural Blender builds were rejected).
- Motion: subtle and trustworthy (150–250 ms, bounce only on the map pin and success check), Motion library, CSS where enough, off under `prefers-reduced-motion`.
- Refactor order: fix, then redesign the frontend, then improve the backend. The old EfficientNet classifier (`inference.py`, `ml/`, `models/`) stays frozen and unused; `duplicates.py` stays frozen and is reused as is. The chatbot is in scope.
- Report AI (option C, 28 Oct 2026): a Cloudflare Workers AI vision model (Gemma 3 12B until the comparison picks one) writes the category, a description unique to each photo and hazard flags; MobileCLIP2-S0 (ONNX on Render, research-only licence) cross-checks the category, stands in when Cloudflare is down and gives duplicate embeddings. Location comes from the photo's GPS, then the phone's, with OpenStreetMap street names. Residents review and edit all of it; staff verify. Not SigLIP: Hugging Face Spaces with CPU are paid on the user's account. No local training data; tune and evaluate only with `apps/api/tools/evaluate_ai.py`, keeping tune and test photos apart.