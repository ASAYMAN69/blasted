"""Agentic orchestration: the plan→generate→execute→verify→explain→retry loop.

Owned by the `engine` agent (TASK 01). The data models here are part of the frozen
contract (CONTEXT/CONTRACTS.md §4) — shape them as specified, implement the loop.
"""
from datetime import datetime
from typing import AsyncIterator, Literal

from pydantic import BaseModel

from backend.app.sandbox.manager import ExecutionResult


class Task(BaseModel):
    id: str
    mode: str
    inputs: dict
    created_at: datetime


class RunResult(BaseModel):
    task_id: str
    status: Literal["queued", "running", "passed", "failed"]
    attempts: int
    summary: str
    artifacts: list[str]


class Orchestrator:
    def __init__(self, settings, llm, sandbox, store):
        self._settings = settings
        self._llm = llm
        self._sandbox = sandbox
        self._store = store

    async def submit(self, mode: str, inputs: dict) -> Task:
        raise NotImplementedError("TASK 01")

    async def get(self, task_id: str) -> RunResult | None:
        raise NotImplementedError("TASK 01")

    def run_loop(self, task: Task) -> AsyncIterator[RunResult]:
        raise NotImplementedError("TASK 01")
