# PROJECT.md — Sandboxed Agent Studio (blasted)

**Repo:** https://github.com/ASAYMAN69/blasted (public, main branch)
**Live:** http://45.76.2.228
**Event:** Vultr: Agent Rush Hackathon — Challenge 1 "Blast Radius Zero"
**Online phase ends:** 2026-11-08 | **Submission deadline:** 2026-11-09 05:00 +06:00

---

## 1. What this project is

A **web-based AI agent that performs real work through code execution**, with every
action contained in isolated, disposable sandboxes running on Vultr infrastructure.
The app acts as a centralized control layer that plans tasks, dispatches execution,
and returns verifiable results.

**Challenge 1: "Blast Radius Zero"** — the core requirement is that all agent actions
execute inside isolated sandboxes on Vultr. We built a platform where users submit
tasks, an AI agent writes code, the code runs in a real Docker container (not
simulated), and the output is returned with proof. The container is destroyed after
every task. The AI never touches the host, never sees secrets, and never escapes.

**Why this matters (business value):** AI code execution platforms (E2B, Modal, etc.)
are a real market. Our angle is "safe, verifiable AI execution with proof" — a
business can run untrusted AI-generated code without risk. The containment story
is the differentiator.

## 2. Architecture

```
Browser → nginx :80 → FastAPI/uvicorn 127.0.0.1:8000
  ├── serves built SPA (frontend/dist)
  ├── /api/* REST + SSE endpoints
  ├── Orchestrator (agentic loop)
  ├── LLM Client (Ollama → OpenRouter fallback → Vultr stub)
  └── SandboxManager → Docker containers (per-task, destroyed after)
```

### Request flow (one task end to end)

1. Browser POSTs `{mode, inputs}` to `/api/tasks` → Orchestrator creates a Task (uuid), persists to SQLite
2. Browser opens SSE stream `/api/tasks/{id}/events` → Orchestrator runs the agentic loop:
   - **INTERPRET** — normalize input into task object
   - **PLAN** — LLM generates an execution plan (English, no code)
   - **GENERATE** — LLM writes code (mode-specific prompt template)
   - **SANITIZE** — strip markdown fences, extract raw code
   - **EXECUTE** — SandboxManager runs code in a Docker container (limits: memory, CPU, timeout, no network)
   - **VERIFY** — mode's `verify()` checks exit code + artifacts + structured output
   - **EXPLAIN** — LLM summarizes the result (one terse sentence)
   - **RETRY** — on failure, feed error back → GENERATE (bounded, default 3 attempts)
   - **FINALIZE** — persist result, yield SSE event, close stream
3. Artifacts are copied from the ephemeral sandbox to `data/artifacts/<task_id>/` before the container is destroyed
4. Browser fetches artifacts via `GET /api/artifacts/{id}/{name}`

### Why SSE (not WebSockets)
One-way push is all we need. SSE is simpler, auto-reconnects in the browser, and
doesn't require a state machine. The browser opens one connection and receives
progress events as the agent works.

### Why a sibling container (not exec on host)
The host runs the app, the LLM client, and the secrets. Executing AI-generated
code in the same process would let it read those secrets and crash the whole app.
A separate Docker container gives us a clean, disposable boundary — and it's the
whole point of "Blast Radius Zero".

## 3. Containment model (the differentiator)

Every sandbox run enforces ALL of these (see `backend/app/sandbox/manager.py`):

| Guarantee | Implementation |
|---|---|
| Process isolation | Code runs in a separate Docker container, not the app process |
| Non-root user | Container runs as `runner` user (not root) |
| Read-only rootfs | `--read-only` flag; only `/workspace` is writable (tmpfs for /tmp) |
| No network | `--network none` — zero egress, no exfiltration path |
| Memory limit | `--memory 512m` (configurable via SANDBOX_MEMORY) |
| CPU limit | `--cpus 0.5` (configurable via SANDBOX_CPUS) |
| Wall-clock timeout | 60s default (configurable); kills runaway loops, exit code 124 |
| Lifecycle discipline | Container force-removed (`--rm` + explicit cleanup) on success, error, timeout, OOM |
| Secret hygiene | No API keys/credentials ever enter the sandbox; LLM calls happen outside |
| Artifact persistence | Artifacts copied to `data/artifacts/<task_id>/` before workspace deletion |

