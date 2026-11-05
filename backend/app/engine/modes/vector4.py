"""Vector 4: Research → Cross-Reference → Cite → Report (Knowledge Work).

Multi-step pipeline: fetch → extract_claims → cross_reference → report_chart → summarize.
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
    raw = task.inputs.get("sources", "")
    if isinstance(raw, str):
        return raw
    if isinstance(raw, list):
        return "\n\n---SOURCE---\n\n".join(str(s) for s in raw)
    return ""


def _preview(text: str, max_chars: int = 3000) -> str:
    text = (text or "").strip()
    if not text:
        return "<empty>"
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + "\n... (truncated)"


# ── Step 1: Fetch sources ────────────────────────────────────────────────────
def _fetch_prompt(task: Task, ctx: dict) -> str:
    sources = _extract_text(task)
    return (
        "You are a text processor. Split the following source texts into individual documents.\n\n"
        f"SOURCES:\n{sources[:3000]}\n\n"
        "Output a JSON object:\n"
        "{\"sources\": [{\"index\": 0, \"text\": \"<the document text>\", \"chars\": N}]}\n\n"
        "Output ONLY the JSON."
    )


def _fetch_verify(exec: ExecutionResult, ctx: dict) -> Verification:
    if exec.exit_code != 0:
        return Verification(ok=False, reason=f"exited {exec.exit_code}: {exec.stderr.strip()[-200:]}")
    if exec.artifacts:
        return Verification(ok=True, reason=f"step complete ({len(exec.artifacts)} artifacts)")
    if exec.stdout.strip():
        return Verification(ok=True, reason="step complete")
    return Verification(ok=False, reason="no output produced")


def _fetch_files(task: Task, ctx: dict) -> dict:
    return {"sources.txt": _extract_text(task)}


# ── Step 2: Extract claims ───────────────────────────────────────────────────
def _claims_prompt(task: Task, ctx: dict) -> str:
    fetched = ctx.get("fetch", {}).get("stdout", "")
    return (
        "You are a claim extractor. Extract key claims from each source below.\n\n"
        f"SOURCES:\n{fetched[:4000]}\n\n"
        "For each source, extract: statistics (numbers with units), dates, named "
        "entities, direct quotes, and key factual statements.\n\n"
        "Output a JSON object:\n"
        "{\"sources\": [{\"index\": 0, \"claims\": "
        "[{\"text\": \"...\", \"type\": \"stat|date|entity|quote|fact\", \"value\": \"...\"}]}]}\n\n"
        "Output ONLY the JSON."
    )


def _claims_verify(exec: ExecutionResult, ctx: dict) -> Verification:
    if exec.exit_code != 0:
        return Verification(ok=False, reason=f"exited {exec.exit_code}: {exec.stderr.strip()[-200:]}")
    if exec.artifacts:
        return Verification(ok=True, reason=f"step complete ({len(exec.artifacts)} artifacts)")
    if exec.stdout.strip():
        return Verification(ok=True, reason="step complete")
    return Verification(ok=False, reason="no output produced")


def _claims_files(task: Task, ctx: dict) -> dict:
    return {}


# ── Step 3: Cross-reference ──────────────────────────────────────────────────
def _crossref_prompt(task: Task, ctx: dict) -> str:
    claims = ctx.get("extract_claims", {}).get("stdout", "")
    return (
        "You are a cross-reference agent. Compare claims across sources and identify "
        "agreements and contradictions.\n\n"
        f"CLAIMS:\n{claims[:4000]}\n\n"
        "Output a JSON object:\n"
        "{\"agreements\": [{\"claim\": \"...\", \"sources\": [...], "
        "\"confidence\": 0.0}], \"contradictions\": [{\"claim_a\": \"...\", \"claim_b\": \"...\", "
        "\"source_a\": \"...\", \"source_b\": \"...\", \"explanation\": \"...\"}], "
        "\"unique\": [{\"claim\": \"...\", \"source\": \"...\"}], "
        "\"summary\": {\"total_claims\": N, \"agreements\": N, \"contradictions\": N, \"unique\": N}}\n\n"
        "Output ONLY the JSON."
    )


def _crossref_verify(exec: ExecutionResult, ctx: dict) -> Verification:
    if exec.exit_code != 0:
        return Verification(ok=False, reason=f"exited {exec.exit_code}: {exec.stderr.strip()[-200:]}")
    if exec.artifacts:
        return Verification(ok=True, reason=f"step complete ({len(exec.artifacts)} artifacts)")
    if exec.stdout.strip():
        return Verification(ok=True, reason="step complete")
    return Verification(ok=False, reason="no output produced")


def _crossref_files(task: Task, ctx: dict) -> dict:
    return {}


# ── Step 4: Report + Chart ───────────────────────────────────────────────────
def _report_prompt(task: Task, ctx: dict) -> str:
    crossref = ctx.get("cross_reference", {}).get("stdout", "")
    return (
        "You are a research analyst. Write a concise research summary based on the "
        "cross-reference results below.\n\n"
        f"CROSS-REFERENCE:\n{crossref[:3000]}\n\n"
        "The summary must:\n"
        "- Summarize the key findings in 3-5 sentences\n"
        "- List agreements, contradictions, and unique claims\n"
        "- Give a confidence score (high/medium/low)\n"
        "- Be plain English, no code, no markdown\n\n"
        "Output ONLY the summary text."
    )


def _report_verify(exec: ExecutionResult, ctx: dict) -> Verification:
    if exec.exit_code != 0:
        return Verification(ok=False, reason=f"exited {exec.exit_code}: {exec.stderr.strip()[-200:]}")
    if exec.artifacts:
        return Verification(ok=True, reason=f"step complete ({len(exec.artifacts)} artifacts)")
    if exec.stdout.strip():
        return Verification(ok=True, reason="step complete")
    return Verification(ok=False, reason="no output produced")


def _report_files(task: Task, ctx: dict) -> dict:
    return {}


# ── Step 5: Summarize ────────────────────────────────────────────────────────
def _summarize_prompt(task: Task, ctx: dict) -> str:
    crossref = ctx.get("cross_reference", {}).get("stdout", "")
    task_text = task.inputs.get("topic", task.inputs.get("question", "the topic"))
    return (
        f"You are a research analyst. Write a 5-8 paragraph research report about: {task_text}\n\n"
        f"CROSS-REFERENCE RESULTS:\n{crossref[:3000]}\n\n"
        "The report must:\n"
        "- Summarize the topic in 2-3 sentences\n"
        "- List 3-5 key findings with source citations [1], [2], etc.\n"
        "- Highlight contradictions and how to resolve them\n"
        "- Give a confidence score (high/medium/low) based on source agreement\n"
        "- List the sources with URLs\n"
        "- Be plain English, no code, no markdown\n\n"
        "Output ONLY the report text."
    )


def _summarize_verify(exec: ExecutionResult, ctx: dict) -> Verification:
    if exec.exit_code != 0:
        return Verification(ok=False, reason=f"exited {exec.exit_code}: {exec.stderr.strip()[-200:]}")
    if exec.artifacts:
        return Verification(ok=True, reason=f"step complete ({len(exec.artifacts)} artifacts)")
    if exec.stdout.strip():
        return Verification(ok=True, reason="step complete")
    return Verification(ok=False, reason="no output produced")


class Vector4Mode(PipelineModeBase):
    name = "research-synthesizer"
    input_schema = {
        "type": "object",
        "properties": {
            "sources": {"type": "string", "description": "Source texts separated by ---SOURCE--- (paste content of 3-5 articles/documents)"},
            "topic": {"type": "string", "description": "What to research"},
            "palette": {"type": "string", "enum": list(PALETTES.keys()), "default": "aurora"},
        },
        "required": ["sources"],
    }

    pipeline_steps = [
        Step(name="fetch", system_prompt="You are a text processor. Output ONLY a JSON object.",
             build_prompt=_fetch_prompt, verify=_fetch_verify, files=_fetch_files, timeout_s=10, text_only=True),
        Step(name="extract_claims", system_prompt="You are a claim extractor. Output ONLY a JSON object.",
             build_prompt=_claims_prompt, verify=_claims_verify, files=lambda t, c: {}, timeout_s=10, text_only=True),
        Step(name="cross_reference", system_prompt="You are a cross-reference agent. Output ONLY a JSON object.",
             build_prompt=_crossref_prompt, verify=_crossref_verify, files=lambda t, c: {}, timeout_s=10, text_only=True),
        Step(name="report", system_prompt="You are a research analyst. Output ONLY the report text.",
             build_prompt=_report_prompt, verify=_report_verify, files=lambda t, c: {}, timeout_s=10, text_only=True),
        Step(name="summarize", system_prompt="You are a research analyst. Output ONLY the report text.",
             build_prompt=_summarize_prompt, verify=_summarize_verify, files=lambda t, c: {}, timeout_s=10, text_only=True),
    ]

    def build_plan_prompt(self, task):
        return self.build_overall_plan_prompt(task)

    def build_code_prompt(self, task, plan):
        return ""

    def verify(self, execution):
        return Verification(ok=True, reason="pipeline mode — verified per-step")
