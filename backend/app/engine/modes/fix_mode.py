"""File Fixer mode (fix, light). Implement per TASK 06.

The user submits a file + an optional observed error + a desired behavior. The
agent plans a minimal patch, generates a script that reads the file, applies the
fix in a sandbox copy, re-runs the fixed copy, and writes a unified diff to
``/workspace/fix.diff``. Verification passes only when the sandbox exits 0,
``fix.diff`` exists, AND the emitted ``FIX_RESULT`` verdict confirms the applied
patch runs cleanly (or reports the original already satisfied the goal).
"""
from __future__ import annotations

import json
from typing import Any

from backend.app.engine.orchestrator import Task
from backend.app.engine.modes.base import Verification
from backend.app.sandbox.manager import ExecutionResult

_STDERR_TAIL_CHARS = 400

_SYSTEM_HINT = (
    "You are a careful file-fixer for a sandboxed Python runner. "
    "The sandbox has no network access and only /workspace is writable. "
    "You plan minimal, targeted patches."
)

_CODE_SYSTEM_HINT = (
    "You write complete, self-contained Python 3 scripts for a sandboxed runner. "
    "Available: standard library only (plus pandas/numpy/matplotlib if needed). "
    "No network, no shell access, non-root user, only /workspace is writable."
)

_INPUT_FILE_PATH = "/workspace/input_file"
_FIXED_FILE_PATH = "/workspace/fixed_file"
_DIFF_PATH = "/workspace/fix.diff"
_FIX_RESULT_MARKER = "FIX_RESULT:"


