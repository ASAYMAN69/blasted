# HANDOFF.md — Sandboxed Agent Studio (blasted)

**Date:** 2026-11-04
**Repo:** https://github.com/ASAYMAN69/blasted (public, main branch)
**Live app:** http://45.76.2.228
**Event:** Vultr: Agent Rush Hackathon — Challenge 1 "Blast Radius Zero" (online phase ends 2026-11-08)

---

## 1. What this project is

A **web-based AI agent that performs real work through code execution**, with every action contained in isolated, disposable sandboxes on Vultr. The app is a centralized control layer that plans tasks, dispatches execution, and returns verifiable results.

**Challenge 1: "Blast Radius Zero"** — build a sandboxed agent. We built:
- 4 modes: CSV Analyst, Code Reviewer (self-healing), Chart Anything, File Fixer
- Docker-based sandboxes: no network, read-only rootfs, non-root user, resource limits, destroyed after every task
- LLM integration: Ollama Cloud (gemma4:31b-cloud) via Anthropic SDK, OpenRouter fallback
- Full CI/CD pipeline: branch → CI → PR → review → merge → auto-deploy to Vultr
- Modern frontend: dark premium UI, Framer Motion, mobile-first, sharp corners

## 2. Current state

### What's DONE
- ✅ Product is fully functional (all 4 modes work end-to-end on live VM)
- ✅ Backend: clean, linted (ruff), 52 tests passing
- ✅ Frontend: modern dark UI, mobile-first, animations, CSV preview, quick actions, chart customization
- ✅ CI/CD: GitHub Actions CI + CD (auto-deploy to Vultr on merge to main)
- ✅ Branch protection: requires both CI checks before merge
- ✅ Live at http://45.76.2.228 (verified working)
- ✅ Vultr VM deployed (2 vCPU/4GB, Ubuntu 22.04, Docker sandbox image built)
- ✅ Codebase documented with rationale comments

### What's NOT done (the gap)
- ❌ **Demo video (MP4/MOV)** — REQUIRED for submission. Not started.
- ❌ **Slide deck (PDF)** — REQUIRED for submission. Not started.
- ❌ **README** — still a placeholder. Must document Vultr services, architecture, use-case.
- ❌ **Architecture/use-case writeup** — partial (DEPLOYMENT.md + CICD.md exist, full writeup pending)
- ❌ **Vultr LLM client** — still a disabled stub (using Ollama instead, which works fine)
- ⚠️ **Vultr Serverless Inference** — not used yet (Challenge 1 requires it; we use Ollama + OpenRouter as fallback). The stub is ready to enable when docs are available.

## 3. Architecture

```
Browser → nginx :80 → FastAPI/uvicorn 127.0.0.1:8000
  ├── serves built SPA (frontend/dist)
  ├── /api/* routes (tasks, modes, artifacts, events SSE)
  ├── Orchestrator (agentic loop: plan→generate→execute→verify→explain→retry)
  ├── LLM Client (Ollama primary → OpenRouter fallback → Vultr stub)
  └── SandboxManager → Docker containers (network=none, read-only, destroyed after)
```

### Key files
| Path | Purpose |
|---|---|
| `backend/app/engine/orchestrator.py` | Agentic loop + Task/RunResult models + extract_parsed |
| `backend/app/sandbox/manager.py` | Docker sandbox executor (containment) |
| `backend/app/engine/modes/*.py` | 4 modes (csv, coder, chart, fix) |
| `backend/app/llm/*.py` | LLM clients (ollama, openrouter, vultr stub) |
| `backend/app/api/routes.py` | REST + SSE endpoints |
| `backend/app/main.py` | FastAPI app + CORS + static serving |
| `frontend/src/` | React SPA (Vite + Tailwind + Framer Motion) |
| `frontend/src/api.js` | API client (configurable backend origin) |
| `frontend/src/components/` | UI components |
| `CONTEXT/` | Agent coordination (AGENTS.md, CONTRACTS.md, STATUS.md, TASKS/) |
| `docs/submission/` | Submission materials (partially done) |
| `deploy/` | Provisioning scripts, nginx, systemd unit |

### Backend contract (frozen)
See `CONTEXT/CONTRACTS.md` for the full interface spec (LLMClient, Mode, SandboxManager, Task/RunResult, HTTP API, env vars).

### Env vars (on the VM at /opt/sandboxed-agent-studio/.env)
```
OLLAMA_API_KEY=<ollama key>
OLLAMA_API_BASE=https://ollama.com
OLLAMA_MODEL=gemma4:31b-cloud
OPENROUTER_API_KEY=<openrouter key>
OPENROUTER_API_URL=https://openrouter.ai/api/v1/chat/completions
OR_MODEL=nvidia/nemotron-3-ultra-550b-a55b:free
SANDBOX_MEMORY=512m
SANDBOX_CPUS=0.5
SANDBOX_TIMEOUT_S=60
SANDBOX_IMAGE=sandbox-runner:latest
```

## 4. How to work on this

