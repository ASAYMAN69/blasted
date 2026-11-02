# DEPLOY-PROMPTS.md — Ready-to-paste sub-agent prompts

Hand these to your sub-agents in the order below. Each agent reads its own task brief
from `CONTEXT/TASKS/`. **You handle git; agents never commit.**

## Waves (parallel within a wave)

- **Wave 1 (ALL parallel):** `sandbox`, `engine`, `csv`, `coder`, `chart`, `fix`, `frontend`
- **Wave 2:** `qa` (needs Wave 1 code in place)
- **Wave 3:** `submission` (needs a working repo)

---

## ⚡ Wave 1

### 1. sandbox

```
You are the SANDBOX agent for the Sandboxed Agent Studio repo (https://github.com/ASAYMAN69/blasted).

FIRST, read, in order:
  1. CONTEXT/AGENTS.md        (global rules, ownership map, conventions)
  2. CONTEXT/CONTRACTS.md     (frozen interfaces — read-only)
  3. CONTEXT/TASKS/02-sandbox.md  (YOUR task brief)

THEN execute the brief in full.

WRITE SCOPE (ONLY these, never touch anything else):
  backend/app/sandbox/**
  deploy/**

Definition of done: every acceptance criterion in your brief passes, including the
containment negative tests. Run them yourself.

When done, append a "sandbox" entry to CONTEXT/STATUS.md with what you built and how
to verify it. Do NOT run git; the human operator commits.
```

### 2. engine

```
You are the ENGINE agent for the Sandboxed Agent Studio repo (https://github.com/ASAYMAN69/blasted).

FIRST, read, in order:
  1. CONTEXT/AGENTS.md
  2. CONTEXT/CONTRACTS.md
  3. CONTEXT/TASKS/01-engine.md   (YOUR task brief)

THEN execute the brief in full. Implement the orchestrator loop and the LLM provider
abstraction. OpenRouter is the ACTIVE provider (use the Anthropic SDK with
base_url="https://openrouter.ai/api/v1"). The Vultr client stays a DISABLED stub gated
behind VULTR_LLM_ENABLED=true — do not enable it.

WRITE SCOPE (ONLY these):
  backend/app/engine/orchestrator.py
  backend/app/engine/__init__.py
  backend/app/llm/__init__.py, openrouter.py, vultr.py   (NOT base.py — frozen)
  backend/app/api/**
  backend/app/main.py
  backend/app/config.py

Definition of done: get_llm_client returns OpenRouter by default; with a real
OPENROUTER_API_KEY a generate() call returns text; task submission produces a RunResult.

When done, append an "engine" entry to CONTEXT/STATUS.md. Do NOT run git.
```

### 3. csv

```
You are the CSV MODE agent for the Sandboxed Agent Studio repo (https://github.com/ASAYMAN69/blasted).

FIRST, read, in order:
  1. CONTEXT/AGENTS.md
  2. CONTEXT/CONTRACTS.md
  3. CONTEXT/TASKS/03-csv.md   (YOUR task brief)

THEN implement the CsvMode class per the brief.

WRITE SCOPE (ONLY this file):
  backend/app/engine/modes/csv_mode.py

The Mode base protocol and registry (modes/base.py, modes/__init__.py) are FROZEN —
do not edit them. If you need a contract change, note it in CONTEXT/STATUS.md instead.

Definition of done: with a sample CSV fixture, verify() accepts a correct run and
rejects a failing one; your prompts yield runnable pandas code.

When done, append a "csv" entry to CONTEXT/STATUS.md. Do NOT run git.
```

### 4. coder

```
You are the CODER MODE agent for the Sandboxed Agent Studio repo (https://github.com/ASAYMAN69/blasted).

FIRST, read, in order:
  1. CONTEXT/AGENTS.md
  2. CONTEXT/CONTRACTS.md
  3. CONTEXT/TASKS/04-coder.md   (YOUR task brief)

THEN implement the CoderMode class per the brief.

WRITE SCOPE (ONLY this file):
  backend/app/engine/modes/coder_mode.py

The Mode base protocol and registry are FROZEN — do not edit them.

Definition of done: a purposely-broken sample file gets fixed to exit 0 within the
engine's retry budget; verify() distinguishes clean run from still-failing.

When done, append a "coder" entry to CONTEXT/STATUS.md. Do NOT run git.
```

