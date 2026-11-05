"""Vector 5: Data → Anomaly → Root Cause → Fix → Verify (DevOps).

Multi-step pipeline: profile → detect_anomalies → correlate → hypothesize → verify_fix → report.
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


def _extract_text(task: Task, key: str) -> str:
    raw = task.inputs.get(key, "")
    return raw if isinstance(raw, str) else ""


def _preview(text: str, max_chars: int = 2000) -> str:
    text = (text or "").strip()
    if not text:
        return "<empty>"
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + "\n... (truncated)"


# ── Step 1: Profile metrics ──────────────────────────────────────────────────
def _profile_prompt(task: Task, ctx: dict) -> str:
    metrics = _extract_text(task, "metrics")
    events = _extract_text(task, "events")
    return (
        "You are a DevOps metrics profiler. Write a Python script that reads the "
        "metrics CSV and reports basic statistics.\n\n"
        f"METRICS CSV:\n{_preview(metrics)}\n\n"
        f"EVENTS CSV (deploys, config changes):\n{_preview(events, 1000)}\n\n"
        "The script must:\n"
        "1. Read /workspace/metrics.csv with pandas\n"
        "2. Report: shape, columns, dtypes, time range (min/max timestamp), "
        "null counts, basic stats (mean/std/min/max) per numeric column\n"
        "3. Identify the metric with highest variance (most likely to have anomalies)\n"
        "4. Print: PROFILE_JSON: {\"shape\": [rows, cols], \"columns\": [...], "
        "\"time_range\": [\"start\", \"end\"], \"stats\": {...}, \"highest_variance_metric\": \"...\"}\n"
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
    files = {"metrics.csv": _extract_text(task, "metrics")}
    ev = _extract_text(task, "events")
    if ev:
        files["events.csv"] = ev
    return files


# ── Step 2: Detect anomalies ─────────────────────────────────────────────────
def _anomaly_prompt(task: Task, ctx: dict) -> str:
    profile = ctx.get("profile", {}).get("stdout", "")
    return (
        "You are an anomaly detection agent. Write a Python script that reads "
        "/workspace/metrics.csv and detects anomalies using statistical methods.\n\n"
        f"PROFILE:\n{profile[:1000]}\n\n"
        "The script must:\n"
        "1. Read /workspace/metrics.csv with pandas\n"
        "2. For each numeric metric, compute z-scores and flag values > 2.5 sigma\n"
        "3. Also compute rolling mean +/- 2 std over a 5-point window\n"
        "4. Identify: which metric, when (timestamp), value, expected, severity (z-score)\n"
        "5. Print: ANOMALY_JSON: {\"anomalies\": [{\"metric\": \"...\", \"timestamp\": \"...\", "
        "\"value\": N, \"expected\": N, \"severity\": N, \"direction\": \"spike|drop\"}]}\n"
        "6. Print debug to stderr only\n"
        "7. No network, no file writes outside /workspace\n\n"
        "Output ONLY raw Python code."
    )


def _anomaly_verify(exec: ExecutionResult, ctx: dict) -> Verification:
    if exec.exit_code != 0:
        return Verification(ok=False, reason=f"exited {exec.exit_code}: {exec.stderr.strip()[-200:]}")
    if exec.artifacts:
        return Verification(ok=True, reason=f"step complete ({len(exec.artifacts)} artifacts)")
    if exec.stdout.strip():
        return Verification(ok=True, reason="step complete")
    return Verification(ok=False, reason="no output produced")


def _anomaly_files(task: Task, ctx: dict) -> dict:
    return {}


# ── Step 3: Correlate with events ────────────────────────────────────────────
def _correlate_prompt(task: Task, ctx: dict) -> str:
    anomalies = ctx.get("detect_anomalies", {}).get("stdout", "")
    events = _extract_text(task, "events")
    return (
        "You are a correlation agent. Write a Python script that matches each anomaly "
        "to nearby events (deploys, config changes).\n\n"
        f"ANOMALIES:\n{anomalies[:2000]}\n\n"
        f"EVENTS:\n{events[:1500]}\n\n"
        "The script must:\n"
        "1. For each anomaly, find events within +/- 30 minutes\n"
        "2. Compute correlation strength (time proximity + metric-event relationship)\n"
        "3. Print: CORRELATION_JSON: {\"correlations\": [{\"anomaly\": {...}, "
        "\"correlated_events\": [{\"event\": \"...\", \"time\": \"...\", \"score\": 0.0}], "
        "\"top_hypothesis\": \"...\"}]}\n"
        "4. Print debug to stderr only\n"
        "5. No network, no file writes outside /workspace\n\n"
        "Output ONLY raw Python code."
    )


def _correlate_verify(exec: ExecutionResult, ctx: dict) -> Verification:
    if exec.exit_code != 0:
        return Verification(ok=False, reason=f"exited {exec.exit_code}: {exec.stderr.strip()[-200:]}")
    if exec.artifacts:
        return Verification(ok=True, reason=f"step complete ({len(exec.artifacts)} artifacts)")
    if exec.stdout.strip():
        return Verification(ok=True, reason="step complete")
    return Verification(ok=False, reason="no output produced")


def _correlate_files(task: Task, ctx: dict) -> dict:
    return {}


# ── Step 4: Hypothesize root cause ───────────────────────────────────────────
def _hypothesize_prompt(task: Task, ctx: dict) -> str:
    correlations = ctx.get("correlate", {}).get("stdout", "")
    return (
        "You are a root-cause analyst. Based on the anomaly-event correlations below, "
        "form a hypothesis about what caused the incident.\n\n"
        f"CORRELATIONS:\n{correlations[:3000]}\n\n"
        "Write a JSON object (no code) with:\n"
        "{\"hypothesis\": \"...\", \"confidence\": 0.0-1.0, \"evidence\": [\"...\"], "
        "\"recommended_action\": \"...\", \"prevention\": \"...\"}\n\n"
        "Output ONLY the JSON."
    )


def _hypothesize_verify(exec: ExecutionResult, ctx: dict) -> Verification:
    if exec.exit_code != 0:
        return Verification(ok=False, reason=f"exited {exec.exit_code}: {exec.stderr.strip()[-200:]}")
    if exec.artifacts:
        return Verification(ok=True, reason=f"step complete ({len(exec.artifacts)} artifacts)")
    if exec.stdout.strip():
        return Verification(ok=True, reason="step complete")
    return Verification(ok=False, reason="no output produced")


def _hypothesize_files(task: Task, ctx: dict) -> dict:
    return {}


# ── Step 5: Verify the fix (what-if) ────────────────────────────────────────
def _verify_fix_prompt(task: Task, ctx: dict) -> str:
    hypothesis = ctx.get("hypothesize", {}).get("stdout", "")
    profile = ctx.get("profile", {}).get("stdout", "")
    palette = task.inputs.get("palette", "aurora")
    hexes = PALETTES.get(palette, PALETTES["aurora"])
    palette_line = ", ".join(hexes)
    return (
        "You are a fix verification agent. Write a Python script that simulates the "
        "proposed fix and projects what the error rate would look like.\n\n"
        f"HYPOTHESIS:\n{hypothesis[:1000]}\n\n"
        f"PROFILE:\n{profile[:800]}\n\n"
        f"COLOR PALETTE: {palette_line}\n\n"
        "The script must:\n"
        "1. Read /workspace/metrics.csv\n"
        "2. Simulate the fix (e.g., revert the config change, optimize the query)\n"
        "3. Compute projected error rate after the fix\n"
        "4. Create a chart: actual (with anomaly) vs projected (after fix)\n"
        "5. Save chart to /workspace/chart.png\n"
        "6. Print: VERIFY_JSON: {\"projected_error_rate\": N, \"expected_recovery_time\": \"...\", "
        "\"improvement\": \"...\"}\n"
        "7. Use the COLOR PALETTE for chart colors\n"
        "8. Print debug to stderr only\n"
        "9. No network, no file writes outside /workspace\n\n"
        "Output ONLY raw Python code."
    )


def _verify_fix_verify(exec: ExecutionResult, ctx: dict) -> Verification:
    if exec.exit_code != 0:
        return Verification(ok=False, reason=f"exited {exec.exit_code}: {exec.stderr.strip()[-200:]}")
    if exec.artifacts:
        return Verification(ok=True, reason=f"step complete ({len(exec.artifacts)} artifacts)")
    if exec.stdout.strip():
        return Verification(ok=True, reason="step complete")
    return Verification(ok=False, reason="no output produced")


def _verify_fix_files(task: Task, ctx: dict) -> dict:
    return {}


# ── Step 6: Incident report ──────────────────────────────────────────────────
def _report_prompt(task: Task, ctx: dict) -> str:
    profile = ctx.get("profile", {}).get("stdout", "")
    anomalies = ctx.get("detect_anomalies", {}).get("stdout", "")
    correlations = ctx.get("correlate", {}).get("stdout", "")
    hypothesis = ctx.get("hypothesize", {}).get("stdout", "")
    verify = ctx.get("verify_fix", {}).get("stdout", "")
    return (
        "You are an SRE writing an incident report. Write a 6-8 paragraph report.\n\n"
        f"PROFILE:\n{profile[:500]}\n\n"
        f"ANOMALIES:\n{anomalies[:800]}\n\n"
        f"CORRELATIONS:\n{correlations[:800]}\n\n"
        f"HYPOTHESIS:\n{hypothesis[:800]}\n\n"
        f"FIX VERIFICATION:\n{verify[:500]}\n\n"
        "The report must:\n"
        "- Summary: what happened, when, how severe\n"
        "- Root cause: what caused it, with evidence\n"
        "- Impact: how many users affected, duration\n"
        "- Fix: what was done / what should be done\n"
        "- Prevention: how to prevent recurrence\n"
        "- Timeline: minute-by-minute of the incident\n"
        "- Be plain English, no code, no markdown\n\n"
        "Output ONLY the report text."
    )


def _report_verify(exec: ExecutionResult, ctx: dict) -> Verification:
    if exec.exit_code != 0:
        return Verification(ok=False, reason=f"exited {exec.exit_code}: {exec.stderr.strip()[-200:]}")
    if exec.artifacts:
        return Verification(ok=True, reason=f"step complete ({len(exec.artifacts)} artifacts)")
    if exec.stdout.strip():
        return Verification(ok=True, reason="step complete")
    return Verification(ok=False, reason="no output produced")


class Vector5Mode(PipelineModeBase):
    name = "vector5"
    input_schema = {
        "type": "object",
        "properties": {
            "metrics": {"type": "string", "description": "Time-series metrics CSV (timestamp, error_rate, latency, cpu, memory, etc.)"},
            "events": {"type": "string", "description": "Events CSV (timestamp, event_type, description) — deploys, config changes"},
            "palette": {"type": "string", "enum": list(PALETTES.keys()), "default": "aurora"},
        },
        "required": ["metrics"],
    }

    pipeline_steps = [
        Step(name="profile", system_prompt="You are a DevOps metrics profiler. Output ONLY raw Python code.",
             build_prompt=_profile_prompt, verify=_profile_verify, files=_profile_files, timeout_s=30),
        Step(name="detect_anomalies", system_prompt="You are an anomaly detection agent. Output ONLY raw Python code.",
             build_prompt=_anomaly_prompt, verify=_anomaly_verify, files=_anomaly_files, timeout_s=30),
        Step(name="correlate", system_prompt="You are a correlation agent. Output ONLY raw Python code.",
             build_prompt=_correlate_prompt, verify=_correlate_verify, files=_correlate_files, timeout_s=30),
        Step(name="hypothesize", system_prompt="You are a root-cause analyst. Output ONLY a JSON object.",
             build_prompt=_hypothesize_prompt, verify=_hypothesize_verify, files=_hypothesize_files, timeout_s=10, text_only=True),
        Step(name="verify_fix", system_prompt="You are a fix verification agent. Output ONLY raw Python code.",
             build_prompt=_verify_fix_prompt, verify=_verify_fix_verify, files=_verify_fix_files, timeout_s=30),
        Step(name="report", system_prompt="You are an SRE writing an incident report. Output ONLY the report text.",
             build_prompt=_report_prompt, verify=_report_verify, files=lambda t, c: {}, timeout_s=10, text_only=True),
    ]

    def build_plan_prompt(self, task):
        return self.build_overall_plan_prompt(task)

    def build_code_prompt(self, task, plan):
        return ""

    def verify(self, execution):
        return Verification(ok=True, reason="pipeline mode — verified per-step")
