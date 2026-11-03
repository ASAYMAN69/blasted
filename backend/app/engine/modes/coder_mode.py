"""Code Reviewer / Self-Healing Runner mode (coder).

The user submits a Python source file — optionally with a failing test file and
a short goal statement. The agent plans how to validate the file, then writes a
single *wrapper script* that the sandbox executes once: the wrapper runs the
user's file, captures the failure, applies a prepared fix, re-runs within the
same session, and (if a test exists) runs the test against the final version.
The frozen `verify` contract then judges the captured `ExecutionResult`.

Owned by the `coder` agent (TASK 04). Frozen contracts: CONTEXT/CONTRACTS.md §2
and backend/app/engine/modes/base.py; the engine's bounded retry loop lives in
backend/app/engine/orchestrator.py.

NOTE (future work): fixes are applied automatically inside the sandbox today.
Before destructive edits may ever touch user data outside this demo, a human
approval step is expected in front of this mode.
"""
from __future__ import annotations

import json
from typing import Any

from backend.app.engine.modes.base import Verification
from backend.app.engine.orchestrator import Task
from backend.app.sandbox.manager import ExecutionResult

# Marker the wrapper must print as one line, followed by one single-line JSON
# object describing the final run state. Makes machine verification deterministic.
RESULT_MARKER = "CODER_RESULT:"

# The sandbox never mounts the submitted source with a .py suffix (the engine
# writes it under the literal name `input_file`), so the wrapper first copies it
# next to itself as an importable module before executing anything.
USER_FILE_PATH = "/workspace/input_file"
USER_FILE_PY = "/workspace/input_file.py"
TEST_PATH = "/workspace/test.py"

# Safety limits for echoing output back into reasons / prompts.
_STDERR_TAIL_CHARS = 400
_SOURCE_PREVIEW_CHARS = 3000
_MAX_PLAN_STEPS = 6

_SYSTEM_HINT = (
    "You are a debugging planner for a sandboxed Python runner. "
    "The sandbox has no network access and a plain Python 3 environment."
)


