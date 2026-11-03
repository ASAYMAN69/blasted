"""Per-mode integration tests against the real Docker sandbox (TASK 08).

Each test executes a hand-written, mode-conformant script inside a real
``SandboxManager`` sandbox and asserts the mode's ``verify`` passes and the
expected artifact is produced. Skipped automatically when Docker / the
``sandbox-runner:latest`` image is unavailable.
"""
from __future__ import annotations

import pytest
from backend.app.engine.modes import MODE_REGISTRY
from backend.tests._support import (
    CHART_CODE,
    CHART_DATA,
    CODER_BROKEN_FILE,
    CODER_CODE,
    CSV_CODE,
    CSV_FIXTURE,
    FIX_CODE,
    FIX_INPUT,
    require_docker,
)

pytestmark = [require_docker, pytest.mark.asyncio]


async def test_csv_mode_passes_with_artifact(sandbox_manager):
    result = await sandbox_manager.execute(
        CSV_CODE, {"input.csv": CSV_FIXTURE}, timeout_s=30
    )
    verification = MODE_REGISTRY["csv"]().verify(result)
    assert verification.ok, verification.reason
    assert result.exit_code == 0
    assert "summary.json" in result.artifacts


async def test_coder_mode_self_heals(sandbox_manager):
    result = await sandbox_manager.execute(
        CODER_CODE, {"input_file": CODER_BROKEN_FILE}, timeout_s=30
    )
    verification = MODE_REGISTRY["coder"]().verify(result)
    assert verification.ok, verification.reason
    assert result.exit_code == 0
    assert "CODER_RESULT:" in result.stdout


async def test_chart_mode_produces_png(sandbox_manager):
    result = await sandbox_manager.execute(
        CHART_CODE, {"data.csv": CHART_DATA}, timeout_s=30
    )
    verification = MODE_REGISTRY["chart"]().verify(result)
    assert verification.ok, verification.reason
    assert "chart.png" in result.artifacts


async def test_fix_mode_produces_diff(sandbox_manager):
    result = await sandbox_manager.execute(
        FIX_CODE, {"input_file": FIX_INPUT}, timeout_s=30
    )
    verification = MODE_REGISTRY["fix"]().verify(result)
    assert verification.ok, verification.reason
    assert "fix.diff" in result.artifacts
    assert "def add" in result.stdout or "fix.diff" in result.artifacts
