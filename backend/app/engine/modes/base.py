"""The Mode protocol — FROZEN (read-only). Implement it, never edit it.

Supports both single-step modes (build_plan_prompt/build_code_prompt/verify)
and multi-step pipeline modes (pipeline_steps list of Step objects).
"""
from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any, Protocol

from backend.app.engine.orchestrator import ExecutionResult, Task
from pydantic import BaseModel


class Verification(BaseModel):
    ok: bool
    reason: str


@dataclass
class Step:
    """One step in a multi-step pipeline.

    Each step is a self-contained unit: it has a name, a system prompt,
    a prompt builder (that takes the task + accumulated context), a verifier,
    and a file builder (that determines which files go into the sandbox).
    Set text_only=True for steps that only generate text (no sandbox execution).
    """
    name: str
    system_prompt: str
    build_prompt: Callable[[Task, dict[str, Any]], str]
    verify: Callable[[ExecutionResult, dict[str, Any]], Verification]
    files: Callable[[Task, dict[str, Any]], dict[str, str]] = field(default_factory=lambda: lambda t, c: {})
    timeout_s: int = 60
    max_retries: int = 3
    text_only: bool = False
    max_tokens: int = 2048


class Mode(Protocol):
    """Single-step mode protocol (existing)."""
    name: str
    input_schema: dict

    def build_plan_prompt(self, task: Task) -> str: ...
    def build_code_prompt(self, task: Task, plan: str) -> str: ...
    def verify(self, execution: ExecutionResult) -> Verification: ...


class PipelineMode(Protocol):
    """Multi-step pipeline mode protocol (new)."""
    name: str
    input_schema: dict
    pipeline_steps: list[Step]

    def build_overall_plan_prompt(self, task: Task) -> str: ...
