"""HTTP API routes. Owned by the `engine` agent (TASK 01)."""
from fastapi import APIRouter

router = APIRouter(prefix="/api")

# TODO(TASK 01): implement the endpoints per CONTRACTS §5:
#   POST /api/tasks
#   GET  /api/tasks/{id}
#   GET  /api/tasks/{id}/events   (SSE)
#   GET  /api/artifacts/{task_id}/{name}
#   GET  /api/modes
