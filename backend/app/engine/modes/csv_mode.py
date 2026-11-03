"""CSV Analyst mode: upload a CSV + ask a natural-language question.

The agent plans analysis steps, generates a pandas script that quotes its final
answer as a single JSON line, the sandbox executes it, and this mode verifies the
run. Owned by the `csv` agent (TASK 03). The frozen contracts live in
CONTEXT/CONTRACTS.md §2 and docs/superpowers/specs/2026-11-02-vultr-agent-rush-design.md.
"""
from __future__ import annotations

import json
from typing import Any

from backend.app.engine.orchestrator import Task
from backend.app.engine.modes.base import Verification
from backend.app.engine.modes.chart_mode import CHART_KINDS, PALETTES
from backend.app.sandbox.manager import ExecutionResult

# Marker the generated script must print at the end of stdout, followed by one
# single-line JSON object. Makes machine verification deterministic.
RESULT_MARKER = "RESULT_JSON:"

# Safety limit for echoing stderr back into verification reasons / retries.
_STDERR_TAIL_CHARS = 400

_SYSTEM_HINT = (
    "You are a data-analysis planner for a sandboxed pandas runner. "
    "The sandbox has no network access and only pandas, numpy and matplotlib "
    "are installed."
)

_CODE_SYSTEM_HINT = (
    "You write complete, self-contained Python 3 scripts for a sandboxed runner. "
    "Available: pandas, numpy, matplotlib (Agg backend is preselected). "
    "No network, no shell access, non-root user, only /workspace is writable."
)

INPUT_CSV_PATH = "/workspace/input.csv"


