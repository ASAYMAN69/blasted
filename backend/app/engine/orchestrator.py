"""Agentic orchestration: the plan→generate→execute→verify→explain→retry loop.

Owned by the `engine` agent (TASK 01). The data models here are part of the frozen
contract (CONTEXT/CONTRACTS.md §4) — shape them as specified, implement the loop.
"""
from __future__ import annotations

import ast
import json
import uuid
from collections.abc import AsyncIterator
from datetime import datetime
from pathlib import Path
from typing import Any, Literal

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
    parsed: dict | None = None  # structured answer extracted from sandbox stdout


def _coerce_dict(payload: str) -> dict | None:
    """Parse a verdict payload as JSON, falling back to a Python literal.

    Models sometimes emit single-quoted Python dicts
    (e.g. `{'changed': True, 'run_ok': True}`) instead of strict JSON —
    tolerate both.
    """
    if not payload:
        return None
    try:
        value = json.loads(payload)
    except json.JSONDecodeError:
        value = None
    if isinstance(value, dict):
        return value
    try:
        value = ast.literal_eval(payload)
    except (ValueError, SyntaxError):
        return None
    return value if isinstance(value, dict) else None


def extract_parsed(stdout: str) -> dict | None:
    """Pull the machine-verifiable JSON block out of sandbox stdout.

    Mirrors the modes' RESULT_JSON / verdict marker contracts: look for a line
    that begins with a known marker and parse the trailing object (JSON or a
    Python dict literal); fall back to the first balanced JSON object anywhere
    in stdout.
    """
    text = (stdout or "").strip()
    if not text:
        return None

    for marker in ("RESULT_JSON:", "CODER_RESULT:", "FIX_RESULT:", "RESULT:"):
        idx = text.rfind(marker)
        if idx != -1:
            payload = text[idx + len(marker):].strip()
            value = _coerce_dict(payload)
            if value is not None:
                return value

    # last-resort: first balanced { ... } block
    start = text.find("{")
    if start != -1:
        depth = 0
        in_string = False
        escaped = False
        for i in range(start, min(len(text), start + 200_000)):
            c = text[i]
            if in_string:
                if escaped:
                    escaped = False
                elif c == "\\":
                    escaped = True
                elif c == '"':
                    in_string = False
                continue
            if c == '"':
                in_string = True
            elif c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    try:
                        value = json.loads(text[start:i + 1])
                    except json.JSONDecodeError:
                        value = ast.literal_eval(text[start:i + 1])
                    return value if isinstance(value, dict) else None
    return None


def _load_mode_registry() -> dict[str, type]:
    try:
        from backend.app.engine.modes import MODE_REGISTRY

        return MODE_REGISTRY
    except Exception:
        return {}


