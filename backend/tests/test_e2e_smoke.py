"""E2E HTTP smoke test (TASK 08).

Exercises the real API surface end to end: submit → SSE progress loop → passed
status → artifact fetch → list endpoint. Uses a fake LLM (deterministic scripts)
and the real Docker sandbox.
"""
from __future__ import annotations

import json

import pytest
from backend.app.api import routes as api_routes
from backend.app.engine.orchestrator import Orchestrator
from backend.app.main import app
from backend.app.sandbox.manager import SandboxManager
from backend.tests._support import (
    CHART_DATA,
    CHART_REQUEST,
    CSV_CODE,
    CSV_FIXTURE,
    CSV_QUESTION,
    FakeLLM,
    make_test_settings,
    require_docker,
)
from fastapi.testclient import TestClient

pytestmark = require_docker


@pytest.mark.asyncio
async def test_api_smoke_submit_sse_passed_artifacts_list(tmp_path, monkeypatch):
    settings = make_test_settings()
    orch = Orchestrator(
        settings,
        FakeLLM(code=CSV_CODE),
        SandboxManager(settings),
        str(tmp_path / "test.db"),
    )
    monkeypatch.setattr(api_routes, "_get_orchestrator", lambda: orch)

    with TestClient(app) as client:
        # unknown mode -> 400
        bad = client.post("/api/tasks", json={"mode": "nope", "inputs": {}})
        assert bad.status_code == 400

        # health
        assert client.get("/health").json() == {"status": "ok"}

        # submit
        resp = client.post(
            "/api/tasks",
            json={
                "mode": "csv",
                "inputs": {"files": {"input.csv": CSV_FIXTURE}, "question": CSV_QUESTION},
            },
        )
        assert resp.status_code == 200
        task = resp.json()
        task_id = task["id"]
        assert task["mode"] == "csv"
        assert task["inputs"]["files"]["input.csv"] == CSV_FIXTURE

        # status before running
        queued = client.get(f"/api/tasks/{task_id}")
        assert queued.status_code == 200
        assert queued.json()["status"] == "queued"

        # drive the agent loop over SSE until terminal
        with client.stream("GET", f"/api/tasks/{task_id}/events") as ev:
            assert ev.status_code == 200
            events = [
                json.loads(line[6:])
                for line in ev.iter_lines()
                if line.startswith("data:")
            ]
        assert events, "SSE emitted no events"
        assert events[-1]["status"] in ("passed", "failed")
        assert events[-1]["status"] == "passed"

        # status after run
        done = client.get(f"/api/tasks/{task_id}")
        assert done.status_code == 200
        body = done.json()
        assert body["status"] == "passed"
        assert body["attempts"] >= 1
        assert "summary.json" in body["artifacts"]

        # artifact fetchable
        art = client.get(f"/api/artifacts/{task_id}/summary.json")
        assert art.status_code == 200
        assert art.content

        # list endpoint: newest first, includes mode/created_at
        second = client.post(
            "/api/tasks",
            json={"mode": "chart", "inputs": {"data": CHART_DATA, "request": CHART_REQUEST}},
        )
        assert second.status_code == 200
        second_id = second.json()["id"]

        listing = client.get("/api/tasks").json()
        assert [item["task_id"] for item in listing] == [second_id, task_id]
        mine = next(item for item in listing if item["task_id"] == task_id)
        assert mine["mode"] == "csv"
        assert "created_at" in mine
        assert mine["status"] == "passed"
