# Code Audit — Sandboxed Agent Studio (blasted)

Date: 2026-11-04
Scope: backend (FastAPI, orchestrator, sandbox, modes, LLM) + frontend (React/Vite) + deploy.
Method: read PROJECT.md, walked the source tree, ran unit (34 pass) + containment (12 pass) tests, ruff, frontend build.

## Summary

The product is functional and the containment story is genuinely enforced and
tested. The most important *correctness/security* flaws are path-traversal
surfaces that are NOT covered by the containment tests, plus a few robustness
gaps. The known issues listed in PROJECT.md §8 are accurate and mostly
acceptable for a hackathon demo, but two of them (path traversal in artifact
fetch and in sandbox file writes) are real security holes worth fixing before
any public demo.

## Findings

### Critical (fix before demo)

1. **Path traversal in artifact fetch** — `backend/app/api/routes.py:get_artifact`
   - `path = Path("data/artifacts") / task_id / name` with no validation.
   - `task_id`/`name` are single path segments by FastAPI default, but `..` and
     encoded variants can still escape the artifact root.
   - Impact: arbitrary file read on the host (any file the app user can read).
   - Fix: resolve both against the artifact root and assert `resolved.is_relative_to(root)`.

2. **Path traversal in sandbox file writes** — `backend/app/engine/orchestrator.py:_build_files`
   and `backend/app/sandbox/manager.py:_run`
   - User-supplied filenames (keys of `inputs.files`, and `file`/`data`/`test`/`code`
     values) are written verbatim as `ws / name`. A filename containing `../` or
     absolute paths writes outside the workspace (which is bind-mounted to the
     host temp dir, chmod 0777).
   - Impact: writes outside the sandbox workspace on the host temp dir; with a
     crafted name, potential overwrite of host files the app user owns.
   - Fix: sanitize to basename, reject separators/`..`, and validate in manager.

3. **Uncaught `ast.literal_eval` in `extract_parsed`** — `orchestrator.py`
   - Fallback branch calls `ast.literal_eval(...)` without catching
     `ValueError`/`SyntaxError`; a malformed stdout can raise out of the SSE
     generator and kill the stream.
   - Fix: wrap in try/except like `_coerce_dict`.

### High (correctness/robustness)

4. **In-memory task state lost on restart** (PROJECT.md §8.1). SQLite is
   write-only; `get_task`/`list_tasks` never hydrate. A restart loses history.
   - Fix: hydrate `_tasks`/`_results` from DB on startup, or document as demo-only.

5. **No concurrency control / queue** (PROJECT.md §8.8). Tasks run inline on
   the SSE request; concurrent users block each other and can exhaust VM.
   - Acceptable for demo; note in pitch.

6. **Sandbox-down is opaque** (PROJECT.md §8.9). If Docker is unavailable,
   `SandboxManager()` construction throws inside `_get_orchestrator`'s try and
   `sandbox=None`; the loop then crashes on `self._sandbox.execute` and surfaces
   a generic error after retries.
   - Fix: detect early and return a clear "sandbox unavailable" failure.

7. **Artifact endpoint has no auth** (PROJECT.md §8.2) — anyone can fetch any
   artifact by task id. Combined with traversal (finding 1) this is serious.

8. **DB stores `str(inputs)` (Python repr)** in `create_task` instead of JSON,
   and `update_task_status` never persists attempts/artifacts. History is lossy.
   - Fix: `json.dumps(inputs)`; add columns or a separate artifacts table write.

9. **`_ensure_task_persisted` swallows all exceptions silently** — DB failures
   are invisible; debugging is hard. At least log.

10. **Containment: world-writable workspace (0777)** is a known multi-tenant
    risk (PROJECT.md §8.4). Fine for single-tenant demo; document.

### Medium (quality)

11. **Ruff failures** in `orchestrator.py`: unsorted imports + unused
    `ExecutionResult` import. Minor but breaks "all CI green" claim if ruff is
    gated.

12. **Frontend bundle 523 KB / 167 KB gzipped** with no code splitting
    (PROJECT.md perf note). Add dynamic imports for heavy views.

13. **No frontend tests** (PROJECT.md §8.10). Only backend tested.

14. **Ollama endpoint guess** — client uses `base_url=https://ollama.com` and
    relies on SDK appending `/v1/messages`. Verify against Ollama cloud docs;
    a mismatch would make the default provider unusable. (OpenRouter default
    similarly assumes `/api` root.)

15. **SSE generator has no final error event** on unexpected exception; client
    sees a dropped connection with no detail.

16. **`max_task_size_mb` is configured but never enforced** anywhere in routes
    or orchestrator — oversized inputs are accepted.

17. **Artifact GC missing** (PROJECT.md §8.7) — `data/artifacts/` grows
    unbounded.

18. **Rate limiting absent** (PROJECT.md §8.3).

### Low / cosmetic

19. `datetime.utcnow()` deprecated (Python 3.12+) — warnings in tests.
20. `nano_cpus` calculation uses `int(float(...) * 1_000_000_000)`; for 0.5
    gives 500000000 (correct). Fine.
21. ChartMode.verify infers format from artifacts only; if both png and html
    present it passes regardless of requested format. Minor.
22. `result.model_dump_json()` in SSE requires pydantic v2 (ok).

## What is solid

- Containment: 12/12 negative tests pass; real Docker isolation with non-root,
  read-only rootfs, no network, memory/CPU limits, timeout, force-remove.
- Mode registry + verify() deterministic checks (exit code + markers).
- Structured result extraction with JSON/Python-literal tolerance.
- Retry loop is bounded (default 3).
- Frontend builds clean; mobile-first layout; reduced-motion aware.

## Recommended next actions (priority order)

1. Fix path traversal in `get_artifact` and `_build_files`/manager (findings 1,2).
2. Wrap `ast.literal_eval` (finding 3).
3. Enforce `max_task_size_mb` (finding 16).
4. Add startup hydration or document statelessness (finding 4).
5. Fix ruff errors (finding 11).
6. (Optional) Vultr LLM enablement for judging score.
