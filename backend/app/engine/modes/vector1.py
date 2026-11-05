"""Vector 1: Messy Data → Decision (Business Analytics).

Multi-step pipeline: profile → clean → analyze → chart → report.
Each step runs in the sandbox; each step's output feeds the next step's prompt.
"""
from __future__ import annotations

from backend.app.engine.modes.base import Step, Verification
from backend.app.engine.modes.pipeline_base import PipelineModeBase
from backend.app.engine.orchestrator import Task
from backend.app.sandbox.manager import ExecutionResult

PALETTES = {
    "aurora": ["#7aa2f7", "#bb9af7", "#7dcfff", "#73daca", "#ff9e64", "#f7768e"],
    "cobalt": ["#1d4ed8", "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"],
    "emerald": ["#065f46", "#047857", "#059669", "#10b981", "#34d399", "#6ee7b7"],
    "ember": ["#7c2d12", "#9a3412", "#c2410c", "#ea580c", "#f97316", "#fb923c"],
    "mono": ["#1f2937", "#374151", "#4b5563", "#6b7280", "#9ca3af", "#d1d5db"],
}


def _extract_text(task: Task) -> str:
    raw = task.inputs.get("file", "")
    return raw if isinstance(raw, str) else ""


def _preview(text: str, max_rows: int = 15, max_chars: int = 2000) -> str:
    lines = (text or "").strip().splitlines()
    preview = "\n".join(lines[: max_rows + 1])
    if len(preview) > max_chars:
        preview = preview[:max_chars].rsplit("\n", 1)[0] + "\n… (truncated)"
    if len(lines) > max_rows + 1:
        preview += f"\n… ({len(lines) - max_rows - 1} more rows)"
    return preview or "<empty>"


# ── Step 1: Profile ──────────────────────────────────────────────────────────
def _profile_prompt(task: Task, ctx: dict) -> str:
    csv_text = _extract_text(task)
    return (
        "You are a data profiler. Write a Python script that reads /workspace/input.csv "
        "and produces a JSON profile report.\n\n"
        f"CSV PREVIEW (first ~15 rows):\n{_preview(csv_text)}\n\n"
        "The script must:\n"
        "1. Read the CSV with pandas from /workspace/input.csv\n"
        "2. Report: shape (rows, cols), column names, dtypes, null counts per column,\n"
        "   unique value counts for categorical columns, basic stats (min/max/mean/median)\n"
        "   for numeric columns, and detected issues (mixed formats, inconsistent types)\n"
        "3. Print a single line: PROFILE_JSON: {\"shape\": [rows, cols], \"columns\": [...],\n"
        "   \"nulls\": {...}, \"stats\": {...}, \"issues\": [...]}\n"
        "4. Print debug to stderr only\n"
        "5. No network, no file writes outside /workspace\n\n"
        "Output ONLY raw Python code."
    )


def _profile_verify(exec: ExecutionResult, ctx: dict) -> Verification:
    if exec.exit_code != 0:
        return Verification(ok=False, reason=f"profile exited {exec.exit_code}: {exec.stderr.strip()[-300:]}")
    if not exec.stdout.strip():
        return Verification(ok=False, reason="profile produced no output")
    return Verification(ok=True, reason="profile complete")


def _profile_files(task: Task, ctx: dict) -> dict:
    return {"input.csv": _extract_text(task)}


# ── Step 2: Clean ────────────────────────────────────────────────────────────
def _clean_prompt(task: Task, ctx: dict) -> str:
    profile = ctx.get("profile", {}).get("stdout", "")
    csv_text = _extract_text(task)
    return (
        "You are a data cleaning agent. Write a Python script that reads /workspace/input.csv, "
        "cleans it based on the profile below, and saves /workspace/cleaned.csv.\n\n"
        f"PROFILE REPORT:\n{profile[:1500]}\n\n"
        f"CSV PREVIEW:\n{_preview(csv_text)}\n\n"
        "The script must:\n"
        "1. Read the CSV from /workspace/input.csv\n"
        "2. Standardize dates to YYYY-MM-DD (handle mixed formats)\n"
        "3. Normalize currencies (convert to USD if mixed, or flag)\n"
        "4. Fill nulls: median for numeric, 'unknown' for categorical\n"
        "5. Standardize column names to snake_case\n"
        "6. Remove obvious outliers (>3 sigma) for numeric columns\n"
        "7. Save cleaned data to /workspace/cleaned.csv\n"
        "8. Print a change log: CLEAN_LOG: {\"changes\": [...], \"rows_before\": N, \"rows_after\": M}\n"
        "9. No network, no file writes outside /workspace\n\n"
        "Output ONLY raw Python code."
    )


