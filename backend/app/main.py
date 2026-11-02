"""FastAPI application entrypoint. Owned by the `engine` agent (TASK 01)."""
from fastapi import FastAPI

from backend.app.api.routes import router

app = FastAPI(title="Sandboxed Agent Studio")
app.include_router(router)


# TODO(TASK 01): serve built frontend static files + wiring:
#   app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="app")
@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
