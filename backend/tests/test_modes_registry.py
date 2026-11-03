"""Mode registry wiring + per-mode verify logic unit checks (TASK 08).

No Docker needed: these tests exercise the frozen ``Mode`` contract and the
``verify`` decision logic directly on synthetic ``ExecutionResult`` objects.
"""
from __future__ import annotations

from datetime import datetime

import pytest

from backend.app.engine.modes import MODE_REGISTRY
from backend.app.engine.orchestrator import Task
from backend.app.sandbox.manager import ExecutionResult

EXPECTED_MODES = {"csv", "coder", "chart", "fix"}


def _task(mode: str, inputs: dict) -> Task:
    return Task(id="t1", mode=mode, inputs=inputs, created_at=datetime.utcnow())


def _res(*, stdout="", stderr="", exit_code=0, artifacts=()) -> ExecutionResult:
    return ExecutionResult(
        stdout=stdout,
        stderr=stderr,
        exit_code=exit_code,
        artifacts=list(artifacts),
    )


def test_registry_declares_all_four_modes():
    assert set(MODE_REGISTRY) == EXPECTED_MODES


def test_registry_instances_match_names():
    for name, cls in MODE_REGISTRY.items():
        instance = cls()
        assert instance.name == name
        assert isinstance(instance.input_schema, dict)


def test_all_modes_build_prompts():
    sample_inputs = {
        "csv": {"file": "a,b\n1,2\n", "question": "sum"},
        "coder": {"file": "print(1)\n", "goal": "prints 1"},
        "chart": {"data": "a,b\n1,2\n", "request": "chart it"},
        "fix": {"file": "x = 1\n", "desired": "x == 2"},
    }
    for name, cls in MODE_REGISTRY.items():
        instance = cls()
        task = _task(name, sample_inputs[name])
        plan = instance.build_plan_prompt(task)
        code = instance.build_code_prompt(task, "plan text")
        assert isinstance(plan, str) and plan.strip()
        assert isinstance(code, str) and code.strip()


@pytest.mark.parametrize(
    "stdout,expected_ok",
    [
        ('RESULT_JSON: {"summary": "s", "numbers": {}}', True),
        ('{"summary": "bare json"}', True),
        ("no json here", False),
        ("", False),
    ],
)
def test_csv_verify_ok_outcomes(stdout, expected_ok):
    mode = MODE_REGISTRY["csv"]()
    result = _res(stdout=stdout)
    assert mode.verify(result).ok is expected_ok


def test_csv_verify_fails_on_nonzero_exit():
    mode = MODE_REGISTRY["csv"]()
    result = _res(stderr="boom", exit_code=1)
    v = mode.verify(result)
    assert v.ok is False
    assert "code 1" in v.reason


def test_csv_verify_passes_with_output_artifact_fallback():
    mode = MODE_REGISTRY["csv"]()
    result = _res(stdout="nothing machine-readable", artifacts=["chart.png"])
    assert mode.verify(result).ok is True


def test_coder_verify_verdict_pass():
    mode = MODE_REGISTRY["coder"]()
    stdout = 'CODER_RESULT: {"run_ok": true, "test_ok": null, "fixed": false, "attempts": 1, "summary": "clean"}'
    assert mode.verify(_res(stdout=stdout)).ok is True


def test_coder_verify_verdict_fail():
    mode = MODE_REGISTRY["coder"]()
    stdout = 'CODER_RESULT: {"run_ok": false, "test_ok": null, "fixed": true, "attempts": 2, "summary": "still broken"}'
    result = _res(stdout=stdout, stderr="Traceback boom")
    v = mode.verify(result)
    assert v.ok is False
    assert "still broken" in v.reason


def test_coder_verify_fallback_no_verdict():
    mode = MODE_REGISTRY["coder"]()
    clean = mode.verify(_res(stdout="ran", stderr=""))
    assert clean.ok is True
    bad = mode.verify(_res(stdout="ran", stderr="Traceback (most recent call last)"))
    assert bad.ok is False


def test_chart_verify_artifact_required():
    mode = MODE_REGISTRY["chart"]()
    assert mode.verify(_res(artifacts=["chart.png"])).ok is True
    assert mode.verify(_res(artifacts=["chart.html"])).ok is True
    assert mode.verify(_res(artifacts=[])).ok is False
    assert mode.verify(_res(exit_code=1, stderr="oops")).ok is False


def test_fix_verify_diff_required():
    mode = MODE_REGISTRY["fix"]()
    ok_stdout = 'FIX_RESULT: {"changed": true, "run_ok": true, "diff_lines": 6, "summary": "ok"}\n'
    # verified patch -> pass
    assert mode.verify(_res(artifacts=["fix.diff"], stdout=ok_stdout)).ok is True
    # patch applied but didn't run -> fail (never claim success on unverified fix)
    assert (
        mode.verify(
            _res(artifacts=["fix.diff"], stdout='FIX_RESULT: {"changed": true, "run_ok": false, "diff_lines": 6}\n')
        ).ok
        is False
    )
    # missing diff artifact -> fail
    assert mode.verify(_res(artifacts=[], stdout=ok_stdout)).ok is False
    # missing verdict -> fail (no false success)
    assert mode.verify(_res(artifacts=["fix.diff"], stdout="no verdict\n")).ok is False
    assert mode.verify(_res(exit_code=2, stderr="err")).ok is False
