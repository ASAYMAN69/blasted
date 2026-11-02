"""FastAPI application entrypoint. Owned by the `engine` agent (TASK 01)."""
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from backend.app.api.routes import router

app = FastAPI(title="Sandboxed Agent Studio")
app.include_router(router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


# Serve built frontend static files if present.
_frontend_dist = Path("frontend/dist")
if _frontend_dist.is_dir():
    app.mount("/", StaticFiles(directory=str(_frontend_dist), html=True), name="app")