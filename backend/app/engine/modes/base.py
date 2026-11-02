"""The Mode protocol — FROZEN (read-only). Implement it, never edit it."""
from typing import Protocol

from pydantic import BaseModel

from backend.app.engine.orchestrator import ExecutionResult, Task


class Verification(BaseModel):
    ok: bool
    reason: str


class Mode(Protocol):
    name: str
    input_schema: dict

    def build_plan_prompt(self, task: Task) -> str: ...
    def build_code_prompt(self, task: Task, plan: str) -> str: ...
    def verify(self, execution: ExecutionResult) -> Verification: ...
