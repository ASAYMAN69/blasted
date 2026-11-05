"""Docker-based sandbox execution. Owned by the `sandbox` agent (TASK 02).

The ExecutionResult model here is part of the frozen contract (CONTRACTS §3).
"""
from __future__ import annotations

import asyncio
import os
import shutil
import tempfile
from pathlib import Path
from typing import Any

import docker
from docker.errors import DockerException, NotFound
from pydantic import BaseModel

try:
    from ..config import get_settings
except ImportError:  # running from repo root as backend.app.sandbox
    from backend.app.config import get_settings


class ExecutionResult(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    artifacts: list[str]  # filenames copied out of /workspace


from backend.app.sandbox.paths import _safe_filename


class SandboxError(RuntimeError):
    """Raised when a sandbox execution cannot complete."""


class SandboxManager:
    """Docker-backed, contained, disposable sandbox executor.

    Containment guarantees (CONTRACTS §3):
      - non-root user inside the container
      - read-only rootfs except a writable /workspace
      - memory + CPU limits
      - no network (network_mode=none)
      - wall-clock timeout kills the container
      - container removed on every path (success, error, timeout)

    Why a sibling container, not exec on the host: the host runs the app,
    the LLM client, and the secrets. Running AI-generated code in the same
    process would let it read those secrets and crash the whole app. A
    disposable sibling container is the whole point of "Blast Radius Zero".
    """

    def __init__(self, settings: Any | None = None, client: Any | None = None):
        self._settings = settings if settings is not None else get_settings()
        try:
            self._client = client if client is not None else docker.from_env()
        except DockerException as exc:
            raise SandboxError(f"cannot connect to docker daemon: {exc}") from exc

    async def execute(
        self,
        code: str,
        files: dict[str, str],
        timeout_s: int | None = None,
        artifact_out_dir: str | Path | None = None,
    ) -> ExecutionResult:
        """Execute `code` in an isolated sandbox.

        Args:
            code: the script to run (entry: `/workspace/_run.py`).
            files: mapping of filename -> content to write into `/workspace`.
            timeout_s: wall-clock limit override (defaults to settings).
            artifact_out_dir: if given, produced artifacts are copied here
                (the workspace temp dir is deleted afterwards).
        """
        return await asyncio.to_thread(
            self._run, code, files, timeout_s, artifact_out_dir
        )

    # ------------------------------------------------------------------ #
    # internal sync implementation
    # ------------------------------------------------------------------ #
    def _run(
        self,
        code: str,
        files: dict[str, str],
        timeout_s: int | None,
        artifact_out_dir: str | Path | None,
    ) -> ExecutionResult:
        timeout = timeout_s if timeout_s is not None else self._settings.sandbox_timeout_s
        image = self._settings.sandbox_image
        host_tmp = tempfile.mkdtemp(prefix="sandbox-ws-")
        try:
            ws = Path(host_tmp)
            # The container runs as the unprivileged `runner` user, whose UID
            # differs from the service user on the host. Make the workspace and
            # its files readable/writable so the sandbox can consume them and
            # write artifacts back (no secrets ever live here).
            os.chmod(ws, 0o777)
            # write user files first — validate every name against the workspace
            for name, content in (files or {}).items():
                try:
                    safe = _safe_filename(name)
                except ValueError:
                    # Skip unsafe filenames; the orchestrator already filters,
                    # but this is defense-in-depth.
                    continue
                target = ws / safe
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(content, encoding="utf-8")
                os.chmod(target, 0o666)
            # runner script (avoid colliding with user files)
            (ws / "_run.py").write_text(code, encoding="utf-8")
            os.chmod(ws / "_run.py", 0o666)

            cpu_quota = int(float(self._settings.sandbox_cpus) * 1_000_000_000)
            container = self._client.containers.create(
                image=image,
                command=[],
                entrypoint=["python", "-u", "/workspace/_run.py"],
                working_dir="/workspace",
                volumes={host_tmp: {"bind": "/workspace", "mode": "rw"}},
                tmpfs={"/tmp": "rw,nosuid,size=64m"},
                read_only=True,
                network_mode="none",
                mem_limit=self._settings.sandbox_memory,
                nano_cpus=cpu_quota,
                user="runner",
                environment={"MPLBACKEND": "Agg", "PYTHONUNBUFFERED": "1"},
                detach=True,
                auto_remove=False,
            )
            container.start()
            exit_code = 0
            stdout_b = b""
            stderr_b = b""
            try:
                result = container.wait(timeout=timeout)
                exit_code = int(result.get("StatusCode", 0))
                stdout_b = container.logs(stdout=True, stderr=False)
                stderr_b = container.logs(stdout=False, stderr=True)
            except Exception as exc:  # timeout or docker error
                try:
                    container.kill()
                except Exception:
                    pass
                try:
                    container.wait(timeout=10)
                except Exception:
                    pass
                exit_code = 124
                try:
                    stdout_b = container.logs(stdout=True, stderr=False)
                    stderr_b = container.logs(stdout=False, stderr=True)
                except Exception:
                    stdout_b = b""
                    stderr_b = b""
                msg = f"sandbox timed out after {timeout}s\n" if "timed out" in str(exc).lower() or "read timed out" in str(exc).lower() else f"sandbox error: {exc}\n"
                stderr_b = stderr_b + msg.encode("utf-8", "replace")
            finally:
                try:
                    container.remove(force=True)
                except Exception:
                    pass

            # collect artifacts: files present after run, excluding runner and inputs
            input_names = set((files or {}).keys())
            artifacts: list[str] = []
            for p in sorted(ws.iterdir()):
                if p.is_file() and p.name != "_run.py" and p.name not in input_names:
                    artifacts.append(p.name)

            # persist artifacts out of the temp workspace if asked
            if artifact_out_dir is not None:
                out_root = Path(artifact_out_dir)
                out_root.mkdir(parents=True, exist_ok=True)
                for name in artifacts:
                    # Defense-in-depth: only copy basenames, never traversal.
                    try:
                        safe = _safe_filename(name)
                    except ValueError:
                        continue
                    src = ws / safe
                    if src.is_file():
                        shutil.copy2(src, out_root / safe)

            return ExecutionResult(
                stdout=stdout_b.decode("utf-8", "replace"),
                stderr=stderr_b.decode("utf-8", "replace"),
                exit_code=exit_code,
                artifacts=artifacts,
            )
        except NotFound as exc:
            raise SandboxError(
                f"sandbox image not found: {image}. Build it first (deploy/provision-sandbox.sh)."
            ) from exc
        except DockerException as exc:
            raise SandboxError(f"sandbox execution failed: {exc}") from exc
        finally:
            shutil.rmtree(host_tmp, ignore_errors=True)
