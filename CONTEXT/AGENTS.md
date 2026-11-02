# AGENTS.md — Global Context (READ FIRST)

This file is the **single source of truth** for how agents work in this repository.
Every agent (including sub-agents deployed in parallel) MUST read this file plus its
own task brief in `CONTEXT/TASKS/` before doing anything.

---

## Project

- **Name:** Sandboxed Agent Studio (repo: `blasted`)
- **Event:** Vultr Agent Rush Hackathon — Challenge 1 "Blast Radius Zero"
- **Objective:** Web app where an AI agent performs *real work* (code execution) inside
  isolated, disposable sandboxes on Vultr; verifiable results; containment is the story.
- **Lead developer:** Mercury (this agent). The human operator deploys sub-agents and
  handles all git operations.

## Design document

The approved design lives at:
`docs/superpowers/specs/2026-11-02-vultr-agent-rush-design.md`

It is authoritative. If your task brief contradicts the design, STOP and ask the lead.

## Repository layout (ownership map)

| Path | Owner agent | Write scope |
|---|---|---|
| `backend/app/engine/orchestrator.py`, `backend/app/engine/__init__.py` | `engine` | ✅ writes |
| `backend/app/llm/**` | `engine` | ✅ writes |
| `backend/app/api/**`, `backend/app/main.py`, `backend/app/config.py` | `engine` | ✅ writes |
| `backend/app/sandbox/**` | `sandbox` | ✅ writes |
| `deploy/**` | `sandbox` | ✅ writes |
| `backend/app/engine/modes/csv_mode.py` | `csv` | ✅ writes |
| `backend/app/engine/modes/coder_mode.py` | `coder` | ✅ writes |
| `backend/app/engine/modes/chart_mode.py` | `chart` | ✅ writes |
| `backend/app/engine/modes/fix_mode.py` | `fix` | ✅ writes |
| `frontend/**` | `frontend` | ✅ writes |
| `backend/tests/**` | `qa` | ✅ writes |
| `README.md`, `docs/submission/**` | `submission` | ✅ writes |
| `backend/app/engine/modes/base.py` | — | 🔒 FROZEN (read-only) |
| `backend/app/engine/modes/__init__.py` | — | 🔒 FROZEN (read-only) |
| `backend/app/llm/base.py` | — | 🔒 FROZEN (read-only) |
| `backend/app/store/**` | — | 🔒 FROZEN (read-only) |
| `CONTEXT/**` | lead | 🔒 lead-managed; append to `STATUS.md` only |

**Rules**
- Write ONLY inside your declared write scope. Never edit files outside it.
- FROZEN files define contracts. You may read them freely; you may NEVER modify them.
- If you need a change to a frozen contract, record it in `CONTEXT/STATUS.md` under
  "contract change requests" — do not edit the file yourself.
- Coordinate through `CONTEXT/STATUS.md`. The lead reads it and resolves conflicts.

## Conventions

- **Language/stack:** Python 3.11 backend (FastAPI), React + Vite + Tailwind frontend.
- **Type hints:** required on all public signatures.
- **Style:** PEP 8; keep functions small; docstring on every public function/class.
- **Tests:** put tests for your code under `backend/tests/` (QA agent owns that dir —
  place them, but let `qa` wire the harness). If write scope blocks you, note it in STATUS.
- **Commits:** the human operator commits. Do not run git unless your brief says so.
- **No secrets:** never write API keys, tokens, or credentials into any file. Use env vars.

## Communication protocol

- Read `CONTEXT/TASKS/<your-task>.md` for your assignment.
- While working, report progress/blockers in `CONTEXT/STATUS.md` (append under your
  agent name). Never delete others' entries.
- When done, mark your task DONE in STATUS.md and summarize what you built and how to verify it.

## Dependency order (for the human operator deploying agents)

0. **Phase 0 (human):** `CONTEXT/PHASE0-VULTR-SETUP.md` — Vultr account/credit/VM,
   Docker, `.env`. Required before any agent that executes can be tested end-to-end.
1. `sandbox` (Docker containment) — needed by everything that executes
2. `engine` (orchestrator + LLM client) — depends on sandbox interface
3. `csv`, `coder`, `chart`, `fix` (modes) — depend on frozen mode base + engine
4. `frontend` — depends on API contract
5. `qa` — depends on all of the above
6. `submission` — last; consumes finished repo