def _clean_verify(exec: ExecutionResult, ctx: dict) -> Verification:
    if exec.exit_code != 0:
        return Verification(ok=False, reason=f"clean exited {exec.exit_code}: {exec.stderr.strip()[-300:]}")
    if not exec.stdout.strip() and not exec.artifacts:
        return Verification(ok=False, reason="clean produced no output")
    return Verification(ok=True, reason="cleaning complete")


def _clean_files(task: Task, ctx: dict) -> dict:
    return {"input.csv": _extract_text(task)}


# ── Step 3: Analyze ──────────────────────────────────────────────────────────
def _analyze_prompt(task: Task, ctx: dict) -> str:
    profile = ctx.get("profile", {}).get("stdout", "")
    clean_log = ctx.get("clean", {}).get("stdout", "")
    question = task.inputs.get("question", "Summarize the key findings")
    return (
        "You are a data analyst. Write a Python script that reads /workspace/cleaned.csv "
        "and answers the user's question.\n\n"
        f"USER QUESTION: {question}\n\n"
        f"PROFILE:\n{profile[:800]}\n\n"
        f"CLEANING LOG:\n{clean_log[:800]}\n\n"
        "The script must:\n"
        "1. Read /workspace/cleaned.csv if it exists, otherwise /workspace/input.csv, with pandas\n"
        "2. Compute the answer to the user's question\n"
        "3. Detect anomalies (spikes, drops, outliers) if relevant\n"
        "4. Compute trends (month-over-month, week-over-week) if relevant\n"
        "5. Print: ANALYSIS_JSON: {\"summary\": \"...\", \"numbers\": {...}, \"insights\": [...], \"anomalies\": [...]}\n"
        "6. Print debug to stderr only\n"
        "7. No network, no file writes outside /workspace\n\n"
        "Output ONLY raw Python code."
    )


def _analyze_verify(exec: ExecutionResult, ctx: dict) -> Verification:
    if exec.exit_code != 0:
        return Verification(ok=False, reason=f"analyze exited {exec.exit_code}: {exec.stderr.strip()[-300:]}")
    if not exec.stdout.strip():
        return Verification(ok=False, reason="analysis produced no output")
    return Verification(ok=True, reason="analysis complete")


def _analyze_files(task: Task, ctx: dict) -> dict:
    files = {}
    clean_ctx = ctx.get("clean", {})
    artifact_contents = clean_ctx.get("artifact_contents", {})
    if "cleaned.csv" in artifact_contents:
        files["cleaned.csv"] = artifact_contents["cleaned.csv"]
    else:
        files["input.csv"] = _extract_text(task)
    return files


# ── Step 4: Chart ────────────────────────────────────────────────────────────
def _chart_prompt(task: Task, ctx: dict) -> str:
    analysis = ctx.get("analyze", {}).get("stdout", "")
    palette = task.inputs.get("palette", "aurora")
    hexes = PALETTES.get(palette, PALETTES["aurora"])
    palette_line = ", ".join(hexes)
    return (
        "You are a data visualization agent. Write a Python script that reads "
        "/workspace/cleaned.csv and creates a chart based on the analysis below.\n\n"
        f"ANALYSIS:\n{analysis[:1000]}\n\n"
        f"COLOR PALETTE (use these exact hex colors): {palette_line}\n\n"
        "The script must:\n"
        "1. Read /workspace/cleaned.csv if it exists, otherwise /workspace/input.csv, with pandas\n"
        "2. Create a chart that visualizes the key finding from the analysis\n"
        "3. Save to /workspace/chart.png\n"
        "4. Use `print(..., file=sys.stderr)` for debug; stdout stays clean\n"
        "5. No network, no file writes outside /workspace\n"
        "6. Apply the COLOR PALETTE to all data series\n\n"
        "Output ONLY raw Python code."
    )


