"""Shared test support for the QA suite (TASK 08).

This module is imported by ``conftest.py`` and by individual test modules. It
holds deterministic fakes (LLM / sandbox / mode), Docker-availability helpers,
and the reusable fixture constants for the mode integration tests.

Run pytest from the **repo root** (``backend.app.*`` imports) — see
``backend/tests/conftest.py`` for the sys.path bootstrap.
"""
from __future__ import annotations

import os
from pathlib import Path

import docker as docker_sdk
import pytest

from backend.app.config import Settings
from backend.app.engine.modes.base import Verification
from backend.app.engine.orchestrator import Orchestrator
from backend.app.sandbox.manager import ExecutionResult, SandboxManager

REPO_ROOT = Path(__file__).resolve().parents[2]

# --------------------------------------------------------------------------- #
# Docker availability
# --------------------------------------------------------------------------- #
def _docker_ready() -> bool:
    """True when the Docker daemon is reachable and the sandbox image exists."""
    try:
        client = docker_sdk.from_env()
        client.ping()
        client.images.get("sandbox-runner:latest")
        return True
    except Exception:
        return False


DOCKER_READY = _docker_ready()

require_docker = pytest.mark.skipif(
    not DOCKER_READY,
    reason="Docker daemon or 'sandbox-runner:latest' image unavailable",
)


def container_ids(client) -> set[str]:
    """All container IDs (including stopped) known to the daemon."""
    return {c.id for c in client.containers.list(all=True)}


def make_test_settings(*, max_retries: int = 3) -> Settings:
    """A hermetic Settings instance (env-file independent)."""
    return Settings(
        openrouter_api_key="test-openrouter-key",
        or_model="test/model",
        vultr_llm_enabled=False,
        vultr_llm_api_key="",
        vultr_llm_model="",
        sandbox_memory="512m",
        sandbox_cpus="0.5",
        sandbox_timeout_s=20,
        sandbox_image="sandbox-runner:latest",
        max_task_size_mb=25,
        max_retries=max_retries,
    )


# --------------------------------------------------------------------------- #
# Fakes
# --------------------------------------------------------------------------- #
class FakeLLM:
    """Deterministic LLM stub for engine tests.

    Dispatches on prompt category:

    * summary prompts (``Summarize ...`` / ``Explain the failure ...``) -> ``summary``
    * plan prompts (``...Output ONLY the numbered plan.``) -> ``plan``
    * anything else (code generation) -> next item of ``codes`` or ``code``
    """

    provider_name = "fake"

    def __init__(self, plan="A plan.", code=None, codes=None, summary="Task completed."):
        self.plan = plan
        self.code = "print('hello from fake llm')" if code is None else code
        self.codes = list(codes or [])
        self.summary = summary
        self.generate_calls = []
        self.generate_json_calls = []

    def generate(self, prompt, system=None, max_tokens=1024):
        self.generate_calls.append(prompt)
        low = (prompt or "").lower()
        if "summarize" in low or "explain the failure" in low:
            return self.summary
        if "output only the numbered plan" in low or low.startswith("plan"):
            return self.plan
        if self.codes:
            return self.codes.pop(0)
        return self.code

    def generate_json(self, prompt, schema):
        self.generate_json_calls.append(prompt)
        return {}


class FakeSandbox:
    """Scriptable stand-in for SandboxManager (no Docker needed).

    ``result`` is returned for every call unless ``results`` is given, in which
    case items are popped per call (an Exception item is raised).
    """

    def __init__(self, result=None, results=None):
        self.result = result if result is not None else ExecutionResult(
            stdout="", stderr="", exit_code=0, artifacts=[]
        )
        self._results = list(results or [])
        self.executions = []  # (code, files, timeout_s, artifact_out_dir)

    async def execute(self, code, files, timeout_s=None, artifact_out_dir=None):
        self.executions.append((code, dict(files or {}), timeout_s, artifact_out_dir))
        item = self._results.pop(0) if self._results else self.result
        if isinstance(item, Exception):
            raise item
        return item


class StubMode:
    """Minimal Mode implementation for engine logic tests (not registered)."""

    name = "stub"
    input_schema = {"type": "object"}

    def __init__(self, verification=None, plan_prompt="plan", code_prompt="code"):
        self._verification = verification or Verification(ok=True, reason="ok")
        self._plan_prompt = plan_prompt
        self._code_prompt = code_prompt

    def build_plan_prompt(self, task):
        return self._plan_prompt

    def build_code_prompt(self, task, plan):
        return self._code_prompt

    def verify(self, execution):
        return self._verification


