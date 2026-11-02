"""Artifact persistence check (TASK 08) — the demo's verifiable-result story.

Runs a full ``Orchestrator.run_loop`` with a fake LLM + **real** Docker
sandbox, then asserts:
  1. the run passed and reported the artifact; and
  2. the artifact file actually exists on disk under
     ``data/artifacts/<task_id>/<name>``; and
  3. it is fetchable through ``GET /api/artifacts/{task_id}/{name}`` (200,
     non-empty body).
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend.app.api import routes as api_routes
from backend.app.config import Settings
from backend.app.engine.orchestrator import Orchestrator
from backend.app.main import app
from backend.app.sandbox.manager import SandboxManager
from backend.tests._support import (
    REPO_ROOT,
    CSV_CODE,
    CSV_FIXTURE,
    CSV_QUESTION,
    FakeLLM,
    make_test_settings,
    require_docker,
)

pytestmark = require_docker


@pytest.mark.asyncio
async def test_artifact_persisted_and_fetchable(tmp_path, monkeypatch):
    settings = make_test_settings()
    orch = Orchestrator(
        settings,
        FakeLLM(code=CSV_CODE),
        SandboxManager(settings),
        str(tmp_path / "test.db"),
    )
    monkeypatch.setattr(api_routes, "_get_orchestrator", lambda: orch)

    task = await orch.submit(
        "csv",
        {"files": {"input.csv": CSV_FIXTURE}, "question": CSV_QUESTION},
    )
    results = [r async for r in orch.run_loop(task)]
    final = results[-1]

    assert final.status == "passed", final.summary
    assert "summary.json" in final.artifacts

    artifact_path = REPO_ROOT / "data" / "artifacts" / task.id / "summary.json"
    assert artifact_path.is_file(), f"artifact missing on disk: {artifact_path}"
    assert artifact_path.stat().st_size > 0

    with TestClient(app) as client:
        resp = client.get(f"/api/artifacts/{task.id}/summary.json")
        assert resp.status_code == 200
        assert resp.content == artifact_path.read_bytes()

        missing = client.get(f"/api/artifacts/{task.id}/no-such-file.bin")
        assert missing.status_code == 404
