"""FastAPI application entrypoint. Owned by the `engine` agent (TASK 01)."""
from pathlib import Path

from backend.app.api.routes import router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="Sandboxed Agent Studio")

# CORS: allow cross-origin frontends (e.g. Vite dev on :5173 hitting this
# backend directly, or a deployed SPA on another origin). In same-origin
# setups (proxy/static mount) this is inert.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/version")
def version() -> dict:
    """Deployed revision + app version (useful for verifying CD)."""
    import subprocess

    sha = "dev"
    try:
        sha = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            capture_output=True,
            text=True,
            timeout=5,
        ).stdout.strip() or "dev"
    except Exception:
        pass
    return {"app": "sandboxed-agent-studio", "version": "0.1.0", "sha": sha}


# Serve built frontend static files if present.
_frontend_dist = Path("frontend/dist")
if _frontend_dist.is_dir():
    app.mount("/", StaticFiles(directory=str(_frontend_dist), html=True), name="app")
