"""Vector 3: Document → Extract → Reconcile → Report (Legal/Finance).

Multi-step pipeline: extract → parse → reconcile → report_chart → summarize.
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
    raw = task.inputs.get("documents", "")
    if isinstance(raw, str):
        return raw
    if isinstance(raw, list):
        return "\n\n---DOCUMENT---\n\n".join(str(d) for d in raw)
    return ""


def _preview(text: str, max_chars: int = 3000) -> str:
    text = (text or "").strip()
    if not text:
        return "<empty>"
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + "\n... (truncated)"


# ── Step 1: Extract text ─────────────────────────────────────────────────────
def _extract_prompt(task: Task, ctx: dict) -> str:
    docs = _extract_text(task)
    return (
        "You are a document text extractor. Split the provided documents into individual "
        "documents and extract their text.\n\n"
        f"DOCUMENTS:\n{docs[:3000]}\n\n"
        "Output a JSON object:\n"
        "{\"documents\": [{\"index\": 0, \"text\": \"<the document text>\", \"lines\": N}]}\n\n"
        "Output ONLY the JSON."
    )


def _extract_verify(exec: ExecutionResult, ctx: dict) -> Verification:
    if exec.exit_code != 0:
        return Verification(ok=False, reason=f"exited {exec.exit_code}: {exec.stderr.strip()[-200:]}")
    if exec.artifacts:
        return Verification(ok=True, reason=f"step complete ({len(exec.artifacts)} artifacts)")
    if exec.stdout.strip():
        return Verification(ok=True, reason="step complete")
    return Verification(ok=False, reason="no output produced")


def _extract_files(task: Task, ctx: dict) -> dict:
    return {"documents.txt": _extract_text(task)}


# ── Step 2: Parse invoices ───────────────────────────────────────────────────
def _parse_prompt(task: Task, ctx: dict) -> str:
    extracted = ctx.get("extract", {}).get("stdout", "")
    po_csv = task.inputs.get("purchase_orders", "")
    return (
        "You are an invoice parser. Parse the extracted document text into structured "
        "invoice data.\n\n"
        f"EXTRACTED TEXT:\n{extracted[:3000]}\n\n"
        f"PURCHASE ORDERS CSV:\n{po_csv[:1500]}\n\n"
        "Output a JSON object:\n"
        "{\"invoices\": [{\"vendor\": \"...\", \"invoice_number\": \"...\", "
        "\"date\": \"...\", \"total\": N, \"line_items\": [{\"desc\": \"...\", \"qty\": N, "
        "\"unit_price\": N, \"total\": N}]}]}\n\n"
        "Output ONLY the JSON."
    )


def _parse_verify(exec: ExecutionResult, ctx: dict) -> Verification:
    if exec.exit_code != 0:
        return Verification(ok=False, reason=f"exited {exec.exit_code}: {exec.stderr.strip()[-200:]}")
    if exec.artifacts:
        return Verification(ok=True, reason=f"step complete ({len(exec.artifacts)} artifacts)")
    if exec.stdout.strip():
        return Verification(ok=True, reason="step complete")
    return Verification(ok=False, reason="no output produced")


def _parse_files(task: Task, ctx: dict) -> dict:
    files = {"documents.txt": _extract_text(task)}
    po = task.inputs.get("purchase_orders", "")
    if isinstance(po, str) and po:
        files["purchase_orders.csv"] = po
    return files


# ── Step 3: Reconcile ────────────────────────────────────────────────────────
def _reconcile_prompt(task: Task, ctx: dict) -> str:
    parsed = ctx.get("parse", {}).get("stdout", "")
    po_csv = task.inputs.get("purchase_orders", "")
    return (
        "You are a reconciliation agent. Match parsed invoices to purchase orders "
        "and flag discrepancies.\n\n"
        f"PARSED INVOICES:\n{parsed[:3000]}\n\n"
        f"PURCHASE ORDERS:\n{po_csv[:1500]}\n\n"
        "Output a JSON object:\n"
        "{\"matched\": [{\"invoice\": \"...\", \"po\": \"...\", \"amount\": N}], "
        "\"unmatched\": [{\"invoice\": \"...\", \"reason\": \"...\"}], "
        "\"discrepancies\": [{\"invoice\": \"...\", \"po\": \"...\", \"issue\": \"...\"}], "
        "\"summary\": {\"total_invoiced\": N, \"total_matched\": N, "
        "\"total_disputed\": N, \"match_rate\": 0.0}}\n\n"
        "Output ONLY the JSON."
    )


def _reconcile_verify(exec: ExecutionResult, ctx: dict) -> Verification:
    if exec.exit_code != 0:
        return Verification(ok=False, reason=f"exited {exec.exit_code}: {exec.stderr.strip()[-200:]}")
    if exec.artifacts:
        return Verification(ok=True, reason=f"step complete ({len(exec.artifacts)} artifacts)")
    if exec.stdout.strip():
        return Verification(ok=True, reason="step complete")
    return Verification(ok=False, reason="no output produced")


def _reconcile_files(task: Task, ctx: dict) -> dict:
    po = task.inputs.get("purchase_orders", "")
    if isinstance(po, str) and po:
        return {"purchase_orders.csv": po}
    return {}


# ── Step 4: Report + Chart ───────────────────────────────────────────────────
def _report_prompt(task: Task, ctx: dict) -> str:
    recon = ctx.get("reconcile", {}).get("stdout", "")
    return (
        "You are a finance analyst. Write a concise reconciliation summary based on "
        "the results below.\n\n"
        f"RECONCILIATION:\n{recon[:2000]}\n\n"
        "The summary must:\n"
        "- State total invoices, total amount, match rate\n"
        "- List matched, unmatched, and disputed invoices\n"
        "- Give a recommended action\n"
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
    recon = ctx.get("reconcile", {}).get("stdout", "")
    return (
        "You are a finance analyst. Write a 4-6 sentence summary of the reconciliation.\n\n"
        f"RECONCILIATION:\n{recon[:2000]}\n\n"
        "The summary must:\n"
        "- State total invoices, total amount, match rate\n"
        "- List top discrepancies\n"
        "- Give a recommended action\n"
        "- Be plain English, no code, no markdown\n\n"
        "Output ONLY the summary text."
    )


def _summarize_verify(exec: ExecutionResult, ctx: dict) -> Verification:
    if exec.exit_code != 0:
        return Verification(ok=False, reason=f"exited {exec.exit_code}: {exec.stderr.strip()[-200:]}")
    if exec.artifacts:
        return Verification(ok=True, reason=f"step complete ({len(exec.artifacts)} artifacts)")
    if exec.stdout.strip():
        return Verification(ok=True, reason="step complete")
    return Verification(ok=False, reason="no output produced")


class Vector3Mode(PipelineModeBase):
    name = "vector3"
    input_schema = {
        "type": "object",
        "properties": {
            "documents": {"type": "string", "description": "Invoice documents (text, separated by ---DOCUMENT---)"},
            "purchase_orders": {"type": "string", "description": "Purchase orders CSV"},
            "palette": {"type": "string", "enum": list(PALETTES.keys()), "default": "aurora"},
        },
        "required": ["documents", "purchase_orders"],
    }

    pipeline_steps = [
        Step(name="extract", system_prompt="You are a document text extractor. Output ONLY a JSON object.",
             build_prompt=_extract_prompt, verify=_extract_verify, files=lambda t, c: {}, timeout_s=10, text_only=True),
        Step(name="parse", system_prompt="You are an invoice parser. Output ONLY a JSON object.",
             build_prompt=_parse_prompt, verify=_parse_verify, files=lambda t, c: {}, timeout_s=10, text_only=True),
        Step(name="reconcile", system_prompt="You are a reconciliation agent. Output ONLY a JSON object.",
             build_prompt=_reconcile_prompt, verify=_reconcile_verify, files=lambda t, c: {}, timeout_s=10, text_only=True),
        Step(name="report", system_prompt="You are a finance analyst. Output ONLY the report text.",
             build_prompt=_report_prompt, verify=_report_verify, files=lambda t, c: {}, timeout_s=10, text_only=True),
        Step(name="summarize", system_prompt="You are a finance analyst. Output ONLY the summary text.",
             build_prompt=_summarize_prompt, verify=_summarize_verify, files=lambda t, c: {}, timeout_s=10, text_only=True),
    ]

    def build_plan_prompt(self, task):
        return self.build_overall_plan_prompt(task)

    def build_code_prompt(self, task, plan):
        return ""

    def verify(self, execution):
        return Verification(ok=True, reason="pipeline mode — verified per-step")
