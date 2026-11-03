"""Engine state-machine and retry-budget unit tests (TASK 08).

These tests use fakes only (``FakeLLM`` / ``FakeSandbox``) so they are fast and
deterministic. The real Docker-backed sandbox is exercised separately in the
integration and containment suites.
"""
from __future__ import annotations

import asyncio
from datetime import datetime

import pytest

from backend.app.engine import orchestrator as orch_mod
from backend.app.engine.modes.base import Verification
from backend.app.engine.orchestrator import Task
from backend.app.sandbox.manager import ExecutionResult, SandboxError
from backend.tests._support import (
    AlwaysFailMode,
    FakeLLM,
    FakeSandbox,
    FlakyMode,
    StubMode,
)


def _registry(monkeypatch, registry: dict) -> None:
    monkeypatch.setattr(orch_mod, "_load_mode_registry", lambda: registry)


async def _collect(orchestrator, task):
    return [result async for result in orchestrator.run_loop(task)]


@pytest.mark.asyncio
async def test_submit_creates_and_stores_task(make_orch):
    orch = make_orch()
    task = await orch.submit("stub", {"a": 1})

    assert task.id
    assert task.mode == "stub"
    assert task.inputs == {"a": 1}
    assert isinstance(task.created_at, datetime)
    assert orch.get_task(task.id).id == task.id


@pytest.mark.asyncio
async def test_get_before_run_returns_queued(make_orch):
    orch = make_orch()
    task = await orch.submit("stub", {})

    res = await orch.get(task.id)
    assert res is not None
    assert res.status == "queued"
    assert res.attempts == 0
    assert res.artifacts == []


@pytest.mark.asyncio
async def test_get_unknown_task_returns_none(make_orch):
    orch = make_orch()
    assert await orch.get("does-not-exist") is None


@pytest.mark.asyncio
async def test_run_loop_passed_happy_path(monkeypatch, make_orch):
    _registry(monkeypatch, {"stub": StubMode})
    sb = FakeSandbox(
        result=ExecutionResult(
            stdout="RESULT_JSON: {\"ok\": true}",
            stderr="",
            exit_code=0,
            artifacts=["summary.json"],
        )
    )
    orch = make_orch(sandbox=sb)
    task = await orch.submit("stub", {})

    results = await _collect(orch, task)
    final = results[-1]

    assert final.status == "passed"
    assert final.task_id == task.id
    assert final.attempts == 1
    assert final.artifacts == ["summary.json"]
    assert [r.status for r in results] == ["running", "passed"]
    assert len(sb.executions) == 1


@pytest.mark.asyncio
async def test_build_files_maps_inputs_to_workspace_names(make_orch):
    """Lock the engine's actual input→filename mapping contract."""
    orch = make_orch()
    task = Task(
        id="t1",
        mode="csv",
        inputs={
            "file": "a,b\n1,2\n",
            "data": "x,y\n1,2\n",
            "test": "print(1)\n",
            "code": "x = 1\n",
            "files": {"input.csv": "a,b\n1,2\n", "notes.txt": "hi"},
        },
        created_at=datetime.utcnow(),
    )
    files = orch._build_files(task)

    # canonical convenience keys — csv mode maps file -> input.csv (matches
    # CsvMode's generated scripts); others -> input_file
    assert files["input.csv"] == "a,b\n1,2\n"   # file -> input.csv (csv mode)
    assert files["data.csv"] == "x,y\n1,2\n"     # data -> data.csv
    assert files["test.py"] == "print(1)\n"       # test -> test.py
    assert files["source.py"] == "x = 1\n"        # code -> source.py
    # explicit files dict passes through verbatim
    assert files["notes.txt"] == "hi"


def test_csv_file_input_lands_as_input_csv(make_orch):
    """Regression: csv `file`-key must land as /workspace/input.csv (fixed)."""
    orch = make_orch()
    task = Task(
        id="t2",
        mode="csv",
        inputs={"file": "a,b\n1,2\n"},
        created_at=datetime.utcnow(),
    )
    files = orch._build_files(task)
    assert files.get("input.csv") == "a,b\n1,2\n"
    assert "input_file" not in files