### Local dev
```bash
cd /mnt/ee/aprojects/brz/brzv2
# Backend
backend/.venv/bin/uvicorn backend.app.main:app --port 8000
# Frontend (separate terminal)
cd frontend && npm run dev   # http://localhost:5173
```

### Tests
```bash
cd /mnt/ee/aprojects/brz/brzv2
backend/.venv/bin/pytest backend/tests -q   # 52 tests, ~80s, needs Docker
```

### Lint
```bash
cd /mnt/ee/aprojects/brz/brzv2/backend
.venv/bin/ruff check .
```

### Deploy (auto via CI/CD)
1. Create branch: `git checkout -b feat/my-change`
2. Edit code
3. Push: `git push -u origin feat/my-change`
4. CI runs automatically (tests + build)
5. Create PR: `gh pr create --base main --head feat/my-change`
6. Review + merge: `gh pr merge <N> --squash --delete-branch`
7. CD auto-deploys to http://45.76.2.228

### Manual deploy (on the VM)
```bash
ssh root@45.76.2.228
cd /opt/sandboxed-agent-studio
bash deploy/update.sh
```

## 5. What to do next (prioritized)

### P1 — Demo video (REQUIRED for submission)
- 90-second script (see `docs/submission/DEMO-SCRIPT.md` — needs to be written)
- Must include a **containment moment**: show sandbox trying to read host secrets → fails → container destroyed
- Show all 4 modes working with real data
- Export as MP4
- The app is live at http://45.76.2.228 — record against it

### P2 — Slide deck (REQUIRED, PDF format)
- 8-10 pages: problem → architecture → containment → demo screenshots → business value → tech stack
- Keep visual, not text-heavy

### P3 — README + architecture writeup
- README: Vultr services used, backend/deployment architecture, agent use-case, how it executes real tasks
- `docs/submission/ARCHITECTURE.md`: deeper architecture + data-flow writeup
- Both are mandatory submission items

### P4 — Enable Vultr Serverless Inference (optional but nice for judging)
- The stub is at `backend/app/llm/vultr.py` — needs Vultr docs to finish
- Currently using Ollama (works fine, but Vultr integration scores higher on "Application of Technology")
- To enable: set `VULTR_LLM_ENABLED=true`, `VULTR_LLM_API_KEY`, `VULTR_LLM_MODEL` in `.env`

### P5 — Multi-file upload (nice-to-have)
- Backend already supports `files` dict
- Frontend only has single-file upload
- See conversation for the design (dropzone + list + size limits + concurrent task cap)

## 6. Key gotchas

1. **Python 3.10 on the VM** (Ubuntu 22.04) — pyproject allows `>=3.10`
2. **`.env` must be readable by `sandbox` user** — `chown sandbox:sandbox .env`, `chmod 600`
3. **Sandbox workspace permissions** — `mkdtemp` 0700 blocks the container's `runner` user; fixed by chmod 0777/0666
4. **No package-lock.json** — use `npm install --legacy-peer-deps` (not `npm ci`)
5. **Git dubious ownership** — service user `sandbox` can't read root-owned repo; fixed via `git config --system safe.directory`
6. **Free model is slow** — ~5-15s per attempt; add OpenRouter credits for better quality/speed
7. **Self-approval impossible on GitHub** — approval recorded as PR comment; merge proceeds via admin rights

## 7. Submission checklist (from HACKATHON.md)

- [ ] Project title
- [ ] Short description
- [ ] Long description
- [ ] Technology tags
- [ ] Category tags
- [ ] Cover image (16:9, optional)
- [ ] Video presentation (MP4/MOV) — REQUIRED
- [ ] Slide presentation (PDF) — REQUIRED
- [ ] Public GitHub repository — ✅ https://github.com/ASAYMAN69/blasted
- [ ] Public application URL — ✅ http://45.76.2.228
- [ ] Vultr infrastructure documentation — ⏳ (in README, pending)

## 8. Important files to read first

1. `CONTEXT/AGENTS.md` — global rules, ownership map, conventions
2. `CONTEXT/CONTRACTS.md` — frozen interfaces (LLMClient, Mode, SandboxManager, API, env)
3. `CONTEXT/STATUS.md` — coordination ledger (what's done, what's open)
4. `docs/superpowers/specs/2026-11-02-vultr-agent-rush-design.md` — approved design
5. `CONTEXT/PHASE0-VULTR-SETUP.md` — Vultr setup guide
6. `docs/CICD.md` — CI/CD pipeline docs
7. `docs/submission/DEPLOYMENT.md` — production deployment guide
8. `backend/tests/CONTAINMENT_PROOF.md` — containment test snippets for the demo video

## 9. Git state

- Branch: `main` (clean, up to date with origin)
- Last commit: `1a0be27` (docs: rationale comments)
- 16+ PRs merged, all CI green
- Working tree clean (no uncommitted changes)

---

**Bottom line:** The product is done and deployed. The gap is the **video + slides + README**. That's what will determine the score. Everything else is a nice-to-have.