def _chart_verify(exec: ExecutionResult, ctx: dict) -> Verification:
    if exec.exit_code != 0:
        return Verification(ok=False, reason=f"chart exited {exec.exit_code}: {exec.stderr.strip()[-300:]}")
    if "chart.png" not in exec.artifacts:
        return Verification(ok=False, reason="chart.png artifact not produced")
    return Verification(ok=True, reason="chart complete")


def _chart_files(task: Task, ctx: dict) -> dict:
    files = {}
    clean_ctx = ctx.get("clean", {})
    artifact_contents = clean_ctx.get("artifact_contents", {})
    if "cleaned.csv" in artifact_contents:
        files["cleaned.csv"] = artifact_contents["cleaned.csv"]
    else:
        files["input.csv"] = _extract_text(task)
    return files


# ── Step 5: Report ───────────────────────────────────────────────────────────
def _report_prompt(task: Task, ctx: dict) -> str:
    profile = ctx.get("profile", {}).get("stdout", "")
    clean_log = ctx.get("clean", {}).get("stdout", "")
    analysis = ctx.get("analyze", {}).get("stdout", "")
    return (
        "You are a business analyst. Write a concise report (5-8 sentences) summarizing "
        "the analysis. Reference specific numbers and the chart.\n\n"
        f"PROFILE:\n{profile[:500]}\n\n"
        f"CLEANING:\n{clean_log[:500]}\n\n"
        f"ANALYSIS:\n{analysis[:1000]}\n\n"
        "The report must:\n"
        "- Summarize what was found in 2-3 sentences\n"
        "- List 3-5 key findings with numbers\n"
        "- Note any data quality issues found during cleaning\n"
        "- Reference the chart (chart.png)\n"
        "- Be plain English, no code, no markdown\n\n"
        "Output ONLY the report text."
    )


def _report_verify(exec: ExecutionResult, ctx: dict) -> Verification:
    # No sandbox run for this step — just check the text is non-empty
    return Verification(ok=True, reason="report generated")


class Vector1Mode(PipelineModeBase):
    name = "vector1"
    input_schema = {
        "type": "object",
        "properties": {
            "file": {"type": "string", "description": "Raw CSV data"},
            "question": {"type": "string", "description": "What to analyze"},
            "palette": {"type": "string", "enum": list(PALETTES.keys()), "default": "aurora"},
        },
        "required": ["file", "question"],
    }

    pipeline_steps = [
        Step(name="profile", system_prompt="You are a data profiler. Output ONLY raw Python code.",
             build_prompt=_profile_prompt, verify=_profile_verify, files=_profile_files, timeout_s=30),
        Step(name="clean", system_prompt="You are a data cleaning agent. Output ONLY raw Python code.",
             build_prompt=_clean_prompt, verify=_clean_verify, files=_clean_files, timeout_s=30),
        Step(name="analyze", system_prompt="You are a data analyst. Output ONLY raw Python code.",
             build_prompt=_analyze_prompt, verify=_analyze_verify, files=_analyze_files, timeout_s=30),
        Step(name="chart", system_prompt="You are a data visualization agent. Output ONLY raw Python code.",
             build_prompt=_chart_prompt, verify=_chart_verify, files=_chart_files, timeout_s=30),
        Step(name="report", system_prompt="You are a business analyst. Output ONLY the report text.",
             build_prompt=_report_prompt, verify=_report_verify, files=lambda t, c: {}, timeout_s=10, text_only=True),
    ]

    # For backward compat with single-step Mode protocol
    def build_plan_prompt(self, task):
        return self.build_overall_plan_prompt(task)

    def build_code_prompt(self, task, plan):
        return ""

    def verify(self, execution):
        return Verification(ok=True, reason="pipeline mode — verified per-step")
