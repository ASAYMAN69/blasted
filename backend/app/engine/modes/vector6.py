"""Vector 6: Raw → Clean → Analyze → Visualize → Narrate (Data Science).

Multi-step pipeline: profile → clean → analyze → charts → insights.
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


def _preview(text: str, max_chars: int = 2000) -> str:
    text = (text or "").strip()
    if not text:
        return "<empty>"
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + "\n... (truncated)"


# ── Step 1: Profile ──────────────────────────────────────────────────────────
def _profile_prompt(task: Task, ctx: dict) -> str:
    csv_text = _extract_text(task)
    return (
        "You are a data profiler. Write a Python script that reads /workspace/input.csv "
        "and produces a JSON profile report.\n\n"
        f"CSV PREVIEW:\n{_preview(csv_text)}\n\n"
        "The script must:\n"
        "1. Read the CSV with pandas from /workspace/input.csv\n"
        "2. Report: shape, column names, dtypes, null counts, unique values (categorical), "
        "basic stats (min/max/mean/median/std) for numeric columns\n"
        "3. Detect issues: mixed types, nulls, outliers, inconsistent formats\n"
        "4. Print: PROFILE_JSON: {\"shape\": [rows, cols], \"columns\": [...], "
        "\"nulls\": {...}, \"stats\": {...}, \"issues\": [...]}\n"
        "5. Print debug to stderr only\n"
        "6. No network, no file writes outside /workspace\n\n"
        "Output ONLY raw Python code."
    )


def _profile_verify(exec: ExecutionResult, ctx: dict) -> Verification:
    if exec.exit_code != 0:
        return Verification(ok=False, reason=f"exited {exec.exit_code}: {exec.stderr.strip()[-200:]}")
    if exec.artifacts:
        return Verification(ok=True, reason=f"step complete ({len(exec.artifacts)} artifacts)")
    if exec.stdout.strip():
        return Verification(ok=True, reason="step complete")
    return Verification(ok=False, reason="no output produced")


def _profile_files(task: Task, ctx: dict) -> dict:
    return {"input.csv": _extract_text(task)}


# ── Step 2: Clean ────────────────────────────────────────────────────────────
def _clean_prompt(task: Task, ctx: dict) -> str:
    profile = ctx.get("profile", {}).get("stdout", "")
    csv_text = _extract_text(task)
    return (
        "You are a data cleaning agent. Write a Python script that reads /workspace/input.csv, "
        "cleans it, and saves /workspace/cleaned.csv.\n\n"
        f"PROFILE:\n{profile[:1500]}\n\n"
        f"CSV PREVIEW:\n{_preview(csv_text)}\n\n"
        "The script must:\n"
        "1. Read the CSV from /workspace/input.csv\n"
        "2. Handle nulls: mean/median for numeric, 'unknown' for categorical\n"
        "3. Fix types: convert string numbers to numeric, parse dates, standardize categories\n"
        "4. Remove outliers (>3 sigma) for numeric columns\n"
        "5. Standardize column names to snake_case\n"
        "6. Save cleaned data to /workspace/cleaned.csv\n"
        "7. Print: CLEAN_LOG: {\"changes\": [...], \"rows_before\": N, \"rows_after\": M, \"nulls_before\": N, \"nulls_after\": M}\n"
        "8. No network, no file writes outside /workspace\n\n"
        "Output ONLY raw Python code."
    )


def _clean_verify(exec: ExecutionResult, ctx: dict) -> Verification:
    if exec.exit_code != 0:
        return Verification(ok=False, reason=f"exited {exec.exit_code}: {exec.stderr.strip()[-200:]}")
    if exec.artifacts:
        return Verification(ok=True, reason=f"step complete ({len(exec.artifacts)} artifacts)")
    if exec.stdout.strip():
        return Verification(ok=True, reason="step complete")
    return Verification(ok=False, reason="no output produced")


def _clean_files(task: Task, ctx: dict) -> dict:
    return {"input.csv": _extract_text(task)}


# ── Step 3: Analyze ──────────────────────────────────────────────────────────
def _analyze_prompt(task: Task, ctx: dict) -> str:
    profile = ctx.get("profile", {}).get("stdout", "")
    clean_log = ctx.get("clean", {}).get("stdout", "")
    question = task.inputs.get("question", "")
    return (
        "You are a data scientist. Write a Python script that reads /workspace/cleaned.csv "
        "and runs an exploratory data analysis.\n\n"
        f"USER QUESTION: {question if question else 'No specific question — run standard EDA'}\n\n"
        f"PROFILE:\n{profile[:800]}\n\n"
        f"CLEANING LOG:\n{clean_log[:800]}\n\n"
        "The script must:\n"
        "1. Read /workspace/cleaned.csv with pandas\n"
        "2. If a question was asked, answer it specifically\n"
        "3. Otherwise run standard EDA: correlation matrix, top categories, "
        "distribution summary, segment analysis\n"
        "4. Print: ANALYSIS_JSON: {\"summary\": \"...\", \"findings\": [...], \"correlations\": {...}, "
        "\"segments\": {...}}\n"
        "5. Print debug to stderr only\n"
        "6. No network, no file writes outside /workspace\n\n"
        "Output ONLY raw Python code."
    )


def _analyze_verify(exec: ExecutionResult, ctx: dict) -> Verification:
    if exec.exit_code != 0:
        return Verification(ok=False, reason=f"exited {exec.exit_code}: {exec.stderr.strip()[-200:]}")
    if exec.artifacts:
        return Verification(ok=True, reason=f"step complete ({len(exec.artifacts)} artifacts)")
    if exec.stdout.strip():
        return Verification(ok=True, reason="step complete")
    return Verification(ok=False, reason="no output produced")


def _analyze_files(task: Task, ctx: dict) -> dict:
    return {}


# ── Step 4: Charts ───────────────────────────────────────────────────────────
def _charts_prompt(task: Task, ctx: dict) -> str:
    analysis = ctx.get("analyze", {}).get("stdout", "")
    palette = task.inputs.get("palette", "aurora")
    hexes = PALETTES.get(palette, PALETTES["aurora"])
    palette_line = ", ".join(hexes)
    return (
        "You are a data visualization agent. Write a Python script that reads "
        "/workspace/cleaned.csv and creates 2-3 charts based on the analysis.\n\n"
        f"ANALYSIS:\n{analysis[:1000]}\n\n"
        f"COLOR PALETTE: {palette_line}\n\n"
        "The script must:\n"
        "1. Read /workspace/cleaned.csv with pandas\n"
        "2. Create 2-3 charts: correlation heatmap (if multiple numeric cols), "
        "bar chart (if categorical breakdown), line chart (if time series), "
        "histogram (if distribution analysis)\n"
        "3. Save each to /workspace/chart1.png, /workspace/chart2.png, etc.\n"
        "4. Use the COLOR PALETTE for all data series\n"
        "5. Print: CHARTS_JSON: {\"charts\": [\"chart1.png\", \"chart2.png\"]}\n"
        "6. Print debug to stderr only\n"
        "7. No network, no file writes outside /workspace\n\n"
        "Output ONLY raw Python code."
    )


def _charts_verify(exec: ExecutionResult, ctx: dict) -> Verification:
    if exec.exit_code != 0:
        return Verification(ok=False, reason=f"exited {exec.exit_code}: {exec.stderr.strip()[-200:]}")
    if exec.artifacts:
        return Verification(ok=True, reason=f"step complete ({len(exec.artifacts)} artifacts)")
    if exec.stdout.strip():
        return Verification(ok=True, reason="step complete")
    return Verification(ok=False, reason="no output produced")


def _charts_files(task: Task, ctx: dict) -> dict:
    return {}


# ── Step 5: Insights ─────────────────────────────────────────────────────────
def _insights_prompt(task: Task, ctx: dict) -> str:
    profile = ctx.get("profile", {}).get("stdout", "")
    clean_log = ctx.get("clean", {}).get("stdout", "")
    analysis = ctx.get("analyze", {}).get("stdout", "")
    charts = ctx.get("charts", {}).get("stdout", "")
    return (
        "You are a data scientist writing an insights report. Write a 5-8 paragraph "
        "report summarizing the analysis.\n\n"
        f"PROFILE:\n{profile[:500]}\n\n"
        f"CLEANING:\n{clean_log[:500]}\n\n"
        f"ANALYSIS:\n{analysis[:1000]}\n\n"
        f"CHARTS:\n{charts[:300]}\n\n"
        "The report must:\n"
        "- Summarize what was found in 2-3 sentences\n"
        "- List 3-5 key findings with numbers\n"
        "- Note data quality issues found during cleaning\n"
        "- Reference the charts by filename\n"
        "- Give 2-3 recommendations for next steps\n"
        "- Be plain English, no code, no markdown\n\n"
        "Output ONLY the report text."
    )


def _insights_verify(exec: ExecutionResult, ctx: dict) -> Verification:
    if exec.exit_code != 0:
        return Verification(ok=False, reason=f"exited {exec.exit_code}: {exec.stderr.strip()[-200:]}")
    if exec.artifacts:
        return Verification(ok=True, reason=f"step complete ({len(exec.artifacts)} artifacts)")
    if exec.stdout.strip():
        return Verification(ok=True, reason="step complete")
    return Verification(ok=False, reason="no output produced")


class Vector6Mode(PipelineModeBase):
    name = "vector6"
    input_schema = {
        "type": "object",
        "properties": {
            "file": {"type": "string", "description": "Raw CSV/JSON data"},
            "question": {"type": "string", "description": "What to analyze (optional)"},
            "palette": {"type": "string", "enum": list(PALETTES.keys()), "default": "aurora"},
        },
        "required": ["file"],
    }

    pipeline_steps = [
        Step(name="profile", system_prompt="You are a data profiler. Output ONLY raw Python code.",
             build_prompt=_profile_prompt, verify=_profile_verify, files=_profile_files, timeout_s=30),
        Step(name="clean", system_prompt="You are a data cleaning agent. Output ONLY raw Python code.",
             build_prompt=_clean_prompt, verify=_clean_verify, files=_clean_files, timeout_s=30),
        Step(name="analyze", system_prompt="You are a data scientist. Output ONLY raw Python code.",
             build_prompt=_analyze_prompt, verify=_analyze_verify, files=_analyze_files, timeout_s=30),
        Step(name="charts", system_prompt="You are a data visualization agent. Output ONLY raw Python code.",
             build_prompt=_charts_prompt, verify=_charts_verify, files=_charts_files, timeout_s=30),
        Step(name="insights", system_prompt="You are a data scientist writing an insights report. Output ONLY the report text.",
             build_prompt=_insights_prompt, verify=_insights_verify, files=lambda t, c: {}, timeout_s=10, text_only=True),
    ]

    def build_plan_prompt(self, task):
        return self.build_overall_plan_prompt(task)

    def build_code_prompt(self, task, plan):
        return ""

    def verify(self, execution):
        return Verification(ok=True, reason="pipeline mode — verified per-step")