class AlwaysFailMode(StubMode):
    """Mode whose verification always fails (for retry-budget tests)."""

    def __init__(self):
        super().__init__(verification=Verification(ok=False, reason="always fails"))


class FlakyMode(StubMode):
    """Fails the first ``fail_times`` executions, then passes."""

    def __init__(self, fail_times: int = 2):
        self._failures_left = fail_times
        super().__init__(verification=Verification(ok=False, reason="flaky"))

    def verify(self, execution):
        if self._failures_left > 0:
            self._failures_left -= 1
            return Verification(ok=False, reason="flaky")
        return Verification(ok=True, reason="recovered")


# --------------------------------------------------------------------------- #
# Canonical mode integration fixtures (script content written into the sandbox)
# --------------------------------------------------------------------------- #
CSV_FIXTURE = "city,pop\nNYC,9000000\nLA,4000000\n"
CSV_QUESTION = "What is the total population?"

CSV_CODE = (
    "import json\n"
    "import pandas as pd\n"
    "\n"
    'df = pd.read_csv("/workspace/input.csv")\n'
    'total = int(df["pop"].sum())\n'
    "print('RESULT_JSON: {\"summary\": \"total population\", "
    '"numbers": {"total": %d}}\' % total)\n'
    'json.dump({"total": total, "cities": int(len(df))}, '
    'open("/workspace/summary.json", "w"))\n'
)

CODER_BROKEN_FILE = "print('hi'\n"

CODER_CODE = (
    "import shutil\n"
    "import subprocess\n"
    "import sys\n"
    "\n"
    'shutil.copy("/workspace/input_file", "/workspace/input_file.py")\n'
    'open("/workspace/input_file.py").read()\n'
    'r = subprocess.run([sys.executable, "-u", "/workspace/input_file.py"],\n'
    "    capture_output=True, text=True)\n"
    "attempts = 1\n"
    "fixed = False\n"
    "if r.returncode != 0:\n"
    "    fixed = True\n"
    '    open("/workspace/input_file.py", "w").write(\n'
    "        \"print('hello from fixed source')\\n\")\n"
    '    r = subprocess.run([sys.executable, "-u", "/workspace/input_file.py"],\n'
    "        capture_output=True, text=True)\n"
    "    attempts = 2\n"
    "sys.stderr.write(r.stdout)\n"
    "sys.stderr.write(r.stderr)\n"
    "run_ok = r.returncode == 0\n"
    "print('CODER_RESULT: {\"run_ok\": %s, \"test_ok\": null, "
    '"fixed": %s, "attempts": %d, "summary": "fixed syntax"}\' % (\n'
    "    str(run_ok).lower(), str(fixed).lower(), attempts))\n"
    "sys.exit(0 if run_ok else 1)\n"
)

CHART_DATA = "name,value\na,1\nb,2\nc,3\n"
CHART_REQUEST = "bar chart of value by name"

CHART_CODE = (
    "import pandas as pd\n"
    "import matplotlib\n"
    'matplotlib.use("Agg")\n'
    "import matplotlib.pyplot as plt\n"
    "\n"
    'df = pd.read_csv("/workspace/data.csv")\n'
    'df.plot(kind="bar", x="name", y="value", legend=False)\n'
    "plt.tight_layout()\n"
    'plt.savefig("/workspace/chart.png")\n'
)

FIX_INPUT = "def add(a, b):\n    return a + b + 1\n\nprint(add(2, 3))\n"
FIX_DESIRED = "returns the sum without off-by-one"

FIX_CODE = (
    "import difflib\n"
    "import subprocess\n"
    "import sys\n"
    "import json\n"
    "\n"
    'orig = open("/workspace/input_file").read()\n'
    'fixed = orig.replace("return a + b + 1", "return a + b")\n'
    'open("/workspace/fixed_file", "w").write(fixed)\n'
    'r = subprocess.run([sys.executable, "-u", "/workspace/fixed_file"],\n'
    "    capture_output=True, text=True)\n"
    "sys.stderr.write(r.stdout)\n"
    "sys.stderr.write(r.stderr)\n"
    "if r.returncode != 0:\n"
    "    sys.exit(r.returncode)\n"
    'diff = "".join(difflib.unified_diff(\n'
    "    orig.splitlines(keepends=True),\n"
    "    fixed.splitlines(keepends=True),\n"
    '    fromfile="original", tofile="fixed",\n'
    "))\n"
    'open("/workspace/fix.diff", "w").write(diff)\n'
    'verdict = {"changed": True, "run_ok": r.returncode == 0,\n'
    '    "diff_lines": diff.count("\\n"), "summary": "patched and verified"}\n'
    'print("FIX_RESULT: " + json.dumps(verdict), file=sys.stdout)\n'
)