@pytest.mark.asyncio
async def test_run_loop_retry_budget_exhausted(monkeypatch, make_orch):
    _registry(monkeypatch, {"stub": AlwaysFailMode})
    sb = FakeSandbox()
    orch = make_orch(sandbox=sb, max_retries=3)
    task = await orch.submit("stub", {})

    results = await _collect(orch, task)
    final = results[-1]

    assert final.status == "failed"
    assert final.attempts == 3
    assert [r.status for r in results] == [
        "running", "running", "running", "running", "failed",
    ]
    # each attempt executed the sandbox once; no more than the budget
    assert len(sb.executions) == 3


@pytest.mark.asyncio
async def test_run_loop_recovers_within_budget(monkeypatch, make_orch):
    _registry(monkeypatch, {"stub": FlakyMode})
    sb = FakeSandbox()
    orch = make_orch(sandbox=sb, max_retries=3)
    task = await orch.submit("stub", {})

    results = await _collect(orch, task)
    final = results[-1]

    assert final.status == "passed"
    assert final.attempts == 3
    assert [r.status for r in results] == [
        "running", "running", "running", "passed",
    ]
    assert len(sb.executions) == 3


@pytest.mark.asyncio
async def test_run_loop_sandbox_exception_retries_then_fails(
    monkeypatch, make_orch
):
    _registry(monkeypatch, {"stub": StubMode})
    sb = FakeSandbox(
        results=[SandboxError("boom"), SandboxError("boom"), SandboxError("boom")]
    )
    orch = make_orch(sandbox=sb, max_retries=3)
    task = await orch.submit("stub", {})

    results = await _collect(orch, task)
    final = results[-1]

    assert final.status == "failed"
    assert final.attempts == 3
    # the intermediate running-yields carry the sandbox error text
    assert any("SandboxError" in r.summary for r in results)


@pytest.mark.asyncio
async def test_run_loop_unknown_mode_fails(monkeypatch, make_orch):
    _registry(monkeypatch, {"stub": StubMode})
    orch = make_orch()
    task = Task(
        id="ghost", mode="ghost", inputs={}, created_at=datetime.utcnow()
    )

    results = await _collect(orch, task)
    final = results[-1]

    assert final.status == "failed"
    assert "Unknown or unavailable mode" in final.summary
    assert final.attempts == 0


def test_sanitize_code_strips_fences(make_orch):
    orch = make_orch()
    raw = '```python\nprint("hi")\n```\n'
    assert orch._sanitize_code(raw) == 'print("hi")'

    raw2 = '```\nprint("hi")\n```\n'
    assert orch._sanitize_code(raw2) == 'print("hi")'

    plain = 'print("hi")\n'
    assert orch._sanitize_code(plain) == 'print("hi")'


@pytest.mark.asyncio
async def test_list_tasks_newest_first_with_results(make_orch):
    orch = make_orch()
    older = Task(
        id="older", mode="csv", inputs={}, created_at=datetime(2026, 1, 1, 0, 0, 1)
    )
    newer = Task(
        id="newer", mode="chart", inputs={}, created_at=datetime(2026, 1, 1, 0, 0, 2)
    )
    orch._tasks["older"] = older
    orch._tasks["newer"] = newer
    orch._results["newer"] = orch_mod.RunResult(
        task_id="newer", status="passed", attempts=2,
        summary="done", artifacts=["chart.png"],
    )

    listing = orch.list_tasks()

    assert [entry["task_id"] for entry in listing] == ["newer", "older"]
    assert listing[0]["status"] == "passed"
    assert listing[0]["mode"] == "chart"
    assert listing[1]["status"] == "queued"
    assert "created_at" in listing[0]


@pytest.mark.asyncio
async def test_submit_order_newest_first(make_orch):
    orch = make_orch()
    await orch.submit("stub", {})
    await asyncio.sleep(0.02)
    second = await orch.submit("stub", {})

    listing = orch.list_tasks()
    assert listing[0]["task_id"] == second.id
    assert len(listing) == 2


def test_extract_parsed_tolerates_python_dict_literal():
    """Regression: model emitted a single-quoted Python dict, not strict JSON."""
    from backend.app.engine.orchestrator import extract_parsed

    stdout = (
        "STDOUT: Hello world\nSTDERR:\n"
        "FIX_RESULT: {'changed': True, 'run_ok': True, 'diff_lines': 8, "
        "'summary': 'Added return statement to greet function'}\n"
    )
    parsed = extract_parsed(stdout)
    assert parsed is not None
    assert parsed["changed"] is True
    assert parsed["run_ok"] is True
    assert parsed["diff_lines"] == 8
