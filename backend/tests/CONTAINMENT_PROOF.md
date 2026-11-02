# Containment Proof — Sandboxed Agent Studio

Live proof snippets for the demo video. Each line below is a **real observed
output** from this machine running the `sandbox-runner:latest` image through
`SandboxManager` (Docker), reproduced by the `containment`-marked tests in
`backend/tests/test_containment.py`. Re-run anytime with:

```bash
# from the repo root
backend/.venv/bin/pytest backend/tests -m containment -v
```

## 1. Non-root execution

```python
# inside the sandbox
import os; print(os.getuid())
# -> 1000   (the 'runner' user; root is 0)
```

## 2. Host filesystem is NOT mounted

```python
# path exists on the host, but not inside the container
open("/mnt/ee/aprojects/brz/brzv2/backend/app/config.py").read()
# -> FileNotFoundError: [Errno 2] No such file or directory ... (exit 1)
```

The sandbox sees only the bind-mounted `/workspace`; the host FS is unreachable.

## 3. Container hostname is isolated from the host

```python
import socket; print(socket.gethostname())
# -> 3be0376d7ef3   (container ID — NOT the host's "POWOWL")
```

## 4. No host environment / secrets leak

```python
import os, json; print(json.dumps(sorted(os.environ)))
# -> ["GPG_KEY","HOME","HOSTNAME","LANG","MPLBACKEND","PATH",
#     "PYTHONUNBUFFERED","PYTHON_SHA256","PYTHON_VERSION"]
# Sensitive host vars (OPENROUTER_API_KEY, VULTR_LLM_API_KEY, AWS_*,
# SANDBOX_*, SSH_AUTH_SOCK, ...) are absent.
```

## 5. Memory limit kills runaway allocation

```python
x = []
while True:
    x.append(b'x' * (32 * 1024 * 1024))
# -> container OOM-killed by the memory cgroup (exit 137 / SIGKILL)
```

## 6. Wall-clock timeout kills runaway loops

```python
import time; time.sleep(600)
# -> SandboxManager enforces timeout_s=2 → exit 124
#    stderr: "sandbox timed out after 2s"
```

## 7. Network is blocked

```python
import urllib.request
urllib.request.urlopen("http://example.com", timeout=5)
# -> URLError → "NET_BLOCKED" (network_mode=none; no link, no egress)
```

## 8. Root filesystem is read-only

```python
open("/etc/evil.txt", "w").write("x")
# -> OSError: [Errno 30] Read-only file system (exit 1)
# Only /workspace (bind mount) and /tmp (tmpfs) are writable.
```

## 9. Container destroyed after every task

```
docker ps -a  (containers)
before (success): 4
after  (success): 4
before (error):   4
after  (error):   4
```

The disposable container is force-removed on **every** path — success, error,
timeout, and OOM. There are no leftover containers.

---

## Test results

| Suite | Result |
|---|---|
| `pytest backend/tests -m containment` | **12 passed** (0 skipped, 0 failed) |
| `pytest backend/tests` (full) | **50 passed, 1 xfailed** (documented known bug) |

The single xfailed test (`test_csv_file_input_lands_as_input_csv`) pins a
cross-agent input-mapping bug reported to the lead in `CONTEXT/STATUS.md`:
the engine maps input key `file` → `input_file`, while `CsvMode` scripts read
`/workspace/input.csv`. It is an expected-failure regression pin, not a red
suite.
