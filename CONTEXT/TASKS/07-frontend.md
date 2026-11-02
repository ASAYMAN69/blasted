# TASK 07 — frontend (React SPA)

## Role
Build the production-style React web app: task submission per mode, live progress (SSE),
artifact viewer (tables/charts/logs), run-history dashboard, and a containment summary card.

## Write scope (ONLY these)
- `frontend/**`
- `frontend/package.json`, `frontend/vite.config.js`, `frontend/index.html`,
  `frontend/src/**`

FROZEN (read-only): `backend/**`, `CONTEXT/CONTRACTS.md` (for the API contract).

## Depends on
- API contract in CONTRACTS §5 (endpoints + shapes).
- The backend serves the built SPA (static) — you build, `engine`/deploy serve.

## What to build
1. Vite + React + Tailwind scaffold.
2. API client (`frontend/src/api.js`) with typed helpers for the endpoints, incl. SSE
   consumption for `/api/tasks/{id}/events`.
3. Views:
   - `TaskForm` — mode selector (csv/coder/chart/fix) + dynamic inputs (file upload,
     text areas).
   - `TaskProgress` — live status via SSE (queued/running/passed/failed, attempt counter).
   - `ArtifactViewer` — render tables (JSON), images (`<img>`), logs (monospace), diffs.
   - `HistoryDashboard` — list past tasks with status/attempts.
   - `ContainmentCard` — show "run card" evidence: container destroyed, no secrets, limits.
4. Router (react-router) for `/` (submit) and `/tasks/:id` (detail).

## Acceptance criteria
- `npm run dev` works; the app talks to `http://localhost:8000/api` via Vite proxy.
- All API error states render gracefully (server down, 4xx/5xx).
- Clean, accessible UI (labels, focus states); no console errors.

## Note
No backend logic here. Follow the API contract exactly; if you need a response shape
changed, put a contract change request in `CONTEXT/STATUS.md`.