class Orchestrator:
    """State machine driving the agentic loop for a single task."""

    def __init__(self, settings: Any, llm: Any, sandbox: Any, store: Any = None) -> None:
        self._settings = settings
        self._llm = llm
        self._sandbox = sandbox
        self._store = store
        self._tasks: dict[str, Task] = {}
        self._results: dict[str, RunResult] = {}
        if isinstance(store, (str, Path)):
            self._db_path: Path | None = Path(store)
        elif store is None:
            self._db_path = Path("data/sandboxed.db")
        else:
            self._db_path = None

    # ------------------------------------------------------------------ helpers
    def _max_retries(self) -> int:
        try:
            return int(getattr(self._settings, "max_retries", 3))
        except (TypeError, ValueError):
            return 3

    def _ensure_task_persisted(self, task: Task) -> None:
        try:
            if self._db_path is not None:
                from backend.app.store import db as store_db

                store_db.init_store(self._db_path)
                store_db.create_task(self._db_path, task.id, task.mode, task.inputs)
            elif self._store is not None and hasattr(self._store, "create_task"):
                self._store.create_task(task.id, task.mode, task.inputs)
        except Exception:
            pass

    def _update_task_persisted(self, task_id: str, status: str, summary: str) -> None:
        try:
            if self._db_path is not None:
                from backend.app.store import db as store_db

                store_db.update_task_status(self._db_path, task_id, status, summary)
            elif self._store is not None and hasattr(self._store, "update_task_status"):
                self._store.update_task_status(task_id, status, summary)
        except Exception:
            pass

    def _sanitize_code(self, raw: str) -> str:
        text = (raw or "").strip()
        if "```" in text:
            lines = text.splitlines()
            # find first fenced block
            start = None
            for i, line in enumerate(lines):
                if line.strip().startswith("```"):
                    start = i + 1
                    break
            if start is not None:
                end = len(lines)
                for j in range(start, len(lines)):
                    if lines[j].strip().startswith("```"):
                        end = j
                        break
                text = "\n".join(lines[start:end]).strip()
        return text

    def _build_files(self, task: Task) -> dict[str, str]:
        files: dict[str, str] = {}
        inputs = task.inputs if isinstance(task.inputs, dict) else {}
        if isinstance(inputs.get("files"), dict):
            for k, v in inputs["files"].items():
                if isinstance(v, str):
                    files[str(k)] = v
        # Mode-aware input filenames (must match each mode's generated scripts):
        #   csv  -> /workspace/input.csv   (CsvMode reads INPUT_CSV_PATH)
        #   coder -> /workspace/input_file  (wrapper copies to input_file.py)
        #   chart -> /workspace/data.csv     (ChartMode reads INPUT_DATA_PATH)
        #   fix  -> /workspace/input_file   (FixMode reads INPUT_FILE_PATH)
        file_map = {
            "csv": {"file": "input.csv", "data": "data.csv", "test": "test.py", "code": "source.py"},
            "coder": {"file": "input_file", "data": "data.csv", "test": "test.py", "code": "source.py"},
            "chart": {"file": "input.csv", "data": "data.csv", "test": "test.py", "code": "source.py"},
            "fix": {"file": "input_file", "data": "data.csv", "test": "test.py", "code": "source.py"},
        }
        mapping = file_map.get(task.mode, {"file": "input_file", "data": "data.csv", "test": "test.py", "code": "source.py"})
        for key in ("file", "data", "test", "code"):
            val = inputs.get(key)
            if isinstance(val, str):
                files[mapping.get(key, key)] = val
        return files

    # ------------------------------------------------------------------ public
    async def submit(self, mode: str, inputs: dict) -> Task:
        """Create and persist a new task, returning the Task object."""
        task = Task(
            id=str(uuid.uuid4()),
            mode=mode,
            inputs=inputs if isinstance(inputs, dict) else {},
            created_at=datetime.utcnow(),
        )
        self._tasks[task.id] = task
        self._ensure_task_persisted(task)
        self._update_task_persisted(task.id, "queued", "")
        return task

    async def get(self, task_id: str) -> RunResult | None:
        """Return the latest RunResult for a task, if any."""
        if task_id in self._results:
            return self._results[task_id]
        if task_id in self._tasks:
            return RunResult(
                task_id=task_id,
                status="queued",
                attempts=0,
                summary="",
                artifacts=[],
            )
        return None

    def get_task(self, task_id: str) -> Task | None:
        return self._tasks.get(task_id)

    def list_tasks(self) -> list[dict]:
        """Snapshot of all known tasks (newest first), enriched with mode/created_at."""
        results: list[dict] = []
        for task_id, task in self._tasks.items():
            r = self._results.get(task_id)
            entry = {
                "task_id": task_id,
                "mode": task.mode,
                "created_at": task.created_at.isoformat(),
                "status": (r.status if r else "queued"),
                "attempts": (r.attempts if r else 0),
                "summary": (r.summary if r else ""),
                "artifacts": (r.artifacts if r else []),
                "parsed": (r.parsed if r else None),
            }
            results.append(entry)
        results.sort(key=lambda e: e["created_at"], reverse=True)
        return results

    async def run_loop(self, task: Task) -> AsyncIterator[RunResult]:
        """Run the agentic loop, yielding RunResult progress updates."""
        self._tasks[task.id] = task
        self._ensure_task_persisted(task)

        registry = _load_mode_registry()
        mode_cls = registry.get(task.mode)
        mode = None
        if mode_cls is not None:
            try:
                mode = mode_cls()
            except Exception:
                mode = None

        max_retries = self._max_retries()
        attempts = 0
        artifacts: list[str] = []
        last_error: str | None = None
        summary = ""

        yield RunResult(
            task_id=task.id,
            status="running",
            attempts=0,
            summary="",
            artifacts=[],
        )

        if mode is None:
            summary = f"Unknown or unavailable mode: {task.mode}"
            self._update_task_persisted(task.id, "failed", summary)
            result = RunResult(
                task_id=task.id,
                status="failed",
                attempts=0,
                summary=summary,
                artifacts=[],
            )
            self._results[task.id] = result
            yield result
            return

        while attempts < max_retries:
            attempts += 1
            try:
                plan_prompt = mode.build_plan_prompt(task)
                if last_error:
                    plan_prompt = plan_prompt + "\n\nPrevious error:\n" + last_error
                plan = self._llm.generate(plan_prompt)

                code_prompt = mode.build_code_prompt(task, plan)
                if last_error:
                    code_prompt = (
                        code_prompt
                        + "\n\nPrevious error:\n"
                        + last_error
                        + "\nFix the code accordingly."
                    )
                raw_code = self._llm.generate(code_prompt)
                code = self._sanitize_code(raw_code)

                files = self._build_files(task)
                artifact_dir = Path("data/artifacts") / task.id
                artifact_dir.mkdir(parents=True, exist_ok=True)
                exec_result = await self._sandbox.execute(
                    code, files, artifact_out_dir=artifact_dir
                )
                verification = mode.verify(exec_result)
                artifacts = list(exec_result.artifacts or [])

                if getattr(verification, "ok", False):
                    status = "passed"
                    try:
                        summary = self._llm.generate(
                            "You are a terse status reporter. Summarize the successful run "
                            "in ONE plain-text sentence, no markdown, no code, under 25 words. "
                            "Mention the fix if one was applied.\n"
                            f"stdout:\n{exec_result.stdout}\n"
                            f"stderr:\n{exec_result.stderr}"
                        )
                    except Exception:
                        summary = getattr(verification, "reason", "") or "passed"
                    self._update_task_persisted(task.id, status, summary)
                    result = RunResult(
                        task_id=task.id,
                        status="passed",
                        attempts=attempts,
                        summary=summary,
                        artifacts=artifacts,
                        parsed=extract_parsed(exec_result.stdout),
                    )
                    self._results[task.id] = result
                    yield result
                    return

                last_error = (
                    f"{getattr(verification, 'reason', 'verification failed')}\n"
                    f"exit_code={exec_result.exit_code}\n"
                    f"stderr:\n{exec_result.stderr}\n"
                    f"stdout:\n{exec_result.stdout}"
                )
            except Exception as exc:  # noqa: BLE001
                last_error = f"{type(exc).__name__}: {exc}"

            yield RunResult(
                task_id=task.id,
                status="running",
                attempts=attempts,
                summary=last_error or "",
                artifacts=artifacts,
            )

        # exhausted
        status = "failed"
        try:
            summary = self._llm.generate(
                "You are a terse status reporter. Explain the failure in ONE plain-text "
                "sentence, no markdown, no code, under 25 words.\n"
                f"{last_error or ''}"
            )
        except Exception:
            summary = last_error or "failed"
        self._update_task_persisted(task.id, status, summary)
        result = RunResult(
            task_id=task.id,
            status="failed",
            attempts=attempts,
            summary=summary,
            artifacts=artifacts,
        )
        self._results[task.id] = result
        yield result
