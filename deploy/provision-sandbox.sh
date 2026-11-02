#!/usr/bin/env bash
# Provision a Vultr VM as the Sandboxed Agent Studio host (TASK 02).
# Idempotent; run as root or via sudo.
set -euo pipefail

echo "==> Installing Docker engine"
apt-get update
apt-get install -y ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io

echo "==> Building sandbox base image"
docker build -t sandbox-runner:latest /opt/sandboxed-agent-studio/backend/app/sandbox/image

echo "==> Done. Next: deploy the app (systemd), then open 80/443 for the app only."
