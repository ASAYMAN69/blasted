# Deployment — Vultr Production

**Live URL:** http://45.76.2.228

Deployed 2026-11-03 on Vultr Cloud Compute (2 vCPU / 4GB, Ubuntu 22.04, hostname `brz`).

## Topology

```
Internet :80
   │
 nginx (reverse proxy, proxy_buffering off for SSE)
   │
 FastAPI/uvicorn  127.0.0.1:8000   (systemd: sandboxed-agent-studio)
   ├── serves built SPA from frontend/dist
   ├── Ollama Cloud LLM (gemma4:31b-cloud) via Anthropic SDK
   └── Docker sandbox-runner:latest  (per-task, network=none, destroyed after)
```

## Services

| Unit | Purpose | Enabled |
|---|---|---|
| `sandboxed-agent-studio` | uvicorn backend | ✅ |
| `nginx` | reverse proxy :80 | ✅ |
| `docker` | sandbox runtime | ✅ |

Service file: `/etc/systemd/system/sandboxed-agent-studio.service`
- WorkingDirectory `/opt/sandboxed-agent-studio`
- `EnvironmentFile=/opt/sandboxed-agent-studio/.env` (must be readable by `sandbox` user, chmod 600 chown sandbox)
- Runs as `sandbox` (in `docker` group)

nginx site: `/etc/nginx/sites-available/brz` → proxy_pass 127.0.0.1:8000, `client_max_body_size 30M`, long read timeouts + buffering off for SSE.

Firewall (ufw): 22, 80, 443 only.

## Deploy / update procedure

```bash
ssh root@45.76.2.228
cd /opt/sandboxed-agent-studio
git pull
backend/.venv/bin/pip install -q -e 'backend[dev]'   # only if deps changed
cd frontend && npm install --legacy-peer-deps && npm run build && cd ..
systemctl restart sandboxed-agent-studio
```

## Gotchas found in deployment

1. **Python version** — Ubuntu 22.04 ships 3.10; `pyproject.toml` now allows `>=3.10`
   (code uses no 3.11-only features).
2. **`.env` permissions** — service runs as user `sandbox`; `.env` must be
   `chown sandbox:sandbox` + `chmod 600`, else pydantic-settings raises PermissionError.
3. **Sandbox workspace permissions** — the container's `runner` UID differs from the host
   service user, so `mkdtemp`'s 0700 blocked reading `/workspace/_run.py`. Fixed by
   chmod 0777 on the workspace dir and 0666 on files (no secrets are ever placed there).
4. **No package-lock.json** — use `npm install --legacy-peer-deps` (npm ci will fail).

## Verified

- `POST /api/tasks` → SSE loop → `passed` on attempt 1 in ~5s
- `GET /api/artifacts/{id}/chart.png` → 200, valid PNG (17 KB)
- Zero leftover sandbox containers after runs