class CsvMode:
    """CSV Analyst mode.

    Pipeline: plan → generate pandas code → sandbox execute → verify. The mode
    only produces prompts and judges the `ExecutionResult`; the engine's
    bounded retry loop (CONTRACTS §4) handles model mistakes, so prompts are
    strict and mechanical rather than conversational.
    """

    name = "csv"

    input_schema = {
        "type": "object",
        "properties": {
            "file": {"type": "string", "description": "Uploaded CSV content (stored as input.csv)"},
            "question": {
                "type": "string",
                "minLength": 1,
                "description": "Natural-language question about the CSV data",
            },
            "palette": {
                "type": "string",
                "enum": list(PALETTES.keys()),
                "default": "aurora",
                "title": "Color palette",
            },
            "chart_type": {
                "type": "string",
                "enum": CHART_KINDS,
                "default": "auto",
                "title": "Chart type",
            },
        },
        "required": ["file", "question"],
    }

    # ---------------------------------------------------------------- #
    # prompts
    # ---------------------------------------------------------------- #
    def build_plan_prompt(self, task: Task) -> str:
        """Prompt asking the model to plan the analysis steps.

        The plan is short English prose (or a numbered list) that the next
        stage turns into code — it must not contain any code itself, and it
        must be answerable with pandas alone (no network, no ML models).
        """
        question = str(task.inputs.get("question", "")).strip()
        csv_preview = _preview(self._csv_text(task))
        return (
            "Plan the analysis steps needed to answer a question about a CSV dataset.\n"
            "\n"
            f"QUESTION: {question}\n"
            "\n"
            f"CSV PREVIEW (first ~20 rows; full file is {INPUT_CSV_PATH}):\n"
            f"{csv_preview}\n"
            "\n"
            "Write a short numbered plan (4–8 steps, no code) of what the generated "
            "pandas script must compute for the question.\n"
            "Rules:\n"
            "- State the concrete pandas operations (read_csv, column names as seen "
            "in the preview, dtype handling, groupby/agg, sorting, etc.).\n"
            "- Specify exactly which numbers/rows go into the final JSON answer.\n"
            "- If a summary chart would clarify the answer, add one optional step "
            "that saves it to /workspace/chart.png with matplotlib (Agg backend).\n"
            "- No network access and no libraries beyond pandas/numpy/matplotlib — "
            "the plan must be computable in the sandbox.\n"
            "\n"
            "Output ONLY the numbered plan."
        )

    def build_code_prompt(self, task: Task, plan: str) -> str:
        """Prompt asking the model for a runnable pandas script.

        The script contract (also enforced by `verify`):
          1. reads /workspace/input.csv with pandas;
          2. computes the answer following the plan;
          3. prints any human-readable progress to stderr only;
          4. ends stdout with exactly one line `RESULT_JSON: {...}` whose JSON
             object is the machine-readable answer;
          5. optionally writes chart images into /workspace.
        """
        question = str(task.inputs.get("question", "")).strip()
        csv_preview = _preview(self._csv_text(task))
        hexes = PALETTES.get(task.inputs.get("palette", "aurora"), PALETTES["aurora"])
        kind = task.inputs.get("chart_type", "auto")
        kind = kind if kind in CHART_KINDS else "auto"
        palette_line = ", ".join(hexes)
        return (
            "Write a complete Python script that answers a question about a CSV file.\n"
            "\n"
            f"QUESTION: {question}\n"
            "\n"
            "ANALYSIS PLAN:\n"
            f"{plan}\n"
            "\n"
            f"CSV PREVIEW (first ~20 rows; full file is {INPUT_CSV_PATH}):\n"
            f"{csv_preview}\n"
            "\n"
            "SCRIPT CONTRACT (must hold; verification depends on it):\n"
            "1. import at most pandas, numpy, matplotlib (Agg backend is preselected "
            "via MPLBACKEND — do not call plt.show()).\n"
            "2. Read the dataset with pandas from " + INPUT_CSV_PATH + ".\n"
            "3. Compute the answer following the ANALYSIS PLAN.\n"
            "4. Use `print(..., file=sys.stderr)` for any progress/debug output; "
            "stdout must stay clean except for the final RESULT_JSON line.\n"
            "5. As the LAST line of stdout, print exactly one line:\n"
            '   ' + RESULT_MARKER + ' {"summary": <str answering the question>, '
            '"numbers": <dict of the computed stats>, "table": <optional list of row '
            "dicts>, \"chart\": <\"chart.png\" if a chart was written, else omit>}\n"
            "   That line must parse as a single valid JSON object on one line."
            "\n"
            "6. If the plan calls for a chart, save it to /workspace/chart.png "
            "(figures are copied out as artifacts automatically).\n"
            "7. No network, no shell commands, no file writes outside /workspace, "
            "and never write back into " + INPUT_CSV_PATH + ".\n"
            "8. Chart styling (when a chart is produced): use these exact hex colors "
            "for series, in order: " + palette_line + ". Chart kind: " + kind + " "
            "(use 'auto' only when a single obvious kind fits; otherwise render "
            "exactly bar/line/scatter/histogram/pie/box).\n"
            "\n"
            "Column names must be taken from the CSV preview (inspect "
            "df.columns/list(df) first if unsure). If a numeric column contains "
            "non-numeric junk, coerce it safely (pd.to_numeric with errors=\"coerce\") "
            "instead of letting the script crash.\n"
            "\n"
            "Output ONLY raw Python code. No markdown fences, no commentary."
        )

    # ---------------------------------------------------------------- #
    # verification
    # ---------------------------------------------------------------- #
    def verify(self, execution: ExecutionResult) -> Verification:
        """PASS when the script exited 0 AND produced a machine-readable answer.

        The primary signal is a parseable `RESULT_JSON: {...}` (or bare JSON)
        line in stdout. Fallback per the design doc: any artifact other than
        the input file itself counts as output (e.g. a chart). Any other
        outcome FAILs with a reason the engine can surface during retries.
        """
        exit_code = int(execution.exit_code)
        if exit_code != 0:
            tail = execution.stderr.strip()[-_STDERR_TAIL_CHARS:]
            return Verification(
                ok=False,
                reason=f"script exited with code {exit_code}; stderr (tail): {tail or '<empty>'}",
            )

        json_payload = self._extract_json(execution.stdout)
        if json_payload is not None:
            return Verification(ok=True, reason="exit 0 and RESULT_JSON answer parsed")

        extra_artifacts = _filter_expected_artifacts(execution.artifacts)
        if extra_artifacts:
            return Verification(
                ok=True,
                reason="exit 0; no parseable RESULT_JSON, but output artifacts present: "
                + ", ".join(extra_artifacts),
            )

        return Verification(
            ok=False,
            reason="exit 0 but stdout contained no parseable RESULT_JSON answer "
            "and no output artifacts were written",
        )

    # ---------------------------------------------------------------- #
    # helpers
    # ---------------------------------------------------------------- #
    def _csv_text(self, task: Task) -> str:
        """Return the uploaded CSV text from task inputs, or '' if absent."""
        raw: Any = task.inputs.get("file")
        if isinstance(raw, str):
            return raw
        if isinstance(raw, dict) and isinstance(raw.get("content"), str):
            return raw["content"]
        return ""

    @staticmethod
    def _extract_json(stdout: str) -> dict | list | None:
        """Parse the RESULT_JSON answer out of stdout.

        Strategy: prefer the (single, mandated) RESULT_JSON line — its tail
        must be a complete JSON object on one line. Fall back to scanning all
        lines bottom-up for a bare JSON object/array, then to extracting the
        first balanced JSON object embedded in stdout. Returns None when no
        JSON can be parsed.
        """
        text = stdout.strip()
        if not text:
            return None

        # 1) mandated marker line (kept as a suffix search for robustness)
        marker_idx = text.rfind(RESULT_MARKER)
        if marker_idx != -1:
            payload = text[marker_idx + len(RESULT_MARKER):].strip()
            parsed = _try_json_line(payload)
            if parsed is not None:
                return parsed

        # 2) bare JSON anywhere, bottom-up (last line first = most recent output)
        for line in reversed([ln.strip() for ln in text.splitlines() if ln.strip()]):
            parsed = _try_json_line(line)
            if parsed is not None:
                return parsed

        # 3) first balanced {...} / [...] embedded in (possibly noisy) stdout
        embedded = _first_balanced_json(text)
        return embedded


