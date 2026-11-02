# Vultr Agent Rush — Design Spec

**Project:** Sandboxed Agent Studio (Challenge 1: "Blast Radius Zero")
**Date:** 2026-11-02
**Lead developer:** Mercury (AI lead) — user orchestrates sub-agents from task briefs
**Status:** Design phase — awaiting approval before implementation / agent deployment

---

## Phase 1 — Problem Definition

### 1.1 The problem we are solving

The hackathon asks for a **web-based AI agent that performs real work through code execution**, with every action contained in isolated sandboxes running on Vultr. The app must be a centralized control layer that plans tasks, dispatches execution, and returns verifiable results.

The user-facing problem: **people want AI to do real, hands-on work — analyze data, check/fix code, produce charts — but they cannot trust a model that merely "describes" doing it.** There is no verifiable execution, no isolation, and no proof.

Our answer: **Sandboxed Agent Studio** — a production-style web app where a user submits a task, an agent writes and executes real code inside an ephemeral, isolated sandbox on Vultr, returns actual outputs, and retries intelligently on failure. Trust through containment and evidence.

### 1.2 What success looks like (success criteria)

1. A user can upload a CSV, ask a natural-language question, and get **real** computed results (statistics, filtered tables, charts) — not a simulated answer.
2. A user can submit a code file; the agent runs it in a sandbox, detects failures, proposes and applies fixes, re-runs until green.
3. Every execution happens inside a disposable sandbox with demonstrable containment (no host access, no secrets, resource limits, destroy-after-task).
4. The demo video includes at least one explicit **containment moment**.
5. Submission materials satisfy the mandatory checklist: public GitHub repo, live URL on Vultr, demo video, slide deck, architecture + use-case explanation, README documenting Vultr services.

### 1.3 Constraints

- Online phase: **2026-11-03 → 2026-11-08** (~5 days, zero slack).
- Vultr credits: $200/participant; no GPUs; Vultr Serverless Inference required for Challenge 1.
- Must deploy on Vultr Cloud Compute VM; sandboxes on Vultr infrastructure.
- Feature-rich but must remain demo-safe: everything shipped must work.

---

## Phase 2 — Self-Test (challenging the plan)

Before system design, I interrogated the concept. Each question + resolution:

**Q1. Is code-execution the right modality, or browser automation?**
Both are valid. Code execution is more deterministic, easier to make robust in 5 days, and produces artifacts (tables/charts/logs) that make great demo evidence. Browser automation adds flakiness (anti-bot, selectors, vision verification). **Decision:** v1 is code-execution only; the engine interface leaves room for a browser mode later.

**Q2. What if the model generates malicious or runaway code?**
Containment is not optional. The sandbox enforces: non-root user, read-only filesystem except a scratch workspace, CPU/memory limits, wall-clock timeout, auto-destroy after task. v1 runs with **no external network** in the sandbox (tasks are local-data). The LLM never receives sandbox secrets; the engine holds credentials outside the sandbox.

**Q3. How do we prove "real execution" (not simulated)?**
Visible evidence: execution logs, process-level output, artifact files surfaced in the UI, and a "run card" showing the container id, duration, exit code. The video shows the container actually running and then being destroyed.

**Q4. What is the single biggest demo risk?**
Phase-0 infrastructure (account, credit claim, VM provisioning) — if it stalls, everything stalls. Mitigation: a precise user setup guide, done first, with a fallback plan (pre-provision a second VM early).

**Q5. Infinite retry loops?**
Bounded retries (default 3 attempts per task) with a well-formed error-feedback prompt. After exhaustion, the agent explains the failure honestly rather than looping.

**Q6. Concurrency / multiple users?**
Each task gets its own fresh sandbox, so tasks are naturally isolated. v1 runs tasks through a small worker queue (max 2 concurrent) to protect the VM; the UI shows queue status.

**Q7. Large files / heavy compute?**
Hard limits: upload size cap (e.g., 25 MB), sandbox memory cap, execution timeout, output-size cap. These limits are configurable and visible.

**Q8. Is "one engine, many modes" actually coherent?**
Yes — all modes share the same plan→generate→sandbox→verify→explain loop; only the input shape and evaluation rule differ. This is modular, testable, and inherently "platform-oriented" (which the brief rewards).

**Q9. What does "feature-rich" mean without risking the demo?**
Three fully-polished modes (CSV Analyst, Code Reviewer/Self-Healing Runner, Chart Anything) + one light mode (File Fixer) to prove extensibility, plus a task-history dashboard and artifact viewer. Depth on the core, breadth shown via the pluggable mode registry.

**Q10. How do we verify results objectively?**
Per-mode verification rules run *outside* the model's judgment: exit code, expected artifact existence, and where possible a generated unit test run inside the sandbox. The engine marks a run PASS/FAIL based on these, not on the model claiming success.

---

## Phase 3 — System Design

### 3.1 Architecture overview