**12 containment negative tests** in `backend/tests/test_containment.py` prove each
guarantee: host FS not mounted, container hostname isolated, no host env/secrets
leak, memory limit kills runaway allocation (exit 137), timeout kills runaway sleep
(exit 124), non-root uid, read-only rootfs, network blocked, container destroyed
after success/error/timeout/OOM.

## 4. Features

### 4.1 CSV Analyst mode (`csv`)
- **Input:** CSV file + natural-language question
- **What happens:** AI plans analysis steps → writes a pandas script → sandbox runs it →
  returns real statistics + optional chart + structured JSON answer
- **Verification:** exit code 0 AND parseable `RESULT_JSON: {...}` in stdout (or artifacts present)
- **UI:** live table preview (sticky header, capped rows, horizontal scroll), quick-action
  suggestion chips (one-tap questions from column analysis), chart customization panel
- **Why it matters:** replaces manual data analysis; business users get real answers, not hallucinations

### 4.2 Code Reviewer mode (`coder`)
- **Input:** Python source file + goal (optional test file)
- **What happens:** AI plans validation → writes a self-healing wrapper script → sandbox
  runs it → on failure, applies a fix and re-runs → returns a verdict
- **Verification:** exit 0 AND verdict says `run_ok=true` AND (`test_ok=true` or no test)
- **Verdict chips:** "runs cleanly", "repair applied", "tests passed", "N attempts"
- **Why it matters:** AI can actually fix code and prove it works — not just describe fixes

### 4.3 Chart Anything mode (`chart`)
- **Input:** CSV/JSON data + chart request + format (png/html) + palette + chart type
- **What happens:** AI plans visualization → writes matplotlib/plotly script → sandbox
  generates a real chart image
- **Verification:** exit 0 AND `chart.png` or `chart.html` artifact exists
- **Customization:** 5 color palettes (aurora/cobalt/emerald/ember/mono) + 7 chart
  types (auto/bar/line/scatter/histogram/pie/box) — injected into the prompt as exact
  hex values so generated charts honor user choices
- **Why it matters:** business users get real charts from messy data, styled to their brand

### 4.4 File Fixer mode (`fix`)
- **Input:** file + desired behavior (optional observed error)
- **What happens:** AI plans a minimal patch → generates a script that reads the file,
  applies the fix to a copy, re-runs to verify, writes a unified diff
- **Verification:** exit 0 AND `fix.diff` artifact exists AND `FIX_RESULT` verdict confirms
  the patch runs cleanly (or reports no changes needed)
- **Why it matters:** safe, auditable file edits with proof — shows exactly what changed

### 4.5 Frontend features
- **Mobile-first:** bottom tab bar on mobile, side rail on desktop, 44px+ touch targets
- **Dark premium design:** "Ethereal Glass" — deep space base, aurora glow, glass panels
- **Sharp corners:** industrial-brutalist direction (no border-radius anywhere)
- **Framer Motion:** staggered entrances, layout-animated active nav, magnetic buttons,
  step-progress bar, hover-lift cards — all transform/opacity only, reduced-motion aware
- **CSV preview:** live table with sticky header, capped rows, contained horizontal scroll
- **Quick actions:** one-tap suggested questions from column analysis (client-side, instant)
- **Chart styling panel:** palette swatches + segmented chart-type control
- **Structured result rendering:** stat grid + data table + verdict chips from parsed JSON
- **Markdown rendering:** AI summaries render as styled HTML (react-markdown + remark-gfm)
- **Copy-to-clipboard** on summaries
- **Ctrl/Cmd+Enter** to submit
- **Try example** button per mode (one-click sample data)
- **Run history:** server + localStorage merged, cross-device

### 4.6 Infrastructure
- **CI/CD pipeline:** branch push → CI (tests + build) → PR → review → merge → auto-deploy
- **Branch protection:** requires both CI checks to pass before merge
- **Deploy script:** idempotent (git pull → install → build → restart → health check)
- **Services:** nginx (reverse proxy) + FastAPI/uvicorn (systemd) + Docker (sandbox runtime)
- **Firewall:** 22, 80, 443 only