def _try_json_line(text: str) -> dict | list | None:
    """Return parsed JSON for `text` or None. Trailing prose after JSON is
    tolerated when the line starts with { or [."""
    if not text:
        return None
    try:
        value = json.loads(text)
    except (json.JSONDecodeError, ValueError):
        start = text.find("{") if "{" in text or "[" in text else -1
        if start == -1:
            return None
        sliced = _first_balanced_json(text[start:])
        return sliced
    if isinstance(value, (dict, list)):
        return value
    return None


def _first_balanced_json(text: str) -> dict | list | None:
    """Find the first balanced JSON object/array in `text` and parse it.

    Naive depth scanning with string-literal awareness; candidate blocks are
    capped at 100_000 chars for safety. Returns None when no balanced block
    parses as a JSON container.
    """
    if not text:
        return None
    openers = {"{": "}", "[": "]"}
    for start, opener in enumerate(text):
        if opener not in openers:
            continue
        closer = openers[opener]
        depth = 0
        in_string = False
        escaped = False
        found_closer = False
        for i in range(start, min(len(text), start + 100_000)):
            c = text[i]
            if in_string:
                if escaped:
                    escaped = False
                elif c == "\\":
                    escaped = True
                elif c == '"':
                    in_string = False
                continue
            if c == '"':
                in_string = True
            elif c == opener:
                depth += 1
            elif c == closer:
                depth -= 1
                if depth == 0:
                    found_closer = True
                    candidate = text[start:i + 1]
                    try:
                        value = json.loads(candidate)
                    except (json.JSONDecodeError, ValueError):
                        break  # this opener is not valid JSON; try the next one
                    if isinstance(value, (dict, list)):
                        return value
                    break
                if depth < 0:  # defensive: closer without matching opener
                    break
        if found_closer:
            continue  # invalid or non-container block; keep scanning later openers
        return None  # unbalanced opener — no point scanning further
    return None


def _preview(csv_text: str, max_rows: int = 20, max_chars: int = 3000) -> str:
    """Trim a CSV snapshot small enough to embed in prompts deterministically."""
    text = (csv_text or "").strip("\n")
    if not text:
        return "<empty csv>"
    lines = text.splitlines()
    keep = lines[: max_rows + 1]  # header + first rows
    preview = "\n".join(keep)
    if len(preview) > max_chars:
        preview = preview[:max_chars].rsplit("\n", 1)[0] + "\n… (truncated)"
    if len(lines) > max_rows + 1:
        preview += f"\n… ({len(lines) - max_rows - 1} more rows)"
    return preview


def _filter_expected_artifacts(artifacts: list[str]) -> list[str]:
    """Artifacts that count as *output* (only the uploaded input itself is excluded)."""
    return [a for a in artifacts if a != "input.csv"]
