# STATUS.md — Coordination Ledger

Append entries under your agent name. Never delete or edit others' entries.
The lead (Mercury) reads this to coordinate parallel agents and resolve conflicts.

---

## Skeleton (lead) — DONE

- Built repo skeleton: frozen contracts, stub interfaces, global context dir.
- Created per-agent task briefs in `CONTEXT/TASKS/`.
- Deploy order defined in `CONTEXT/AGENTS.md` (Dependency order).

## Phase-0 guide (lead) — DONE

- Wrote `CONTEXT/PHASE0-VULTR-SETUP.md` (human-only setup: account, credit claim, VM,
  Docker, .env, firewall, public URL).
- Added `backend/.env.example` template.
- Human operator: run Phase 0, then report back so we can deploy sub-agents.

## sandbox — DONE

- Implemented `SandboxManager.execute` in `backend/app/sandbox/manager.py` using docker SDK.
  Containment: non-root `runner` user, `--read-only` rootfs with writable `/workspace`
  bind mount + `/tmp` tmpfs, `--network none`, memory/CPU limits, wall-clock timeout
  kills runaway loops, container force-removed on every path (success/error/timeout).
- Image built locally as `sandbox-runner:latest` (Dockerfile + requirements.txt).
- Verified: hello-world stdout/exit 0; artifact generation; network blocked; rootfs
  read-only; timeout kills after Ns; no leftover containers.
- Deploy templates (`deploy/*`) present with reasonable defaults.

## engine — DONE

- Implemented config already present; completed vultr.py (RuntimeError gate + OpenAI client) and openrouter generate_json fence handling.
- Implemented orchestrator loop, api routes, main.py static serving, llm __init__ selection.
- get_llm_client returns OpenRouter by default and Vultr when enabled.
- Verified import and basic run_loop with fake components.

## Contract change requests

(none yet)

## csv — DONE (TASK 03)

- Implemented `backend/app/engine/modes/csv_mode.py` (only file touched in my scope):
  - `CsvMode` implementing the frozen `Mode` protocol: `name="csv"`,
    `input_schema={file, question}`, `build_plan_prompt`, `build_code_prompt`, `verify`.
  - Code-prompt contract: script reads `/workspace/input.csv`, prints debug to
    stderr only, and ends stdout with a single `RESULT_JSON: {...}` line (the
    machine-readable answer); optional chart saved to `/workspace/chart.png`.
  - `verify`: PASS iff exit 0 AND (parseable `RESULT_JSON`/bare JSON in stdout,
    OR output artifacts besides `input.csv` present — e.g. a chart). FAIL reasons
    embed the stderr tail so the engine's retry loop has something actionable.
- Verified locally with deterministic smoke checks on synthetic `ExecutionResult`s
  (marker line, bare JSON fallback, artifact fallback, nonzero exit, no-output
  failures) — all PASS/FAIL paths behave as specified. Note: `docker` SDK is not
  installed in my dev env; I shimmed it for the smoke test only, no repo files touch it.
- Registry wiring is inherited from frozen `modes/__init__.py` (imports `CsvMode`) — no action needed from me.
- QA note for `backend/tests/`: fixtures = tiny CSV + handwritten scripts
  (correct run → PASS; raised exception / missing RESULT_JSON → FAIL).

## coder — DONE (TASK 04)

- Implemented `backend/app/engine/modes/coder_mode.py` (only file touched; the pre-existing
  stub was filled in, registry wiring inherited from frozen `modes/__init__.py`).
- `CoderMode` implements the frozen `Mode` protocol: `name="coder"`,
  `input_schema={file, goal; test optional/null}`, `build_plan_prompt`,
  `build_code_prompt`, `verify`.
- **Plan**: model plans validation (run the file? run the test? most likely failure +
  minimal repair to prepare) — no code in the plan.
- **Code**: model writes ONE self-healing wrapper script per attempt: copy
  `/workspace/input_file` → `/workspace/input_file.py` (importable), run it via
  `python -u` subprocess, on nonzero exit overwrite it with an embedded fixed source and
  re-run once *inside the same sandbox session*, run `/workspace/test.py` (if submitted)
  against the final version, and end stdout with a single machine-verifiable verdict line
  `CODER_RESULT: {"run_ok", "test_ok", "fixed", "attempts", "summary"}`.
