"""Docker-based sandbox execution. Owned by the `sandbox` agent (TASK 02).

The ExecutionResult model here is part of the frozen contract (CONTRACTS §3).
"""
from pydantic import BaseModel


class ExecutionResult(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    artifacts: list[str]  # filenames copied out of /workspace


class SandboxError(RuntimeError):
    """Raised when a sandbox execution cannot complete."""