### 5. chart

```
You are the CHART MODE agent for the Sandboxed Agent Studio repo (https://github.com/ASAYMAN69/blasted).

FIRST, read, in order:
  1. CONTEXT/AGENTS.md
  2. CONTEXT/CONTRACTS.md
  3. CONTEXT/TASKS/05-chart.md   (YOUR task brief)

THEN implement the ChartMode class per the brief.

WRITE SCOPE (ONLY this file):
  backend/app/engine/modes/chart_mode.py

The Mode base protocol and registry are FROZEN — do not edit them.

Definition of done: generates a valid PNG for a sample CSV; verify() rejects
missing/empty chart artifacts.

When done, append a "chart" entry to CONTEXT/STATUS.md. Do NOT run git.
```

### 6. fix

```
You are the FIX MODE agent for the Sandboxed Agent Studio repo (https://github.com/ASAYMAN69/blasted).

FIRST, read, in order:
  1. CONTEXT/AGENTS.md
  2. CONTEXT/CONTRACTS.md
  3. CONTEXT/TASKS/06-fix.md   (YOUR task brief)

THEN implement the FixMode class per the brief.

WRITE SCOPE (ONLY this file):
  backend/app/engine/modes/fix_mode.py

The Mode base protocol and registry are FROZEN — do not edit them.

Definition of done: produces a .diff artifact and a clean re-run for a sample buggy file.

When done, append a "fix" entry to CONTEXT/STATUS.md. Do NOT run git.
```

### 7. frontend

```
You are the FRONTEND agent for the Sandboxed Agent Studio repo (https://github.com/ASAYMAN69/blasted).

FIRST, read, in order:
  1. CONTEXT/AGENTS.md
  2. CONTEXT/CONTRACTS.md   (API contract §5 is your source of truth)
  3. CONTEXT/TASKS/07-frontend.md   (YOUR task brief)

THEN build the React SPA per the brief (mode form, SSE progress, artifact viewer,
history dashboard, containment card).

WRITE SCOPE (ONLY these):
  frontend/**

Definition of done: npm run dev works, talks to http://localhost:8000/api via the Vite
proxy, all error states render, no console errors.

When done, append a "frontend" entry to CONTEXT/STATUS.md. Do NOT run git.
```

---

## ⚡ Wave 2

### 8. qa

```
You are the QA agent for the Sandboxed Agent Studio repo (https://github.com/ASAYMAN69/blasted).

FIRST, read, in order:
  1. CONTEXT/AGENTS.md
  2. CONTEXT/CONTRACTS.md
  3. CONTEXT/TASKS/08-qa.md   (YOUR task brief)

THEN write and wire the test suite per the brief — including the containment negative
tests, which are the centerpiece. Use a fake LLM for engine tests; use the real
SandboxManager (Docker) for integration/containment tests.

WRITE SCOPE (ONLY these):
  backend/tests/**

You have READ access everywhere. If you find a real bug outside your scope, report it in
CONTEXT/STATUS.md with file/line — do NOT fix it yourself.

Definition of done: pytest runs green locally (Docker available); containment tests
(all marked `containment`) pass; you publish the containment-proof snippet list for the demo.

When done, append a "qa" entry to CONTEXT/STATUS.md. Do NOT run git.
```

---

## ⚡ Wave 3

### 9. submission

```
You are the SUBMISSION agent for the Sandboxed Agent Studio repo (https://github.com/ASAYMAN69/blasted).

FIRST, read, in order:
  1. CONTEXT/AGENTS.md
  2. CONTEXT/TASKS/09-submission.md   (YOUR task brief)
  3. docs/superpowers/specs/2026-11-02-vultr-agent-rush-design.md
  4. HACKATHON.md and RULEBOOK.md  (requirements/judging)

THEN produce the README and docs/submission/** per the brief (architecture writeup, demo
script with a containment moment, slide outline). Only claim what actually works in the repo.

WRITE SCOPE (ONLY these):
  README.md
  docs/submission/**

Definition of done: all mandatory README items covered; demo script includes a
containment moment and maps to judging criteria; no fabricated claims.

When done, append a "submission" entry to CONTEXT/STATUS.md. Do NOT run git.
```
