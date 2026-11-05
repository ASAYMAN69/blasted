"""Vector 4: Research → Cross-Reference → Cite → Report (Knowledge Work).

Multi-step pipeline: fetch → extract_claims → cross_reference → report_chart → summarize.
"""
from __future__ import annotations

import json
import re

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
        "You are a web researcher. Write a Python script that fetches the provided "
        "URLs and extracts their main text content.\n\n"
        f"SOURCES:\n{sources[:2000]}\n\n"
        "The script must:\n"
        "1. Parse the sources (one URL per line, or text blocks separated by ---SOURCE---)\n"
        "2. For each URL, use requests + BeautifulSoup to fetch and extract main text\n"
        "3. Strip HTML tags, navigation, ads, and boilerplate\n"
        "4. Print: FETCHED_JSON: {\"sources\": [{\"url\": \"...\", \"text\": \"...\", \"chars\": N}]}\n"
        "5. Print debug to stderr only\n"
        "6. No file writes outside /workspace\n\n"
        "Output ONLY raw Python code."
    )


def _fetch_verify(exec: ExecutionResult, ctx: dict) -> Verification:
    if exec.exit_code != 0:
        return Verification(ok=False, reason=f"fetch exited {exec.exit_code}: {exec.stderr.strip()[-300:]}")
    m = re.search(r"FETCHED_JSON:\s*(\{.*\})", exec.stdout, re.DOTALL)
    if m:
        try:
            data = json.loads(m.group(1))
            if "sources" not in data or len(data["sources"]) < 1:
                return Verification(ok=False, reason="no sources fetched")
            for s in data["sources"]:
                if len(s.get("text", "")) < 50:
                    return Verification(ok=False, reason=f"source {s.get('url')} has too little text")
            return Verification(ok=True, reason=f"fetched {len(data['sources'])} sources")
        except json.JSONDecodeError:
            return Verification(ok=False, reason="fetch JSON parse error")
    return Verification(ok=False, reason="no FETCHED_JSON marker")


def _fetch_files(task: Task, ctx: dict) -> dict:
    return {}


# ── Step 2: Extract claims ───────────────────────────────────────────────────
def _claims_prompt(task: Task, ctx: dict) -> str:
    fetched = ctx.get("fetch", {}).get("stdout", "")
    return (
        "You are a claim extractor. Write a Python script that reads the fetched "
        "source text and extracts key claims from each source.\n\n"
        f"FETCHED SOURCES:\n{fetched[:4000]}\n\n"
        "The script must:\n"
        "1. For each source, split text into sentences\n"
        "2. Extract: statistics (numbers with units), dates, named entities, "
        "direct quotes, and key factual statements\n"
        "3. Print: CLAIMS_JSON: {\"sources\": [{\"url\": \"...\", \"claims\": "
        "[{\"text\": \"...\", \"type\": \"stat|date|entity|quote|fact\", \"value\": \"...\"}]}]}\n"
        "4. Print debug to stderr only\n"
        "5. No network, no file writes outside /workspace\n\n"
        "Output ONLY raw Python code."
    )


def _claims_verify(exec: ExecutionResult, ctx: dict) -> Verification:
    if exec.exit_code != 0:
        return Verification(ok=False, reason=f"claims exited {exec.exit_code}: {exec.stderr.strip()[-300:]}")
    m = re.search(r"CLAIMS_JSON:\s*(\{.*\})", exec.stdout, re.DOTALL)
    if m:
        try:
            data = json.loads(m.group(1))
            if "sources" not in data:
                return Verification(ok=False, reason="no sources in claims")
            total_claims = sum(len(s.get("claims", [])) for s in data["sources"])
            if total_claims < 3:
                return Verification(ok=False, reason=f"only {total_claims} claims extracted (need >=3)")
            return Verification(ok=True, reason=f"extracted {total_claims} claims from {len(data['sources'])} sources")
        except json.JSONDecodeError:
            return Verification(ok=False, reason="claims JSON parse error")
    return Verification(ok=False, reason="no CLAIMS_JSON marker")


def _claims_files(task: Task, ctx: dict) -> dict:
    return {}


# ── Step 3: Cross-reference ──────────────────────────────────────────────────
def _crossref_prompt(task: Task, ctx: dict) -> str:
    claims = ctx.get("extract_claims", {}).get("stdout", "")
    return (
        "You are a cross-reference agent. Write a Python script that compares "
        "claims across sources and identifies agreements and contradictions.\n\n"
        f"CLAIMS:\n{claims[:4000]}\n\n"
        "The script must:\n"
        "1. Compare claims across sources using string similarity and number matching\n"
        "2. Identify: agreements (2+ sources say the same thing), contradictions "
        "(sources disagree on a fact), unique claims (only one source mentions it)\n"
        "3. Print: CROSSREF_JSON: {\"agreements\": [{\"claim\": \"...\", \"sources\": [...], "
        "\"confidence\": 0.0}], \"contradictions\": [{\"claim_a\": \"...\", \"claim_b\": \"...\", "
        "\"source_a\": \"...\", \"source_b\": \"...\", \"explanation\": \"...\"}], "
        "\"unique\": [{\"claim\": \"...\", \"source\": \"...\"}], \"summary\": {\"total_claims\": N, "
        "\"agreements\": N, \"contradictions\": N, \"unique\": N}}\n"
        "4. Print debug to stderr only\n"
        "5. No network, no file writes outside /workspace\n\n"
        "Output ONLY raw Python code."
    )


