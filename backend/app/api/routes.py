"""HTTP API routes. Owned by the `engine` agent (TASK 01)."""
from __future__ import annotations

from pathlib import Path
from typing import Any

from backend.app.config import get_settings
from backend.app.engine.orchestrator import Orchestrator, Task
from backend.app.llm import get_llm_client
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel

router = APIRouter(prefix="/api")

_ORCHESTRATOR: Orchestrator | None = None


class TaskCreate(BaseModel):
    mode: str
    inputs: dict = {}


def _get_orchestrator() -> Orchestrator:
    global _ORCHESTRATOR
    if _ORCHESTRATOR is None:
        settings = get_settings()
        llm = get_llm_client(settings)
        sandbox = None
        try:
            from backend.app.sandbox.manager import SandboxManager

            try:
                sandbox = SandboxManager(settings)
            except TypeError:
                sandbox = SandboxManager()
        except Exception:
            sandbox = None
        # Anchor the DB to the repo root so persistence is independent of
        # the process's current working directory.
        _repo_root = Path(__file__).resolve().parents[3]
        _db_path = _repo_root / "data" / "sandboxed.db"
        _ORCHESTRATOR = Orchestrator(settings, llm, sandbox, str(_db_path))
    return _ORCHESTRATOR


def _mode_registry() -> dict[str, Any]:
    try:
        from backend.app.engine.modes import MODE_REGISTRY

        return MODE_REGISTRY
    except Exception:
        return {}


@router.post("/tasks", response_model=Task)
async def create_task(body: TaskCreate) -> Task:
    registry = _mode_registry()
    if body.mode not in registry:
        raise HTTPException(status_code=400, detail=f"unknown mode: {body.mode}")

    # Enforce total input size (configured via MAX_TASK_SIZE_MB).
    settings = get_settings()
    limit_bytes = settings.max_task_size_mb * 1024 * 1024
    total_size = 0
    if isinstance(body.inputs, dict):
        for value in body.inputs.values():
            if isinstance(value, str):
                total_size += len(value.encode("utf-8"))
            elif isinstance(value, dict):
                for v in value.values():
                    if isinstance(v, str):
                        total_size += len(v.encode("utf-8"))
    if total_size > limit_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"input too large: {total_size} bytes exceeds limit of {limit_bytes} bytes ({settings.max_task_size_mb}MB)",
        )

    orch = _get_orchestrator()
    return await orch.submit(body.mode, body.inputs)


@router.get("/tasks/{task_id}")
async def get_task(task_id: str) -> Any:
    orch = _get_orchestrator()
    result = await orch.get(task_id)
    if result is None:
        raise HTTPException(status_code=404, detail="task not found")
    return result


@router.get("/tasks")
async def list_tasks() -> list[Any]:
    orch = _get_orchestrator()
    return orch.list_tasks()


@router.get("/tasks/{task_id}/events")
async def task_events(task_id: str) -> StreamingResponse:
    orch = _get_orchestrator()
    task = orch.get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="task not found")

    async def event_stream():
        async for result in orch.run_loop(task):
            yield f"data: {result.model_dump_json()}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/artifacts/{task_id}/{name}")
async def get_artifact(task_id: str, name: str) -> FileResponse:
    root = Path("data/artifacts").resolve()
    # Defense-in-depth: reject any path component that could escape the root.
    # FastAPI already rejects most traversal, but we validate explicitly.
    if not task_id or not name or "/" in task_id or "\\" in task_id or "/" in name or "\\" in name:
        raise HTTPException(status_code=400, detail="invalid artifact path")
    if task_id in ("", ".", "..") or name in ("", ".", ".."):
        raise HTTPException(status_code=400, detail="invalid artifact path")
    candidate = (root / task_id / name).resolve()
    if not candidate.is_relative_to(root):
        raise HTTPException(status_code=400, detail="invalid artifact path")
    if not candidate.is_file():
        raise HTTPException(status_code=404, detail="artifact not found")
    return FileResponse(candidate)


@router.get("/modes")
async def list_modes() -> list[dict[str, Any]]:
    registry = _mode_registry()
    out = []
    for name, cls in registry.items():
        try:
            instance = cls()
            schema = getattr(instance, "input_schema", {})
        except Exception:
            schema = getattr(cls, "input_schema", {})
        out.append({"name": name, "input_schema": schema})
    return out