```
┌─────────────────────────── Vultr VM (Cloud Compute) ───────────────────────────┐
│                                                                              │
│   Browser ──▶ Frontend (React SPA) ──▶ API (FastAPI) ──▶ Engine (Orchestrator)│
│                                              │                │              │
│                                              │                ▼              │
│                                              │        LLM Client ──▶ Vultr  │
│                                              │        (plan/gen/reason)  Serverless
│                                              │                   │      Inference
│                                              │                   ▼              │
│                                              │        Sandbox Manager ──▶ Docker │
│                                              │        (spawn/limit/destroy)  engine│
│                                              │                   │              │
│                                              ▼                   ▼              │
│                                        Run/Artifact DB     Ephemeral sandbox    │
│                                        (SQLite + files)   container (task-scoped)│
└──────────────────────────────────────────────────────────────────────────────┘
```

- **The web app runs directly on the Vultr VM** (not inside a container). The engine uses the Docker SDK to spawn sibling, ephemeral sandbox containers. This avoids Docker-in-Docker and keeps the host clean.
- **All state** (task records, artifacts) lives on the VM; artifacts are copied out of the sandbox after execution and served by the API.

### 3.2 Components

| Component | Responsibility |
|---|---|
| **Frontend (React SPA)** | Task submission per mode, live progress (SSE), artifact viewer (tables/charts/logs), run-history dashboard, containment summary card |
| **API layer (FastAPI)** | REST endpoints: create task, list tasks, get task/run detail, fetch artifacts; Server-Sent Events for progress; auth via simple session token |
| **Engine (Orchestrator)** | The agentic loop state machine: interpret → plan → generate code → sanitize → sandbox-execute → verify → explain → (bounded) retry on failure |
| **LLM Client** | OpenAI-compatible client pointed at Vultr Serverless Inference (`https://api.vultrinference.com/v1`). Used for planning, code generation, error-feedback, final explanation |
| **Sandbox Manager** | Builds the base image once; per task: spawn container with limits, run code, capture stdout/stderr/exit code, copy artifacts out, **always destroy** |
| **Mode Registry** | Pluggable definitions: input schema, code template/prompt, verification rule, artifact expectations. Modes: `csv`, `coder`, `chart`, `fix` |
| **Run/Artifact Store** | SQLite for task/attempt records; filesystem for artifacts (served statically) |

### 3.3 The agentic loop (core engine)

```
1. INTERPRET   — normalize user input into a task object (mode + inputs)
2. PLAN        — LLM produces a concise execution plan (steps, libraries)
3. GENERATE    — LLM writes code for the sandbox (mode-specific template)
4. SANITIZE    — inject guardrails: no env/secret access, bounded work
5. EXECUTE     — Sandbox Manager runs it; capture stdout/stderr/exit code
6. VERIFY      — mode-specific rule: artifact exists? test passes? exit 0?
7. EXPLAIN     — LLM summarizes what happened, citing real output
8. RETRY?      — on FAIL and attempts < 3: feed error back → step 3
9. FINALIZE    — persist run card, copy artifacts, send event
```

### 3.4 Containment design (the "Blast Radius Zero" core)

| Requirement | Implementation |
|---|---|
| **Process isolation** | Code runs in a separate Docker container on the host — never in the app process. Non-root user, read-only root filesystem, writable `/workspace` only |
| **Secret hygiene** | No API keys/credentials ever enter the sandbox. The engine (outside) calls the LLM; sandbox has no secrets, and (v1) no network |
| **Resource limits** | `--memory 512m`, `--cpus 0.5`, wall-clock timeout (60s default), output size cap |
| **Lifecycle discipline** | Container is destroyed after every task regardless of outcome (`--rm` + explicit cleanup). No sandbox outlives its task |
| **Network** | v1: `--network none`. Future modes can opt into a whitelisted egress |

### 3.5 Data model (SQLite)

```
tasks(id, mode, status[queued|running|passed|failed], created_at, inputs_meta)
attempts(id, task_id, attempt_no, status, exit_code, duration_ms,
         error_summary, code_hash)
artifacts(id, task_id, attempt_id, name, kind[table|chart|log|file], path)
```

### 3.6 Modes

| Mode | Input | What runs in sandbox | Verification |
|---|---|---|---|
| **csv** | CSV file + question | pandas script (generated) computes the answer | exit 0 + output artifact(s) present |
| **coder** | Code file (Python) | runs the file; on failure, agent proposes patch and re-runs | exit 0 (or test pass) |
| **chart** | CSV/JSON + chart request | generates plot (matplotlib/plotly) | chart artifact exists + renderable |
| **fix** (light) | file + error/desired change | applies edit, re-runs | exit 0 + diff artifact |

### 3.7 Error handling & edge cases

- **LLM call failure / timeout** → retry with backoff; if persistent, surface a clear error.
- **Sandbox spawn failure** → quarantine message; VM health checked.
- **Empty/ambiguous input** → engine asks one clarifying question back (single turn).
- **Oversized input / resource breach** → task rejected with explicit reason (and UI shows the limit).
- **Retry exhaustion** → honest failure explanation + what the user could change.

### 3.8 LLM provider abstraction