def _crossref_verify(exec: ExecutionResult, ctx: dict) -> Verification:
    if exec.exit_code != 0:
        return Verification(ok=False, reason=f"crossref exited {exec.exit_code}: {exec.stderr.strip()[-300:]}")
    m = re.search(r"CROSSREF_JSON:\s*(\{.*\})", exec.stdout, re.DOTALL)
    if m:
        try:
            data = json.loads(m.group(1))
            if not all(k in data for k in ("agreements", "contradictions", "unique")):
                return Verification(ok=False, reason="crossref JSON missing required fields")
            return Verification(ok=True, reason=f"cross-referenced: {len(data['agreements'])} agreements, {len(data['contradictions'])} contradictions")
        except json.JSONDecodeError:
            return Verification(ok=False, reason="crossref JSON parse error")
    return Verification(ok=False, reason="no CROSSREF_JSON marker")


def _crossref_files(task: Task, ctx: dict) -> dict:
    return {}


# ── Step 4: Report + Chart ───────────────────────────────────────────────────
def _report_prompt(task: Task, ctx: dict) -> str:
    crossref = ctx.get("cross_reference", {}).get("stdout", "")
    palette = task.inputs.get("palette", "aurora")
    hexes = PALETTES.get(palette, PALETTES["aurora"])
    palette_line = ", ".join(hexes)
    return (
        "You are a research analyst. Write a Python script that reads the cross-reference "
        "results and creates a summary chart + structured report.\n\n"
        f"CROSS-REFERENCE:\n{crossref[:3000]}\n\n"
        f"COLOR PALETTE: {palette_line}\n\n"
        "The script must:\n"
        "1. Parse the CROSSREF_JSON from the cross-reference output\n"
        "2. Create a bar chart: number of claims by category (agreement/contradiction/unique)\n"
        "3. Save chart to /workspace/chart.png\n"
        "4. Write a structured report to /workspace/report.json with sections: "
        "summary, agreements, contradictions, unique_claims, confidence_score\n"
        "5. Use the COLOR PALETTE for chart colors\n"
        "6. Print debug to stderr only\n"
        "7. No network, no file writes outside /workspace\n\n"
        "Output ONLY raw Python code."
    )


def _report_verify(exec: ExecutionResult, ctx: dict) -> Verification:
    if exec.exit_code != 0:
        return Verification(ok=False, reason=f"report exited {exec.exit_code}: {exec.stderr.strip()[-300:]}")
    if "chart.png" not in exec.artifacts and "report.json" not in exec.artifacts:
        return Verification(ok=False, reason="no chart or report artifact produced")
    return Verification(ok=True, reason="report + chart generated")


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
    return Verification(ok=True, reason="summary generated")


class Vector4Mode(PipelineModeBase):
    name = "vector4"
    input_schema = {
        "type": "object",
        "properties": {
            "sources": {"type": "string", "description": "URLs (one per line) or text blocks separated by ---SOURCE---"},
            "topic": {"type": "string", "description": "What to research"},
            "palette": {"type": "string", "enum": list(PALETTES.keys()), "default": "aurora"},
        },
        "required": ["sources"],
    }

    pipeline_steps = [
        Step(name="fetch", system_prompt="You are a web researcher. Output ONLY raw Python code.",
             build_prompt=_fetch_prompt, verify=_fetch_verify, files=_fetch_files, timeout_s=30),
        Step(name="extract_claims", system_prompt="You are a claim extractor. Output ONLY raw Python code.",
             build_prompt=_claims_prompt, verify=_claims_verify, files=_claims_files, timeout_s=30),
        Step(name="cross_reference", system_prompt="You are a cross-reference agent. Output ONLY raw Python code.",
             build_prompt=_crossref_prompt, verify=_crossref_verify, files=_crossref_files, timeout_s=30),
        Step(name="report", system_prompt="You are a research analyst. Output ONLY raw Python code.",
             build_prompt=_report_prompt, verify=_report_verify, files=_report_files, timeout_s=30),
        Step(name="summarize", system_prompt="You are a research analyst. Output ONLY the report text.",
             build_prompt=_summarize_prompt, verify=_summarize_verify, files=lambda t, c: {}, timeout_s=10),
    ]

    def build_plan_prompt(self, task):
        return self.build_overall_plan_prompt(task)

    def build_code_prompt(self, task, plan):
        return ""

    def verify(self, execution):
        return Verification(ok=True, reason="pipeline mode — verified per-step")
