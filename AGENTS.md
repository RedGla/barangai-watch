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

- Hosting: Render Free (one container, same-origin `/api`) + Supabase Free (Postgres, private bucket). Not Vercel: no room for torch, and a split origin weakens cookie auth.
- Auth: keep the app's own sessions (argon2, cookie + CSRF, Google OAuth). Not Supabase Auth.
- Frontend: Vite React SPA in feature folders, React Router, TanStack Query, Tailwind + shadcn/ui (guided by the `ui-ux-pro-max` skill). Not Next.js. Apple-like look: system font, blue accent matched to Kap's vest, warm neutrals, light/dark following the device with an in-app toggle. Residents use phones (bottom tabs, Home first); staff and admins use desktops (sidebar dashboard). UI changes need the user's approval of `visual-check` screenshots.
- Mascot Kap: 2D stills cut from the user's own pose sheet (salakot, vest recoloured blue), animated with CSS/Motion; never redrawn or regenerated. 3D is shelved (procedural Blender builds were rejected).
- Motion: subtle and trustworthy (150–250 ms, bounce only on the map pin and success check), Motion library, CSS where enough, off under `prefers-reduced-motion`.
- Refactor order: fix, then redesign the frontend, then improve the backend. The classifier (`inference.py`, `ml/`, `models/`) and duplicate detection are frozen; leave placeholders in the UI. The chatbot is in scope.
- Report AI: the photo pre-fills the resident's category (classifier) and description (`suggested_description`, a placeholder until a photo-to-text model is chosen); fields show "Filled by AI" and the resident can edit everything before submitting.