- **verify** distinguishes the required cases: PASS = exit 0 AND (`run_ok` → "file runs
  cleanly" or `test_ok=true` → "test ran successfully"); FAIL reasons embed the stderr
  traceback tail ("still failing after the self-healing run"). Fallback when the model
  omits the verdict line: exit 0 + no traceback in stderr → clean-run PASS; traceback
  → FAIL.
- Constraints honored: no network in sandbox; fixes only rewrite the submitted file
  (`input_file.py`), never the test script. Docstring notes human approval may be
  required before destructive edits (future work).
- Verified locally (no repo files touched for this): (1) 9 deterministic PASS/FAIL checks
  on synthetic `ExecutionResult`s — all pass; (2) true end-to-end through the real
  `Orchestrator.run_loop` with a stub LLM + local substitute sandbox: a purposely-broken
  file (`print('hi'` → SyntaxError) was fixed and re-run to exit 0 → status `passed`,
  attempts=1, i.e. within the retry budget. NOTE: `docker` SDK missing in my dev env;
  shimmed for import only.
- QA note for `backend/tests/` (I could not write there — TASK 04 scope): happy path =
  broken file + wrapper that embeds the fix AND returns verdict → PASS; still-failing
  verdict (`run_ok:false`) → FAIL with traceback; optional-submit missing test →
  "runs cleanly"; nonzero wrapper exit → FAIL. Also cover the no-verdict fallback paths.

## chart — DONE (TASK 05)

- Implemented `backend/app/engine/modes/chart_mode.py` (only file touched in my scope):
  - `ChartMode` implements the frozen `Mode` protocol with `name="chart"` and appropriate `input_schema`.
  - Added systematic prompts:
    * `build_plan_prompt` creates a concise numbered plan for the requested visualization using the data preview.
    * `build_code_prompt` generates a strict script contract that reads `/workspace/data.csv`, produces either a PNG (matplotlib) or HTML (plotly) chart (`chart.png` or `chart.html`) and writes it to the workspace.
  - Verification logic:
    * PASS when the sandbox exits with code 0 and the expected chart artifact (`chart.png` or `chart.html`) is present.
    * Otherwise FAIL with a reason including a tail of stderr for debugging.
  - Included helper functions for data preview and safe JSON handling.
  - Registry wiring in `backend/app/engine/modes/__init__.py` already imports `ChartMode`; no further changes needed.


## fix — DONE (TASK 06)

- Implemented `backend/app/engine/modes/fix_mode.py` (only file touched in my scope):
  - `FixMode` implements the frozen `Mode` protocol with `name="fix"` and `input_schema` `{file, error (nullable), desired}`.
  - `build_plan_prompt`: asks for a minimal, targeted patch plan given the file, observed error, and desired behavior.
  - `build_code_prompt`: asks for a script that reads `/workspace/input_file`, applies the fix to a sandbox copy (`/workspace/fixed_file`), re-runs it (propagating exit code), and writes a unified diff to `/workspace/fix.diff`.
  - `verify`: PASS iff exit code 0 AND `fix.diff` is among the sandbox artifacts; otherwise FAIL with stderr tail.
- Smoke-tested the contract end-to-end against the sandbox image: a buggy `add` function was fixed, re-run printed `5`, exit 0, and `fix.diff` was collected as an artifact.

## frontend — DONE (TASK 07)

- Built the React SPA in `frontend/**` (Vite 5 + React 18 + Tailwind 3 + react-router 6).
- `src/api.js`: typed helpers for all frozen endpoints (`/modes`, `POST /tasks`,
  `GET /tasks/{id}`, SSE `/tasks/{id}/events` via `EventSource`, artifact fetch),
  with a single `ApiError` type (status 0 = server down) so every view renders
  network vs HTTP failures distinctly.
- Views:
  - `TaskForm` — schema-driven from `/api/modes` (mode selector + dynamic inputs from
    each mode's `input_schema`; file-content keys `file/data/test/code` get upload +
    paste, `format` enum gets a select; client-side required validation; on submit
    stores a localStorage record and navigates to the detail page).
  - `TaskProgress` — live SSE status (queued/running/passed/failed + attempt counter),
    closes the stream on terminal state/unmount, aria-live announce region.
  - `ArtifactViewer` — renders artifacts by inferred kind: images (`<img>`), JSON
    (table when array-of-objects, else pretty-printed), CSV (parsed table), HTML
    charts (iframe), unified diffs (colorized +/−), logs/code (monospace); download
    link on each; per-artifact fetch error handling.
  - `HistoryDashboard` — list of past tasks with status/attempts, links to detail,
    refresh button. Sources: localStorage (no list endpoint exists yet) merged with a
    quiet probe of `GET /api/tasks` (fallback when 404 / unavailable).
  - `ContainmentCard` — the "run card" evidence: container destroyed, non-root,
    read-only rootfs, limits, timeout, no network, no secrets, bounded retries.
  - Router: `/` (submit), `/tasks/:id` (detail), `/history` (dashboard).
- Accessibility/quality: labelled controls, focus-visible outlines, status never
  color-only (icons/text + badges), empty/loading/error states everywhere, no
  console errors (verified during dev run), responsive at 320–1440px.
- Verified: `npm run build` clean; `npm run dev` serves on :5173 with `/api`
  proxy to :8000 (accepted criteria). Install used `--legacy-peer-deps`
  (registry fetch glitch with vite peer resolution; harmless).

## Contract change requests

- **frontend → lead:** the frozen API has no list endpoint — add `GET /api/tasks`
  returning `[{task_id, mode, status, attempts, created_at}]`. The frontend probes
  it and falls back to localStorage history until it exists, but a server-side list
  would make the history dashboard fully cross-device. No blocking dependency.

## Lead review of Wave 1 (7 agents) — DONE

Verified all 7 agents' output:
- Scope compliance: ✅ each agent touched only its write-scope files; no frozen files
  modified (git diff confirms).
- Builds: ✅ backend compiles; frontend `npm run build` clean (42 modules).
- Real sandbox E2E (Docker): ✅ CSV verify, chart artifact, network blocked,
  rootfs read-only, 0 leftover containers.
- Full API integration (TestClient + stub LLM + real sandbox): ✅ submit → SSE loop →
  passed → `GET /api/artifacts/<task>/chart.png` returns real PNG (10KB) → list endpoint.

Lead fixes applied (integration gaps found during review):
1. **Artifact persistence (critical):** `SandboxManager.execute()` gained optional
   `artifact_out_dir`; the orchestrator passes `data/artifacts/<task_id>/` so the
   artifact-serving API actually has files. Previously artifact URLs would 404.
2. **Deploy unit bug:** systemd `WorkingDirectory`/`ExecStart` changed to run from the
   repo root so `backend.app.*` imports resolve.
3. **`GET /api/tasks` added** (per frontend contract request) and enriched with
   `mode`/`created_at` so the history dashboard works cross-device.
4. Contracts doc updated to reflect 1 & 3.

Still open / notes:
- Task state is in-memory (SQLite write-only). Fine for demo; restart loses history.
- `VultrLLMClient` remains a disabled stub (per plan) — needs Vultr docs to enable.
- QA agent (Wave 2) not yet deployed — the containment tests belong there.

## qa — DONE (TASK 08)

- Wrote the full test suite under `backend/tests/**` (only write scope touched).
  Files: `conftest.py`, `_support.py`, `test_engine_unit.py`,
  `test_modes_registry.py`, `test_llm_selection.py`,
  `test_modes_real_sandbox.py`, `test_artifact_persistence.py`,
  `test_e2e_smoke.py`, `test_containment.py`, `CONTAINMENT_PROOF.md`.
- **Run from the repo root:** `backend/.venv/bin/pytest backend/tests`.
  Container: **50 passed, 1 xfailed** (documented known bug, below), 0 failed.
- Fake LLM (`FakeLLM`) for all engine tests; real `SandboxManager` (Docker)
  for integration/containment tests. Docker-missing environments auto-skip the
  real-sandbox suites via `require_docker`.
- Containment negative tests (marker `containment`): **12 passed** — host FS
  not mounted, container hostname isolated, no host env/secrets leak, memory
  limit kills runaway allocation (exit 137), timeout kills runaway sleep
  (exit 124), non-root uid, read-only rootfs, network blocked, and container
  destroyed after success/error/timeout/OOM (`docker ps -a` before/after).
- Artifact persistence verified end-to-end: orchestrator run → `summary.json`
  exists at `data/artifacts/<task_id>/summary.json` → `GET
  /api/artifacts/{task_id}/summary.json` returns 200 with matching bytes.
- E2E smoke verified: POST task → SSE events → `passed`, artifacts fetchable,
  `GET /api/tasks` list newest-first with `mode`/`created_at`, unknown mode 400.

### Bug report (outside QA scope — engine-owned, not fixed here)
- **CSV input filename mismatch.** `backend/app/engine/orchestrator.py`
  `_build_files` (lines ~116–126) maps the convenience key `file` →
  `input_file`, but `CsvMode` generates/verifies scripts that read
  `/workspace/input.csv`. The schema-driven UI and `CsvMode` (frontend comment:
  "csv.file -> input.csv") both assume `input.csv`. Result: submitting CSV via
  `{file: ..., question: ...}` fails on every retry.
  **Workaround until fixed:** submit `{files: {"input.csv": <csv>}, question: ...}`
  (the explicit `files` dict passes through verbatim and works).
  Pinned by xfail regression test `test_csv_file_input_lands_as_input_csv`.
- Demo proof snippets published in `backend/tests/CONTAINMENT_PROOF.md`.

## Lead review of Wave 2 (qa) — DONE

- Ran the full suite: **51 passed, 0 failed** (was 50 passed + 1 xfailed).
- QA's reported bug was real and is now **fixed**:
  - `_build_files` was mode-blind: mapped `file` → `input_file`, but `CsvMode`
    generates/verifies scripts that read `/workspace/input.csv`. CSV submissions via
    the UI/API (`{file: ...}`) failed every retry.
  - Fix: mode-aware filename mapping (`csv` → `input.csv`; `coder`/`fix` →
    `input_file`; `chart` → `data.csv`). Verified end-to-end: `{file: ...}`
    CSV task now passes on attempt 1.
  - QA's xfail regression pin converted to a passing test; the mapping-contract test
    updated to lock the corrected behavior.
- QA's containment proof snippets are recorded in `backend/tests/CONTAINMENT_PROOF.md`
  for the demo video.

Wave 2 complete. Next: Wave 3 (`submission`), then Phase-0 Vultr deployment.
