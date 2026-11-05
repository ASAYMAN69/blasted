# Sandboxed Agent Studio

Web app where an AI agent performs **real work** (code execution) inside isolated,
disposable sandboxes on Vultr — returns verifiable results. Built for the
**Vultr Agent Rush Hackathon** (Challenge 1: Blast Radius Zero).

**Live:** http://45.76.2.228
**Repo:** https://github.com/ASAYMAN69/blasted

## What it does

Submit a task in plain English. The agent plans, writes, and runs real code inside an
isolated Docker sandbox on Vultr, then returns the actual output — not a description.
Every sandbox is destroyed after the task. No network, no secrets, no escape.

### Four legacy modes
| Mode | Input | Output |
|---|---|---|
| **CSV Analyst** | CSV + question | Real stats + chart + structured JSON |
| **Code Reviewer** | Python file + goal | Self-heals broken code, re-runs until green |
| **Chart Anything** | Data + chart request | Real PNG/HTML chart (5 palettes, 7 chart types) |
| **File Fixer** | File + desired behavior | Unified diff + verified re-run |

### Five multi-step business-value agents
| Agent | Pipeline | Business value |
|---|---|---|
| **Messy Data → Decision** | profile → clean → analyze → chart → report | Turns hours of Excel work into 30 seconds |
| **Invoice Reconciler** | extract → parse → reconcile → report → summarize | Automates invoice processing + PO matching |
| **Research Synthesizer** | fetch → extract claims → cross-reference → report → summarize | Replaces hours of manual research synthesis |
| **Incident Investigator** | profile → detect anomalies → correlate → hypothesize → verify fix → report | Automates DevOps incident investigation |
| **Data Pipeline** | profile → clean → analyze → charts → insights | Full data science pipeline in one click |

## Vultr services used

- **Vultr Cloud Compute VM** — hosts the FastAPI backend, nginx reverse proxy, and
  Docker engine. All sandbox containers run on this VM.
- **Vultr Serverless Inference** — primary LLM provider (`api.vultrinference.com/v1`,
  OpenAI-compatible). Used for plan generation, code generation, and result summarization.
  Model: `mimo-v2.6-flash`.
- **Isolated sandbox** — each task runs in a disposable Docker container with:
  non-root user, read-only rootfs, no network, memory/CPU limits, wall-clock timeout,
  force-removed after every task.

## Architecture

```
Browser → nginx :80 → FastAPI/uvicorn 127.0.0.1:8000 (systemd)
  ├── serves built SPA (frontend/dist)
  ├── /api/* REST + SSE endpoints
  ├── Orchestrator (agentic loop: plan→generate→execute→verify→explain→retry)
  ├── LLM Client → Vultr Serverless Inference (primary) → Ollama/OpenRouter (fallback)
  └── SandboxManager → Docker containers (per-task, destroyed after)
```

## How Vultr powers the solution

1. **VM backend** runs the app, nginx, Docker, and the LLM client — Vultr is the
   central control and orchestration infrastructure.
2. **Serverless Inference** provides the LLM for all agent calls — plan generation,
   code generation, error feedback, and result summarization.
3. **Docker sandboxes** execute AI-generated code with strict containment: no network,
   read-only filesystem, non-root user, resource limits, destroyed after every task.
4. **Public demo URL** served via nginx on the VM's public IP.

## How the agent executes real tasks

1. User submits a task (mode + inputs) via the web UI
2. Orchestrator creates a Task and streams progress via SSE
3. LLM (Vultr Serverless Inference) generates a plan (English, no code)
4. LLM generates code (mode-specific prompt template)
5. Code runs in an isolated Docker sandbox on the VM
6. Mode's `verify()` checks exit code + artifacts + structured output
7. On failure: error fed back → code regenerated → re-run (bounded, default 3 attempts)
8. On success: LLM summarizes → artifacts persisted → result streamed to browser
9. Sandbox container destroyed

## Containment proof

The sandbox enforces 8 guarantees, verified by 12 negative tests:
- Non-root user, read-only rootfs, no network, memory/CPU limits, wall-clock timeout,
  container destroyed after every task, no secrets in sandbox, bounded retries.

## Setup (on Vultr VM)

```bash
git clone https://github.com/ASAYMAN69/blasted.git /opt/sandboxed-agent-studio
cd /opt/sandboxed-agent-studio
bash deploy/provision-sandbox.sh
python3 -m venv backend/.venv
backend/.venv/bin/pip install -e 'backend[dev]'
cd frontend && npm install --legacy-peer-deps && npm run build && cd ..

# Configure .env (see backend/.env.example)
cp backend/.env.example .env
# Set VULTR_LLM_API_KEY, VULTR_LLM_MODEL=mimo-v2.6-flash, VULTR_LLM_ENABLED=true

# Run
backend/.venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Or use the systemd service: `cp deploy/sandboxed-agent-studio.service /etc/systemd/system/ && systemctl enable --now sandboxed-agent-studio`

## Tech stack

- **Backend:** Python 3.10, FastAPI, Uvicorn, Docker SDK, Pydantic, SQLite
- **Frontend:** React 18, Vite 5, Tailwind 3, Framer Motion 14
- **LLM:** Vultr Serverless Inference (primary), Ollama/OpenRouter (fallback)
- **Sandbox:** Docker, python:3.11-slim, pandas, matplotlib, plotly
- **Deploy:** Vultr Cloud Compute, nginx, systemd, GitHub Actions CI/CD

## Tests

```bash
cd /mnt/ee/aprojects/brz/brzv2  # or /opt/sandboxed-agent-studio on VM
backend/.venv/bin/pytest backend/tests -q
# 52 tests: unit + integration (real Docker) + 12 containment negative tests
```

## License

MIT
EOF
echo "README written"