The engine must never talk to a specific vendor directly — it depends on a small `LLMClient` interface. This is what makes the OpenRouter-default / Vultr-stub switching safe and clean.

```
LLMClient (interface)
├── generate(prompt, system, max_tokens) -> str
├── generate_json(prompt, schema) -> dict     # structured planning output
└── provider_name -> str
```

**Provider implementations:**

| Provider | Status in v1 | How |
|---|---|---|
| **OpenRouter** | ✅ Active (default) | Anthropic SDK: `anthropic.Anthropic(base_url="https://openrouter.ai/api/v1", api_key=...)`, `client.messages.create(model="anthropic/claude-3.5-sonnet", ...)`. Model chosen at boot from env `OR_MODEL`. |
| **Vultr Serverless Inference** | ⛔ Disabled stub | OpenAI-compatible client pointed at `https://api.vultrinference.com/v1`. Code present, gated behind `VULTR_LLM_ENABLED=true` + `VULTR_LLM_API_KEY` + `VULTR_LLM_MODEL`. When enabled, it becomes the primary provider |

**Routing rule:** if `VULTR_LLM_ENABLED=true` and the key is present → Vultr; else → OpenRouter. The engine only sees `LLMClient`.

**To enable Vultr later, we will want (from Vultr docs):** the exact auth header format, the model ID list, and whether `messages.create` maps to `/v1/chat/completions`. The hackathon brief confirms endpoint + OpenAI compatibility; docs site was unreachable from this environment at design time.

---

## Phase 4 — Tech Stack & Required Pieces

| Need | Choice | Why |
|---|---|---|
| Backend/API | Python 3.11 + **FastAPI** + Uvicorn | Fast to build, async-friendly for SSE |
| Engine/orchestration | Custom lightweight state machine + **LLMClient abstraction** (Anthropic SDK for OpenRouter; OpenAI-compatible client for Vultr stub) | Fewer deps, full control; provider-agnostic by design |
| LLM | **Dual-provider**: OpenRouter via Anthropic SDK (active default) + disabled Vultr Serverless Inference stub (`https://api.vultrinference.com/v1`, OpenAI-compatible) | Vultr required by Challenge 1; OpenRouter keeps us unblocked until the key exists |
| Sandbox | **Docker** (Ubuntu VM) + base `python:3.11-slim` image with pandas/matplotlib/plotly/pytest preinstalled | Mature, standard, meets "isolated sandbox" requirement |
| Frontend | **React + Vite + Tailwind** (SPA served by FastAPI/nginx) | Production-style look; fast for agents to build |
| Data | **SQLite** (task history) + filesystem artifact store | Zero-ops; Postgres/Supabase upgrade path noted |
| Deployment | Vultr Cloud Compute VM (Ubuntu), nginx reverse proxy, systemd services, Docker engine | Required by the brief |
| Submission pack | Public GitHub repo, README (Vultr services + architecture), demo video (MP4), slide deck (PDF), architecture/use-case doc | Mandatory list |

### Infrastructure checklist (user hands-on — "Phase 0")

1. Create Vultr account (new email) + claim $200 credit via gift code.
2. Provision one Ubuntu VM (plan for ~$10–20/mo class; deprovision after event).
3. Install Docker engine on VM; open ports 80/443 (app) only.
4. Create Vultr Serverless Inference API key (kept on VM, never in sandbox).
5. Provide me the deploy credentials/tokens per my setup guide.

---

## Testing & Verification Plan

- **Unit:** engine state machine transitions; mode registry; retry budget logic.
- **Integration:** real sandbox execution of each mode with fixture inputs; artifact copy-out.
- **Containment negative tests:** attempt host-file read, env-var exfiltration, `docker` escape — assert blocked; assert container destroyed after run.
- **E2E:** browser flow for each mode; UI shows progress and artifacts.
- **Demo rehearsal:** scripted walkthrough mapping each judging criterion to a screen moment.

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Phase-0 infra stalls | Medium | Critical | User setup guide first; provision 2nd VM early as spare |
| Model code quality variance | Medium | High | Retry loop + strong templates + verification rules |
| Demo-day demo failure | Low-Med | High | Rehearsal; pre-recorded fallback clip |
| Time overrun | High | High | Cut list: drop `fix` mode, then `chart`; core `csv`+`coder` always shipped |

## Decisions (locked)

1. **Frontend:** React SPA (Vite + Tailwind) — confirmed.
2. **Mode set:** 3 polished modes (`csv`, `coder`, `chart`) + `fix` light mode — confirmed.
3. **LLM provider:** **Dual-provider abstraction** (see §3.8 below). Default active path = **OpenRouter via the Anthropic SDK** (`base_url=https://openrouter.ai/api/v1`, Anthropic-style `client.messages.create`). A **disabled Vultr Serverless Inference stub** ships in the codebase, ready to be enabled once the user has Vultr LLM access. Vultr endpoint per hackathon brief: `https://api.vultrinference.com/v1` (OpenAI-compatible).
4. **Repository:** public GitHub repo named **`blasted`**, created via `gh` CLI.