class FixMode:
    """File Fixer mode.

    Pipeline: plan minimal patch -> generate fixer script -> sandbox execute ->
    verify (exit 0 + fix.diff artifact).
    """

    name = "fix"

    input_schema = {
        "type": "object",
        "properties": {
            "file": {"type": "string", "title": "File to fix"},
            "error": {"type": ["string", "null"], "title": "Observed error"},
            "desired": {"type": "string", "title": "Desired behavior"},
        },
        "required": ["file", "desired"],
    }

    # ---------------------------------------------------------------- #
    # helpers
    # ---------------------------------------------------------------- #
    @staticmethod
    def _preview(text: str, max_chars: int = 4000) -> str:
        if not text:
            return "<empty file>"
        if len(text) <= max_chars:
            return text
        return text[:max_chars] + "\n... (truncated)"

    @staticmethod
    def _file_text(task: Task) -> str:
        raw: Any = task.inputs.get("file")
        if isinstance(raw, str):
            return raw
        if isinstance(raw, dict) and isinstance(raw.get("content"), str):
            return raw["content"]
        return ""

    # ---------------------------------------------------------------- #
    # prompts
    # ---------------------------------------------------------------- #
    def build_plan_prompt(self, task: Task) -> str:
        """Plan a minimal patch for the submitted file."""
        file_text = self._file_text(task)
        error = task.inputs.get("error")
        error_str = (error or "").strip() if isinstance(error, str) else ""
        desired = str(task.inputs.get("desired", "")).strip()
        preview = self._preview(file_text)
        return (
            f"{_SYSTEM_HINT}\n\n"
            "Plan a minimal patch to fix the submitted file.\n"
            "\n"
            f"DESIRED BEHAVIOR: {desired}\n"
            "\n"
            f"OBSERVED ERROR: {error_str if error_str else '<none provided>'}\n"
            "\n"
            f"FILE CONTENT ({_INPUT_FILE_PATH}):\n"
            f"{preview}\n"
            "\n"
            "Write a short numbered plan (3-6 steps) describing the smallest change "
            "that makes the file satisfy the desired behavior and (if an error was "
            "given) resolves the observed error.\n"
            "Rules:\n"
            "- Identify the exact lines/locations to change and what to change them to.\n"
            "- Keep the patch minimal: do not refactor unrelated code.\n"
            "- The fixed file must still be runnable in the sandbox.\n"
            "- No network access; only the standard library (pandas/numpy/matplotlib "
            "if already implied by the file).\n"
            "\n"
            "Output ONLY the numbered plan."
        )

    def build_code_prompt(self, task: Task, plan: str) -> str:
        """Ask for a script that fixes a copy, runs it, and writes fix.diff."""
        file_text = self._file_text(task)
        error = task.inputs.get("error")
        error_str = (error or "").strip() if isinstance(error, str) else ""
        desired = str(task.inputs.get("desired", "")).strip()
        preview = self._preview(file_text)
        return (
            f"{_CODE_SYSTEM_HINT}\n\n"
            f"DESIRED BEHAVIOR: {desired}\n"
            f"OBSERVED ERROR: {error_str if error_str else '<none provided>'}\n"
            "\n"
            "ANALYSIS PLAN:\n"
            f"{plan}\n"
            "\n"
            f"ORIGINAL FILE ({_INPUT_FILE_PATH}):\n"
            f"{preview}\n"
            "\n"
            "SCRIPT CONTRACT (must hold; verification depends on it):\n"
            "1. Read the original file from " + _INPUT_FILE_PATH + " as text.\n"
            "2. Apply the minimal fix from the ANALYSIS PLAN to produce the fixed "
            "content (in memory). If the original already satisfies the desired "
            "behavior, keep the content identical (no patch).\n"
            "3. Write the fixed content to " + _FIXED_FILE_PATH + ".\n"
            "4. Re-run the fixed file in the sandbox to confirm it works:\n"
            "   - If the file is Python, run it with `subprocess.run([sys.executable, "
            "'" + _FIXED_FILE_PATH + "'], ...)` and propagate its exit code.\n"
            "   - Capture stdout/stderr and print them to this script's stderr.\n"
            "   - If the re-run exits non-zero, this script must exit non-zero.\n"
            "5. Write a unified diff between the ORIGINAL and FIXED content to "
            + _DIFF_PATH + " using difflib.unified_diff (fromfile='original', "
            "tofile='fixed').\n"
            "6. As the LAST line of stdout, print exactly one line built with "
            "json.dumps(...) so it is valid, one-line JSON:\n"
            "   " + _FIX_RESULT_MARKER + ' {"changed": <bool: was any patch applied>, '
            '"run_ok": <bool: the fixed file ran with exit 0>, '
            '"diff_lines": <int: number of diff lines, 0 when unchanged>, '
            '"summary": <one short sentence>}\n'
            "   Output it like: print('" + _FIX_RESULT_MARKER + " ' + json.dumps(verdict))\n"            "7. Print any progress/debug to stderr only; stdout must stay clean "
            "except for the final " + _FIX_RESULT_MARKER + " line.\n"
            "8. Do not write files outside /workspace; do not modify "
            + _INPUT_FILE_PATH + ".\n"
            "\n"
            "The fixed file must be runnable on its own (include any needed imports). "
            "If the original is not Python, still write the diff and run it with an "
            "appropriate interpreter if available; otherwise verify syntax only.\n"
            "\n"
            "Output ONLY raw Python code. No markdown fences, no commentary."
        )

    def verify(self, execution: ExecutionResult) -> Verification:
        """PASS only when the fix is behaviorally verified.

        Rules:
          - exit code must be 0;
          - `fix.diff` must exist;
          - a `FIX_RESULT:` verdict line must parse;
          - if the agent changed the file (changed=true), the fixed file must
            actually run cleanly (run_ok=true) — otherwise the patch is
            unverified and we retry;
          - if nothing changed (changed=false), that's a pass only when the
            original already ran cleanly (the user's desired behavior needs no
            edit). A malicious/empty verdict without the line falls back to a
            strict failure so we never falsely claim success.
        """
        exit_code = int(execution.exit_code)
        if exit_code != 0:
            tail = execution.stderr.strip()[-_STDERR_TAIL_CHARS:]
            return Verification(
                ok=False,
                reason=f"script exited with code {exit_code}; stderr (tail): {tail or '<empty>'}",
            )
        if "fix.diff" not in (execution.artifacts or []):
            return Verification(ok=False, reason="exit 0 but no fix.diff artifact was produced")

        verdict = _parse_fix_verdict(execution.stdout or "")
        if verdict is None:
            return Verification(
                ok=False,
                reason="no FIX_RESULT verdict present in stdout; cannot confirm behavior",
            )

        changed = bool(verdict.get("changed"))
        run_ok = bool(verdict.get("run_ok"))
        changed_state = f"changed={changed} run_ok={run_ok} diff_lines={verdict.get('diff_lines')}"

        if changed and not run_ok:
            return Verification(
                ok=False,
                reason=f"a patch was applied but the fixed file did not run cleanly ({changed_state}); stderr (tail): {execution.stderr.strip()[-_STDERR_TAIL_CHARS:] or '<empty>'}",
            )
        if not changed and not run_ok:
            return Verification(
                ok=False,
                reason=f"no patch applied and the file did not run cleanly ({changed_state}); stderr (tail): {execution.stderr.strip()[-_STDERR_TAIL_CHARS:] or '<empty>'}",
            )
        if changed:
            return Verification(ok=True, reason=f"patch applied and verified ({changed_state})")
        return Verification(ok=True, reason="no changes needed; file already satisfies the desired behavior")


def _parse_fix_verdict(stdout: str) -> dict | None:
    """Parse the FIX_RESULT verdict line out of stdout (last occurrence wins).

    Accepts strict JSON or a Python dict literal (models sometimes emit either).
    """
    from backend.app.engine.orchestrator import _coerce_dict

    text = (stdout or "").strip()
    if not text:
        return None
    for line in reversed([ln.strip() for ln in text.splitlines() if ln.strip()]):
        marker_idx = line.rfind(_FIX_RESULT_MARKER)
        if marker_idx == -1:
            continue
        payload = line[marker_idx + len(_FIX_RESULT_MARKER):].strip()
        if not payload:
            continue
        value = _coerce_dict(payload)
        if value is not None:
            return value
    return None