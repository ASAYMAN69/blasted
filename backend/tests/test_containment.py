"""Containment negative tests — the demo centerpiece (TASK 08).

Every test here intentionally runs adversarial code inside a real Docker
sandbox and asserts the containment guarantees of CONTRACTS §3 hold:

  * host filesystem is not mounted (host-only paths are unreachable)
  * container hostname is isolated from the host
  * no host environment/secrets leak into the sandbox
  * memory limit kills runaway allocation
  * wall-clock timeout kills runaway sleeps
  * container is destroyed after every task — success, error, timeout, and OOM
  * code runs as a non-root user on a read-only rootfs with no network

All tests are marked ``containment`` and skip when Docker is unavailable.
"""
from __future__ import annotations

import json
import socket

import pytest

from backend.tests._support import container_ids, require_docker

pytestmark = [pytest.mark.containment, require_docker, pytest.mark.asyncio]

# A path that exists on the host but is not part of the sandbox image.
_HOST_ONLY_PATH = "/mnt/ee/aprojects/brz/brzv2/backend/app/config.py"

_SENSITIVE_ENV_KEYS = [
    "OPENROUTER_API_KEY",
    "OR_MODEL",
    "VULTR_LLM_ENABLED",
    "VULTR_LLM_API_KEY",
    "VULTR_LLM_MODEL",
    "SANDBOX_MEMORY",
    "SANDBOX_CPUS",
    "SANDBOX_TIMEOUT_S",
    "SANDBOX_IMAGE",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "SSH_AUTH_SOCK",
]

_MEMORY_HOG = (
    "x = []\n"
    "while True:\n"
    "    x.append(b'x' * (32 * 1024 * 1024))\n"
)

_SLEEP_FOREVER = "import time\ntime.sleep(600)\n"


async def test_host_filesystem_not_mounted(sandbox_manager):
    """A host-only file path must be unreachable from inside the sandbox."""
    code = f"print(open({_HOST_ONLY_PATH!r}).read())"
    result = await sandbox_manager.execute(code, {}, timeout_s=20)
    assert result.exit_code != 0
    assert "FileNotFoundError" in result.stderr or "No such file" in result.stderr


async def test_container_hostname_isolated_from_host(sandbox_manager):
    """The sandbox sees its own hostname, never the host's."""
    result = await sandbox_manager.execute(
        "import socket\nprint(socket.gethostname())", {}, timeout_s=20
    )
    assert result.exit_code == 0
    inner_hostname = result.stdout.strip()
    assert inner_hostname
    assert inner_hostname != socket.gethostname()


async def test_no_host_env_or_secrets_leak(sandbox_manager):
    """The sandbox env contains only the whitelist — no host secrets."""
    code = "import os, json\nprint(json.dumps(sorted(os.environ)))"
    result = await sandbox_manager.execute(code, {}, timeout_s=20)
    assert result.exit_code == 0
    env = json.loads(result.stdout.strip())

    leaked = [key for key in _SENSITIVE_ENV_KEYS if key in env]
    assert not leaked, f"sensitive env leaked into sandbox: {leaked}"
    assert "MPLBACKEND" in env
    assert "PYTHONUNBUFFERED" in env


async def test_memory_limit_kills_runaway_allocation(sandbox_manager):
    """Unbounded allocation must be killed by the memory cgroup limit."""
    result = await sandbox_manager.execute(_MEMORY_HOG, {}, timeout_s=30)
    assert result.exit_code != 0
    # 137 = SIGKILL (OOM-killed); 124 = timeout fallback; otherwise "Killed".
    assert result.exit_code in (124, 137) or "Killed" in result.stderr


async def test_timeout_kills_runaway_sleep(sandbox_manager):
    """A wall-clock timeout must kill a runaway loop (exit 124)."""
    result = await sandbox_manager.execute(_SLEEP_FOREVER, {}, timeout_s=2)
    assert result.exit_code == 124
    assert "timed out" in result.stderr


async def test_runs_as_non_root_user(sandbox_manager):
    """Sandbox code must execute as the non-root `runner` user."""
    result = await sandbox_manager.execute(
        "import os\nprint(os.getuid())", {}, timeout_s=20
    )
    assert result.exit_code == 0
    assert int(result.stdout.strip()) != 0


async def test_rootfs_is_read_only(sandbox_manager):
    """Writes outside /workspace (and /tmp) must be rejected."""
    result = await sandbox_manager.execute(
        "open('/etc/evil.txt', 'w').write('x')", {}, timeout_s=20
    )
    assert result.exit_code != 0
    assert "Read-only file system" in result.stderr or "PermissionError" in result.stderr


async def test_network_blocked(sandbox_manager):
    """No network: outbound HTTP must fail inside the sandbox."""
    code = (
        "import urllib.request\n"
        "try:\n"
        '    urllib.request.urlopen("http://example.com", timeout=5)\n'
        '    print("NET_OK")\n'
        "except Exception as exc:\n"
        '    print("NET_BLOCKED", type(exc).__name__)\n'
    )
    result = await sandbox_manager.execute(code, {}, timeout_s=20)
    assert result.exit_code == 0
    assert "NET_BLOCKED" in result.stdout


async def test_container_destroyed_on_success(docker_client, sandbox_manager):
    before = container_ids(docker_client)
    await sandbox_manager.execute("print('ok')", {}, timeout_s=20)
    assert container_ids(docker_client) == before


async def test_container_destroyed_on_error(docker_client, sandbox_manager):
    before = container_ids(docker_client)
    await sandbox_manager.execute("raise RuntimeError('boom')", {}, timeout_s=20)
    assert container_ids(docker_client) == before


async def test_container_destroyed_on_timeout(docker_client, sandbox_manager):
    before = container_ids(docker_client)
    await sandbox_manager.execute(_SLEEP_FOREVER, {}, timeout_s=1)
    assert container_ids(docker_client) == before


async def test_container_destroyed_on_oom(docker_client, sandbox_manager):
    before = container_ids(docker_client)
    await sandbox_manager.execute(_MEMORY_HOG, {}, timeout_s=30)
    assert container_ids(docker_client) == before
