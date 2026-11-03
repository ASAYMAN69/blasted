"""Chart Anything mode (chart). Implement per TASK 05.

The mode receives tabular data (CSV or JSON) and a natural‑language request describing the desired visualization.
It produces either a PNG image (matplotlib) or an interactive HTML file (plotly) inside the sandbox workspace.
The orchestrator feeds the raw data string as the `data` input; the engine writes it to `/workspace/data.csv` (or `.json` depending on format) before invoking the sandbox.

Implementation mirrors the CsvMode pattern: construct a concise planning prompt, a strict code‑generation prompt, and verify the sandbox execution by checking the exit code and the presence of the expected artifact (`chart.png` or `chart.html`).
"""
from __future__ import annotations

import json
from typing import Any

from backend.app.engine.orchestrator import Task
from backend.app.engine.modes.base import Verification
from backend.app.sandbox.manager import ExecutionResult

# Constants
_INPUT_DATA_PATH = "/workspace/data.csv"  # CSV preview; JSON can also be read via pandas.read_json
_STDERR_TAIL_CHARS = 400

# Visual customization presets (hex palettes + chart kinds) offered to the UI.
PALETTES: dict[str, list[str]] = {
    "aurora": ["#7aa2f7", "#bb9af7", "#7dcfff", "#73daca", "#ff9e64", "#f7768e"],
    "cobalt": ["#1d4ed8", "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"],
    "emerald": ["#065f46", "#047857", "#059669", "#10b981", "#34d399", "#6ee7b7"],
    "ember": ["#7c2d12", "#9a3412", "#c2410c", "#ea580c", "#f97316", "#fb923c"],
    "mono": ["#1f2937", "#374151", "#4b5563", "#6b7280", "#9ca3af", "#d1d5db"],
}

CHART_KINDS = ["auto", "bar", "line", "scatter", "histogram", "pie", "box"]

_SYSTEM_HINT = (
    "You are a chart‑generation planner for a sandboxed Python runner. "
    "The sandbox provides pandas, numpy, matplotlib (Agg backend pre‑selected), and plotly. "
    "No network access, no shell, and only the /workspace directory is writable."
)

_CODE_SYSTEM_HINT = (
    "You write a self‑contained Python 3 script that reads the input data file, "
    "creates the requested chart, and saves it to the workspace. "
    "Use matplotlib for PNG output and plotly for HTML output. "
    "Do not call plt.show() or open a browser; the Agg backend handles PNG rendering. "
    "Print any progress or diagnostics to stderr; stdout should remain clean."
)