## 5. How the system works (technical deep-dive)

### 5.1 Agentic loop
```
INTERPRET → PLAN → GENERATE → SANITIZE → EXECUTE → VERIFY → EXPLAIN → RETRY (bounded) → FINALIZE
```
- PLAN and GENERATE are separate LLM calls (plan first, then code from the plan)
- SANITIZE strips markdown fences, extracts raw code
- VERIFY is deterministic (mode's `verify()` checks exit code + artifacts + structured output) — NOT the model's opinion
- RETRY feeds the previous error back into the prompt (bounded, default 3 attempts)
- EXPLAIN generates a one-sentence summary (terse, no markdown)

### 5.2 LLM client abstraction
- `LLMClient` interface: `generate()`, `generate_json()`, `provider_name`
- Factory: Vultr (if enabled) → Ollama (if key set) → OpenRouter (fallback)
- Anthropic SDK for Ollama/OpenRouter (Anthropic-style endpoint)
- OpenAI SDK for OpenRouter's `/chat/completions` endpoint (configurable via `OPENROUTER_API_URL`)
- Vultr client is a disabled stub (needs Vultr docs to enable)

### 5.3 Mode system
- `Mode` protocol: `name`, `input_schema`, `build_plan_prompt()`, `build_code_prompt()`, `verify()`
- Registry in `modes/__init__.py` (frozen) maps name → class
- Each mode produces prompts and judges results; the engine handles execution
- Modes are pluggable — adding a new mode = one new file + one registry entry

### 5.4 Sandbox lifecycle
1. `mkdtemp` creates a temp workspace (chmod 0777 so the container's `runner` user can read/write)
2. User files written into `/workspace` (chmod 0666)
3. `_run.py` written (the code to execute, chmod 0666)
4. Docker container created: non-root, read-only rootfs, writable /workspace, no network, memory/CPU limits
5. Container starts, runs `_run.py`, captures stdout/stderr/exit code
6. On timeout: kill container, exit code 124
7. Container force-removed (always, even on error)
8. Temp workspace deleted (artifacts copied out first)
9. Artifacts persisted to `data/artifacts/<task_id>/`

### 5.5 Structured result extraction
- Sandbox stdout contains a marker line: `RESULT_JSON: {...}` or `CODER_RESULT: {...}` or `FIX_RESULT: {...}`
- `extract_parsed()` in orchestrator.py pulls the JSON (tolerates Python dict literals via `ast.literal_eval`)
- Result is stored in `RunResult.parsed` and surfaced via API
- Frontend renders it as stat grid + data table + verdict chips

## 6. Codebase structure (34 files, ~4121 lines)

```
backend/
  app/
    __init__.py
    config.py          # Pydantic settings (env vars)
    main.py            # FastAPI app + CORS + static serving
    api/
      __init__.py
      routes.py        # REST + SSE endpoints
    engine/
      __init__.py
      orchestrator.py  # Agentic loop + Task/RunResult models
      modes/
        base.py        # Mode protocol + Verification (FROZEN)
        __init__.py    # Registry (FROZEN)
        csv_mode.py    # CSV Analyst
        coder_mode.py  # Code Reviewer
        chart_mode.py  # Chart Anything
        fix_mode.py    # File Fixer
    llm/
      base.py          # LLMClient protocol (FROZEN)
      __init__.py      # Factory (vultr → ollama → openrouter)
      ollama.py        # Ollama client (Anthropic SDK)
      openrouter.py    # OpenRouter client (Anthropic + OpenAI style)
      vultr.py         # Vultr stub (disabled)
    sandbox/
      __init__.py
      manager.py       # Docker sandbox executor
      image/
        Dockerfile     # python:3.11-slim + pandas/matplotlib/plotly
        requirements.txt
    store/
      __init__.py
      db.py            # SQLite (task history + artifacts)
  tests/
    conftest.py        # Fixtures (fake LLM, real sandbox, etc.)
    _support.py        # Test fixtures (sample code, data)
    test_engine_unit.py
    test_modes_registry.py
    test_llm_selection.py
    test_modes_real_sandbox.py
    test_artifact_persistence.py
    test_e2e_smoke.py
    test_containment.py  # 12 containment negative tests
    CONTAINMENT_PROOF.md # Demo snippets
  pyproject.toml       # Deps, pytest, ruff config
frontend/
  src/
    main.jsx           # Entry point
    App.jsx            # Shell (side rail + top bar + nav)
    api.js             # API client (configurable origin)
    csvHints.js        # CSV introspection + preview
    examples.js        # Sample data per mode
    index.css          # Design system (dark premium, sharp corners)
    components/
      ui.jsx           # Shared primitives (Panel, Badge, etc.)
      TaskForm.jsx     # Schema-driven form + quick actions + preview
      TaskDetail.jsx   # Result + progress + artifacts
      TaskProgress.jsx # SSE live progress + step indicator
      ArtifactViewer.jsx  # Renders artifacts by kind
      ParsedResult.jsx # Structured AI result rendering
      HistoryDashboard.jsx  # Run history
      QuickActions.jsx # One-tap suggestions
      CsvPreview.jsx   # Live CSV table preview
      Markdown.jsx     # Safe markdown renderer
  vite.config.js       # Vite config + git SHA injection
  tailwind.config.js   # Tailwind theme (dark premium)
  package.json
  index.html           # HTML shell + fonts
deploy/
  provision-sandbox.sh
  nginx.conf.example
  sandboxed-agent-studio.service
  update.sh            # Idempotent deploy script
docs/
  CICD.md              # CI/CD pipeline docs
  submission/
    DEPLOYMENT.md      # Production deployment guide
  superpowers/specs/
    2026-11-02-vultr-agent-rush-design.md  # Approved design
.github/workflows/
  ci.yml               # CI: tests + build
  deploy.yml           # CD: auto-deploy on merge
CONTEXT/
  AGENTS.md            # Agent coordination rules
  CONTRACTS.md         # Frozen interfaces
  STATUS.md            # Coordination ledger
  PHASE0-VULTR-SETUP.md # Vultr setup guide
  DEPLOY-PROMPTS.md    # Sub-agent deploy prompts
  TASKS/               # Per-agent task briefs (01-09)
```

## 7. Testing

### Unit tests (no Docker needed)
- Engine state machine transitions
- Retry budget logic
- Mode registry wiring (all 4 modes)
- LLM client selection (Vultr enabled/disabled)
- Mode verify() logic

### Integration tests (Docker required)
- Each mode with fixture input → PASS + artifacts
- Artifact persistence (file exists + fetchable via API)
- E2E smoke: API submit → SSE → passed → artifacts

### Containment tests (Docker required, marker `containment`)
- Host FS not mounted
- Container hostname isolated
- No host env/secrets leak
- Memory limit kills runaway allocation (exit 137)
- Timeout kills runaway sleep (exit 124)
- Non-root UID
- Read-only rootfs
- Network blocked
- Container destroyed after success/error/timeout/OOM

**Total: 52 tests, all passing.**

## 8. Known issues / areas to audit

### Potential issues for a code reviewer
1. **Task state is in-memory** — SQLite is write-only (tasks persisted but never read back on restart). A server restart loses in-memory task state; the DB has the records but the orchestrator doesn't hydrate from it.
2. **No authentication** — anyone with the URL can submit tasks. Fine for a hackathon demo, not for production.
3. **No rate limiting** — a user could spam tasks and exhaust VM resources.
4. **Sandbox user permissions** — workspace is chmod 0777; any user on the host can read/write sandbox files. Acceptable for a single-tenant demo, not multi-tenant.
5. **Vultr LLM stub** — `backend/app/llm/vultr.py` is a disabled stub. The hackathon requires Vultr Serverless Inference for Challenge 1. We use Ollama instead (works fine, but Vultr integration would score higher).
6. **No input sanitization beyond size limits** — the `files` dict is passed through verbatim. A malicious filename could theoretically be a path traversal (mitigated by the sandbox, but should be validated).
7. **Artifact cleanup** — no garbage collection of old artifact dirs. Over time, `data/artifacts/` grows unbounded.
8. **Concurrent task limit** — designed but not enforced. The orchestrator runs tasks inline on the SSE request; no queue.
9. **Frontend has no offline/error state for sandbox-down** — if Docker is unavailable, tasks fail with a generic error.
10. **No tests for the frontend** — only backend is tested. Frontend correctness is verified manually via Playwright.

### Security considerations
- Secrets are in `.env` (gitignored) — never committed
- The sandbox has no network access (no exfiltration)
- The sandbox runs as non-root
- The app runs as `sandbox` user (not root) on the VM
- CORS is permissive (`allow_origins=["*"]`) — fine for a demo, not for production
- No CSRF protection (no cookies/sessions, so not needed)
- No input validation beyond size/count limits

### Performance considerations
- Tasks run inline on the SSE request — no queue, so concurrent users block each other
- The LLM (Ollama free tier) takes ~5-15s per call — the bottleneck is the model, not the code
- The sandbox image is ~659MB — could be slimmed down
- Frontend bundle is ~340KB gzipped — could be code-split

## 9. Judging criteria alignment

| Criterion | Score (self-assessed) | Evidence |
|---|---|---|
| Application of Technology | ⭐⭐⭐⭐⭐ | Real LLM integration, real sandbox execution, clean modular code, CI/CD, tests |
| Presentation | ⭐ (gap) | No video, no slides, no polished narrative yet |
| Business Value | ⭐⭐⭐⭐ | Solves a real problem (safe AI code execution), containment is the business case |
| Originality | ⭐⭐⭐⭐⭐ | Sandbox containment proof, self-healing code, structured results — genuinely novel |

**The single biggest gap is Presentation.** The product is done. The pitch is missing.

## 10. Git state

- Branch: `main` (clean, up to date with origin)
- Last commit: `1a0be27` (docs: rationale comments) + HANDOFF.md removal
- 16+ PRs merged, all CI green
- Working tree clean

## 11. Important files to read first

1. `CONTEXT/AGENTS.md` — global rules, ownership map, conventions
2. `CONTEXT/CONTRACTS.md` — frozen interfaces (LLMClient, Mode, SandboxManager, API, env)
3. `CONTEXT/STATUS.md` — coordination ledger
4. `docs/superpowers/specs/2026-11-02-vultr-agent-rush-design.md` — approved design
5. `backend/app/engine/orchestrator.py` — the brain
6. `backend/app/sandbox/manager.py` — the containment
7. `backend/app/engine/modes/*.py` — the 4 modes
8. `frontend/src/App.jsx` — the UI shell
9. `frontend/src/components/TaskForm.jsx` — the main form
10. `backend/tests/CONTAINMENT_PROOF.md` — demo snippets for the video

---

**Bottom line for the auditor:** This is a working, deployed, tested AI agent platform with real sandbox execution and provable containment. The code is clean and modular. The gap is the pitch (video/slides/README), not the product. The most likely flaws to find are in the areas listed in §8 (in-memory state, no auth, no rate limiting, no frontend tests, Vultr stub unused).
## 12. Multi-step business-value agents (vectors 1, 3, 4, 5, 6)

Each vector is a multi-step pipeline where each step's output feeds the next:

| Vector | Name | Steps | Business value |
|---|---|---|---|
| **vector1** | Messy Data → Decision | profile → clean → analyze → chart → report | Turns hours of Excel work into 30 seconds |
| **vector3** | Invoice Reconciler | extract → parse → reconcile → report → summarize | Automates invoice processing + PO matching |
| **vector4** | Research Synthesizer | fetch → extract claims → cross-reference → report → summarize | Replaces hours of manual research synthesis |
| **vector5** | Incident Investigator | profile → detect anomalies → correlate → hypothesize → verify fix → report | Automates DevOps incident investigation |
| **vector6** | Data Pipeline | profile → clean → analyze → charts → insights | Full data science pipeline in one click |

Each step runs in a separate sandbox, with its own retry budget. Text-only steps skip the sandbox and call the LLM directly. Artifact contents are read back from disk and passed to downstream steps.

All 5 vectors complete successfully (verified live). Each takes 10-60s depending on complexity.