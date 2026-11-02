# TASK 02 — sandbox (Docker Containment)

## Role
Implement the isolated sandbox execution environment — the heart of "Blast Radius Zero".
Everything that executes must run here, contained and disposable.

## Write scope (ONLY these)
- `backend/app/sandbox/**`
- `deploy/**`

FROZEN (read-only): all of `backend/app/engine/**`, `backend/app/llm/**`,
`backend/app/api/**`, `backend/app/main.py`, `backend/app/config.py`, `CONTEXT/CONTRACTS.md`.

## Depends on
- Docker engine available on the host VM (deployment concern; see deploy/).
- Frozen `SandboxManager` / `ExecutionResult` contract (CONTRACTS §3).

## What to build
1. `backend/app/sandbox/manager.py` — implement `SandboxManager.execute(code, files,
   timeout_s) -> ExecutionResult`:
   - Build/use image `SANDBOX_IMAGE` (default `sandbox-runner:latest`).
   - Run with: non-root user, `--read-only` rootfs with writable `/workspace`, `--memory
     SANDBOX_MEMORY`, `--cpus SANDBOX_CPUS`, `--network none` (v1), timeout enforcement.
   - Copy `files` into `/workspace`, run the code, capture stdout/stderr/exit code, copy
     resulting artifacts out to the artifact store, **always destroy the container**
     (`--rm` + explicit cleanup on all paths).
2. `backend/app/sandbox/image/Dockerfile` — `python:3.11-slim`, preinstall
   pandas, matplotlib, plotly, pytest; non-root user; `/workspace` workdir.
3. `backend/app/sandbox/image/requirements.txt` — pinned deps.
4. `deploy/provision-sandbox.sh` — host setup: install Docker engine, build image.
5. `deploy/nginx.conf.example`, `deploy/sandboxed-agent-studio.service` — reverse proxy
   and systemd unit templates (fill reasonable defaults).

## Acceptance criteria
- `execute` runs a hello-world snippet and returns stdout + exit 0.
- Negative tests pass: container cannot read host files, cannot reach network, cannot
  read `/proc/1/environ` of the host, and is destroyed after the task (including on error).
- Resource limits are enforced (memory cap, timeout kills runaway loops).

## Note
No LLM/engine logic here. You are the executor, not the brain.
