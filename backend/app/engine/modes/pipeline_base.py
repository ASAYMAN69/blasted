"""Base class for multi-step pipeline modes.

A pipeline mode defines a list of Steps. Each step has a name, system prompt,
prompt builder, verifier, and file builder. The orchestrator runs them
sequentially, feeding each step's output into the next step's context.
"""
from __future__ import annotations

from backend.app.engine.modes.base import Step, Verification
from backend.app.engine.orchestrator import Task


class PipelineModeBase:
    """Base class implementing the PipelineMode protocol."""

    name: str = ""
    input_schema: dict = {}
    pipeline_steps: tuple[Step, ...] = ()

    def build_overall_plan_prompt(self, task: Task) -> str:
        step_names = [s.name for s in self.pipeline_steps]
        return (
            f"You are a multi-step agent. This task has {len(step_names)} steps: "
            f"{', '.join(step_names)}. Each step runs in sequence; each step's "
            f"output feeds into the next. Plan the overall approach in 3-5 sentences."
        )

    # Backward-compatible single-step interface (not used for pipelines,
    # but required by the Mode protocol for registry compatibility).
    def build_plan_prompt(self, task: Task) -> str:
        return self.build_overall_plan_prompt(task)

    def build_code_prompt(self, task: Task, plan: str) -> str:
        return ""

    def verify(self, execution):
        return Verification(ok=True, reason="pipeline mode — verified per-step")