class CoderMode:
    """Code Reviewer / Self-Healing Runner mode (TASK 04).

    Pipeline: plan validation → generate wrapper script → sandbox execute →
    verify. The mode only produces prompts and judges the `ExecutionResult`;
    the engine's bounded retry loop handles model mistakes, so prompts are
    strict and mechanical rather than conversational.

    NOTE (future work): a human-approval gate may be required before this mode
    applies destructive edits outside the sandbox or beyond the submitted file.
    """

    name = "coder"

    input_schema = {
        "type": "object",
        "properties": {
            "file": {
                "type": "string",
                "description": "Submitted Python source (stored in the sandbox as /workspace/input_file)",
            },
            "test": {
                "type": "string",
                "nullable": True,
                "description": "Optional test script (stored as /workspace/test.py); may import the fixed file",
            },
            "goal": {
                "type": "string",
                "minLength": 1,
                "description": "Expected behavior in one sentence",
            },
        },
        "required": ["file", "goal"],
    }

    # ---------------------------------------------------------------- #
    # prompts
    # ---------------------------------------------------------------- #
    def build_plan_prompt(self, task: Task) -> str:
        """Prompt asking the model to plan how the file will be validated.

        The plan is short prose/numbered steps (no code): run the file
        directly? run the test? what failure modes to expect and what kind of
        fix is likely to be needed — without applying anything yet.
        """
        goal = str(task.inputs.get("goal", "")).strip()
        has_test = bool(self._test_text(task))
        return (
            "Plan how to validate and (if needed) repair a submitted Python file.\n"
            "\n"
            f"GOAL (expected behavior): {goal}\n"
            "\n"
            f"SUBMITTED FILE (executed next turn; full source is {USER_FILE_PATH}):\n"
            f"{self._source_preview(task)}\n"
            "\n"
            f"TEST FILE: {'a test script IS provided at ' + TEST_PATH + ' and must be run against the file' if has_test else 'no test script provided — the file itself must run cleanly'}\n"
            "\n"
            "Write a short numbered plan (up to "
            f"{_MAX_PLAN_STEPS} steps, no code) covering:\n"
            f"1. How to execute the file ({USER_FILE_PY}) and what exit/output "
            "counts as a clean run for the GOAL.\n"
            + ("2. How to run the test script and what its exit code means.\n"
               if has_test
               else "2. How the verdict is determined without a test: success = "
                    "the file itself runs cleanly (exit 0, no traceback).\n")
            + "3. The most likely failure(s) in the submitted source (spot them from "
            "the preview) and the minimal repair you would prepare.\n"
            "4. When to re-run: the fix is applied and the run is repeated inside "
            "one sandbox session, exactly once per generated script.\n"
            "\n"
            "Constraints: no network, fixes may only rewrite the submitted file at "
            f"{USER_FILE_PY} (never the test script), and everything must happen "
            "inside /workspace.\n"
            "\n"
            "Output ONLY the numbered plan."
        )

    def build_code_prompt(self, task: Task, plan: str) -> str:
        """Prompt asking the model for the self-healing wrapper script.

        Script contract (also enforced by `verify`):
          1. copy the submitted file to an importable path;
          2. run it (`python -u`), capturing exit code / stdout / stderr;
          3. on failure, overwrite it with the model-prepared fixed source
             (embedded in the script) and run again — one repair, one re-run;
          4. if a test was submitted, run it against the final version;
          5. print exactly one `CODER_RESULT: {...}` line and exit 0 only when
             the file runs cleanly (and the test passed, if provided).
        """
        goal = str(task.inputs.get("goal", "")).strip()
        has_test = bool(self._test_text(task))
        return (
            "Write a complete Python 3 wrapper script that validates, and if "
            "necessary repairs, a submitted source file — all inside ONE run.\n"
            "\n"
            f"GOAL (expected behavior): {goal}\n"
            "\n"
            "VALIDATION PLAN:\n"
            f"{plan}\n"
            "\n"
            f"SUBMITTED SOURCE (read-only original at {USER_FILE_PATH}):\n"
            f"{self._source_preview(task)}\n"
            + (
                "TEST SCRIPT (provided at " + TEST_PATH + "; treat as read-only, "
                "it may import the file): present\n\n"
                if has_test
                else "TEST SCRIPT: none — validation is a clean run only\n\n"
            )
            + "SCRIPT CONTRACT (must hold; verification depends on it):\n"
            "1. Only the Python standard library; no network, no shell besides "
            "subprocess launching `python -u`.\n"
            f"2. Copy {USER_FILE_PATH} to {USER_FILE_PY} first, so the file and "
            "any test can import it as `input_file`.\n"
            f"3. Run `python -u {USER_FILE_PY}` as a subprocess; capture "
            "exit code, stdout and stderr.\n"
            "4. If that run failed (nonzero exit), write your corrected version "
            "of the file (a string literal embedded in the script) over "
            f"{USER_FILE_PY} and re-run it once. This is the only fix you apply: "
            "never rewrite the TEST script or anything outside /workspace.\n"
            + (
                f"5. If {TEST_PATH} exists, run it with `python -u {TEST_PATH}` "
                "against the final version of the file.\n"
                if has_test
                else "5. No test stage.\n"
            )
            + "6. As the LAST line of stdout, print exactly one line:\n"
            "   "
            + RESULT_MARKER
            + ' {"run_ok": <bool — final file run exited 0>, "test_ok": <null if '
            'no test, else bool test exit 0>, "fixed": <bool a repair was applied>, '
            '"attempts": <int runs of the file>, "summary": <one short string>}\n'
            "   That line must parse as a single valid JSON object on one line.\n"
            "7. Exit 0 only when run_ok AND (no test OR test_ok); otherwise exit 1 "
            "and let stderr carry the traceback of the last failure.\n"
            "8. All progress/debug output goes to stderr; keep stdout clean except "
            "for the final "
            + RESULT_MARKER
            + " line.\n"
            "\n"
            "Output ONLY raw Python code. No markdown fences, no commentary."
        )

    # ---------------------------------------------------------------- #
    # verification
    # ---------------------------------------------------------------- #
    def verify(self, execution: ExecutionResult) -> Verification:
        """PASS iff exit 0 AND the file runs cleanly (or the test ran OK).

        Primary signal: the `CODER_RESULT:` verdict line, which reports
        `run_ok` and `test_ok` separately so "clean run" and "test passed"
        are distinguishable. Failure reasons embed the stderr tail (the
        traceback) so the engine's retry loop has something actionable.
        Fallback when the model omitted the verdict line: exit 0 with no
        traceback in stderr counts as a clean run; any traceback FAILs.
        """
        exit_code = int(execution.exit_code)
        stderr = execution.stderr or ""
        tail = stderr.strip()[-_STDERR_TAIL_CHARS:]

        if exit_code != 0:
            return Verification(
                ok=False,
                reason=(
                    f"wrapper exited with code {exit_code}; "
                    f"stderr (tail): {tail or '<empty>'}"
                ),
            )

        verdict = _parse_verdict(execution.stdout or "")
        if verdict is not None:
            run_ok = verdict.get("run_ok") is True
            test_ok = verdict.get("test_ok")  # True / False / None
            if run_ok and test_ok is not False:
                reason = self._describe_pass(verdict)
                return Verification(ok=True, reason=reason)
            return Verification(
                ok=False,
                reason=(
                    f"still failing after the self-healing run: {verdict.get('summary', '')!s} "
                    f"(fixed={bool(verdict.get('fixed'))}, "
                    f"attempts={verdict.get('attempts')}); stderr (tail): {tail or '<empty>'}"
                ),
            )

        # No verdict line: distinguish clean run from (still) failing by stderr.
        if "Traceback" in stderr or "SyntaxError" in stderr:
            return Verification(
                ok=False,
                reason=(
                    "no CODER_RESULT verdict in stdout and stderr contains a "
                    f"traceback; stderr (tail): {tail or '<empty>'}"
                ),
            )
        return Verification(
            ok=True,
            reason="exit 0 with no traceback; file runs cleanly (fallback: no verdict line emitted)",
        )

    # ---------------------------------------------------------------- #
    # helpers
    # ---------------------------------------------------------------- #
    def _source_preview(self, task: Task, max_chars: int = _SOURCE_PREVIEW_CHARS) -> str:
        """Return a size-clipped snapshot of the submitted source for prompts."""
        text = (self._source_text(task) or "").rstrip() or "<empty file>"
        if len(text) > max_chars:
            cutoff = text.rfind("\n", 0, max_chars)
            preview = text[: cutoff if cutoff > 0 else max_chars]
            dropped = len(text) - len(preview)
            preview += f"\n… (truncated, {dropped} chars below)"
        else:
            preview = text
        return preview

    @staticmethod
    def _source_text(task: Task) -> str:
        """Extract the submitted source text from task inputs (str or dict)."""
        return _extract_text(task.inputs.get("file"))

    @staticmethod
    def _test_text(task: Task) -> str:
        """Extract the optional test text from task inputs (str or dict)."""
        return _extract_text(task.inputs.get("test"))

    @staticmethod
    def _describe_pass(verdict: dict[str, Any]) -> str:
        """Render a human-readable PASS reason that names the passing signal."""
        signal = (
            "test ran successfully"
            if verdict.get("test_ok") is True
            else "file runs cleanly"
        )
        extras = []
        if verdict.get("fixed"):
            extras.append("repair applied")
        attempts = verdict.get("attempts")
        if isinstance(attempts, int):
            extras.append(f"{attempts} run(s)")
        suffix = f" ({', '.join(extras)})" if extras else ""
        return f"exit 0; {signal}{suffix}"


def _extract_text(value: Any) -> str:
    """Normalize an input field (plain string or {"content": str}) to text."""
    if isinstance(value, str):
        return value
    if isinstance(value, dict) and isinstance(value.get("content"), str):
        return value["content"]
    return ""


def _parse_verdict(stdout: str) -> dict[str, Any] | None:
    """Parse the single-line CODER_RESULT verdict JSON out of stdout.

    Prefers the last marker line; falls back to scanning lines bottom-up for
    the marker anywhere in the line. Returns None when no verdict is present
    so `verify` can apply its fallback path.
    """
    text = (stdout or "").strip()
    if not text:
        return None
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    for line in reversed(lines):
        marker_idx = line.rfind(RESULT_MARKER)
        if marker_idx == -1:
            continue
        payload = line[marker_idx + len(RESULT_MARKER) :].strip()
        if not payload:
            continue
        try:
            value = json.loads(payload)
        except (json.JSONDecodeError, ValueError):
            continue
        if isinstance(value, dict):
            return value
    return None
