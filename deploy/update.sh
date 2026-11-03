#!/usr/bin/env bash
# Idempotent production update (run on the Vultr VM by CI or by hand).
# Usage: bash deploy/update.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/sandboxed-agent-studio}"
SERVICE="${SERVICE:-sandboxed-agent-studio}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8000/health}"

cd "$APP_DIR"

echo "==> Fetching latest main"
git fetch --prune origin main
git reset --hard origin/main

echo "==> Backend deps"
if [ -x backend/.venv/bin/pip ]; then
  backend/.venv/bin/pip install -q -e 'backend[dev]'
else
  echo "!! backend/.venv missing — run the initial provisioning first" >&2
  exit 1
fi

echo "==> Frontend build"
cd frontend
npm install --silent --legacy-peer-deps >/dev/null 2>&1 || npm install --legacy-peer-deps
npm run build
cd ..

echo "==> Restarting service"
# Ensure the service user can read .env
if [ -f .env ]; then
  chown "${SERVICE_USER:-sandbox}:${SERVICE_USER:-sandbox}" .env 2>/dev/null || true
  chmod 600 .env 2>/dev/null || true
fi
mkdir -p data && chown -R "${SERVICE_USER:-sandbox}:${SERVICE_USER:-sandbox}" data 2>/dev/null || true

systemctl restart "$SERVICE"

echo "==> Health check"
for i in $(seq 1 30); do
  if curl -fsS -m 3 "$HEALTH_URL" >/dev/null 2>&1; then
    echo "OK: $HEALTH_URL is healthy (attempt $i)"
    exit 0
  fi
  sleep 2
done

echo "!! health check failed after restart" >&2
systemctl --no-pager status "$SERVICE" | tail -20 >&2
exit 1
