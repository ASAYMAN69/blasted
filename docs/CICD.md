# CI/CD

**Live:** http://45.76.2.228

```
branch push ──► CI (GitHub Actions) ──► PR ──► review ──► merge to main
                                                            │
                                                            ▼
                                              CD (SSH → deploy/update.sh)
                                                            │
                                                  nginx + FastAPI restarted
                                                            │
                                                     public /health 200
```

## Workflows

| File | Trigger | Does |
|---|---|---|
| `.github/workflows/ci.yml` | PR to `main`, push to any non-main branch | Backend: install deps, build `sandbox-runner` image, run full pytest (incl. real-Docker containment). Frontend: `npm install` + production build |
| `.github/workflows/deploy.yml` | push to `main` (i.e. merged PR), or manual dispatch | SSH to VM, run `deploy/update.sh`, then verify public `/health` returns 200 |

## Required repo secrets

| Secret | Value |
|---|---|
| `DEPLOY_HOST` | `45.76.2.228` |
| `DEPLOY_USER` | `root` |
| `DEPLOY_SSH_KEY` | private ed25519 key whose public half is in the VM's `~/.ssh/authorized_keys` |

Rotate by generating a new keypair, appending the public key on the VM, and updating `DEPLOY_SSH_KEY`.

## `deploy/update.sh` (runs on the VM)

Idempotent:
1. `git fetch` + `git reset --hard origin/main`
2. `pip install -e 'backend[dev]'`
3. `npm install` + `npm run build` (SPA)
4. fix `.env` / `data/` ownership for the `sandbox` service user
5. `systemctl restart sandboxed-agent-studio`
6. poll `/health` for up to 60s; exit non-zero (failing the CD job) if unhealthy

## Verifying what is deployed

The desktop side rail shows `build <short-sha>`, injected at build time via Vite
`define`. Compare it to `git rev-parse --short HEAD` on `main`.

## Rollback

`git revert <merge-commit>` on `main` and push — CD redeploys the previous state.
For a bad build that CI missed, `git reset --hard <good-sha>` + force-push is the
fast path, then CD runs again.

## Known limitation

GitHub forbids approving your own PR. When the same account authors and reviews,
approval is recorded as a PR comment (auditable) and the merge proceeds. For a true
independent approval gate, add a second GitHub account as reviewer and enable
branch protection requiring 1 approval.