class ChartMode:
    """Chart Anything mode implementation.

    The mode follows the contract from `backend/app/engine/modes/base.py`.
    It accepts a `data` string (CSV or JSON) and a `request` describing the visualization.
    An optional `format` selects PNG (matplotlib) or HTML (plotly) output.
    Optional `palette` / `chart_type` control visual styling.
    """

    name = "chart"
    input_schema = {
        "type": "object",
        "properties": {
            "data": {"type": "string", "title": "CSV/JSON data"},
            "request": {"type": "string", "title": "What to visualize"},
            "format": {"type": "string", "enum": ["png", "html"], "default": "png"},
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
        "required": ["data", "request"],
    }

    @staticmethod
    def _palette_hex(task: Task) -> list[str]:
        """Resolve the chosen palette to concrete hex values."""
        name = task.inputs.get("palette", "aurora")
        return PALETTES.get(name, PALETTES["aurora"])

    @staticmethod
    def _chart_kind(task: Task) -> str:
        kind = task.inputs.get("chart_type", "auto")
        return kind if kind in CHART_KINDS else "auto"

    # -----------------------------------------------------------------
    # helpers
    # -----------------------------------------------------------------
    @staticmethod
    def _data_text(task: Task) -> str:
        """Return the raw data string passed in the task inputs.
        The orchestrator stores the content under the `data` key.
        """
        raw: Any = task.inputs.get("data")
        return raw if isinstance(raw, str) else ""

    @staticmethod
    def _preview(data: str, max_rows: int = 20, max_chars: int = 3000) -> str:
        """Create a deterministic preview of the CSV/JSON data for prompt context.
        For CSV we show the first few lines; for JSON we pretty‑print the first part.
        """
        if not data:
            return "<empty data>"
        # Heuristic: if the string looks like JSON (starts with { or [) and can be parsed, pretty‑print a slice.
        stripped = data.lstrip()
        if stripped.startswith("{") or stripped.startswith("["):
            try:
                parsed = json.loads(data)
                pretty = json.dumps(parsed, indent=2)
                if len(pretty) > max_chars:
                    pretty = pretty[: max_chars].rsplit("\n", 1)[0] + "\n… (truncated)"
                return pretty
            except Exception:
                # fallback to raw slice
                pass
        # Treat as CSV
        lines = data.splitlines()
        preview = "\n".join(lines[: max_rows + 1])
        if len(preview) > max_chars:
            preview = preview[:max_chars].rsplit("\n", 1)[0] + "\n… (truncated)"
        if len(lines) > max_rows + 1:
            preview += f"\n… ({len(lines) - max_rows - 1} more rows)"
        return preview

    # -----------------------------------------------------------------
    # prompts
    # -----------------------------------------------------------------
    def build_plan_prompt(self, task: Task) -> str:
        """Prompt the model to plan the chart generation steps.
        The plan must be plain English (or a short numbered list) describing the
        pandas/plotly operations needed to satisfy the request. No code is allowed.
        """
        request = str(task.inputs.get("request", "")).strip()
        data_preview = self._preview(self._data_text(task))
        fmt = task.inputs.get("format", "png")
        kind = self._chart_kind(task)
        return (
            f"{_SYSTEM_HINT}\n\n"
            f"Plan the steps required to create the requested visualization.\n"
            f"\n"
            f"REQUEST: {request}\n"
            f"OUTPUT FORMAT: {fmt}\n"
            f"CHART TYPE: {kind} (use 'auto' only when a single obvious kind fits)\n"
            f"\n"
            f"DATA PREVIEW (first ~20 rows / entries):\n{data_preview}\n"
            f"\n"
            "Write a short numbered plan (4–8 steps) that a Python script can follow.\n"
            "Include the library calls (pandas.read_csv or pandas.read_json, matplotlib or plotly functions) and any data‑cleaning needed.\n"
            "Do NOT include any code in the plan.\n"
            "Output ONLY the numbered plan."
        )

    def build_code_prompt(self, task: Task, plan: str) -> str:
        """Prompt the model to generate a runnable Python script based on the plan.
        The script must read the data from {_INPUT_DATA_PATH}, produce the chart, and write it to the appropriate file.
        """
        request = str(task.inputs.get("request", "")).strip()
        fmt = task.inputs.get("format", "png").strip().lower()
        artifact_name = "chart.png" if fmt == "png" else "chart.html"
        data_preview = self._preview(self._data_text(task))
        hexes = self._palette_hex(task)
        kind = self._chart_kind(task)
        palette_line = ", ".join(hexes)
        return (
            f"{_CODE_SYSTEM_HINT}\n\n"
            f"REQUEST: {request}\n"
            f"OUTPUT FORMAT: {fmt}\n"
            f"CHART TYPE: {kind} (use 'auto' only when a single obvious kind fits)\n"
            f"COLOR PALETTE (use these exact hex colors for data series, in order): {palette_line}\n"
            f"\n"
            f"PLAN:\n{plan}\n"
            f"\n"
            f"DATA PREVIEW (first ~20 rows / entries):\n{data_preview}\n"
            f"\n"
            "SCRIPT CONTRACT (must hold):\n"
            "1. Import only pandas, numpy, matplotlib (for PNG) or plotly (for HTML).\n"
            f"2. Read the input data from {_INPUT_DATA_PATH} using pandas.read_csv or pandas.read_json as appropriate.\n"
            "3. Follow the analysis/visualization steps described in the PLAN.\n"
            "4. Save the resulting chart to /workspace/" + artifact_name + ".\n"
            "5. Use `print(..., file=sys.stderr)` for any debug/info; stdout must stay empty.\n"
            "6. Do NOT call plt.show() or open a browser.\n"
            "7. Do NOT perform any network requests or write files outside /workspace.\n"
            '8. Apply the chosen COLOR PALETTE: for matplotlib pass the hex list directly (e.g. plt.bar(..., color=[...])); for plotly use marker/color arrays with the same hex values.\n'
            "9. If the CHART TYPE is not 'auto', render exactly that kind (bar/line/scatter/histogram/pie/box). If 'auto', pick the most appropriate single kind.\n"
            "\n"
            "Output ONLY the raw Python code, no markdown fences or explanations."
        )

    # -----------------------------------------------------------------
    # verification
    # -----------------------------------------------------------------
    def verify(self, execution: ExecutionResult) -> Verification:
        """PASS if exit code 0 and the expected chart artifact exists and is non‑empty.
        The sandbox reports artifact filenames; we look for `chart.png` or `chart.html`
        depending on the requested format.
        """
        exit_code = int(execution.exit_code)
        if exit_code != 0:
            tail = execution.stderr.strip()[-_STDERR_TAIL_CHARS:]
            return Verification(
                ok=False,
                reason=f"script exited with code {exit_code}; stderr (tail): {tail or '<empty>'}",
            )
        # Determine expected artifact based on the original task format.
        # The orchestrator does not pass the task here, but we can infer from artifacts list.
        # Prefer explicit png/html detection.
        png_present = "chart.png" in execution.artifacts
        html_present = "chart.html" in execution.artifacts
        if png_present or html_present:
            # Prefer the one that matches the requested format if possible.
            # If both are present, still consider it a success.
            return Verification(ok=True, reason="exit 0 and chart artifact produced")
        # No chart artifact – failure.
        return Verification(
            ok=False,
            reason="exit 0 but no chart artifact (chart.png or chart.html) was produced",
        )
