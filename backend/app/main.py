"""FastAPI application entrypoint. Owned by the `engine` agent (TASK 01).

This file wires everything together: routes, CORS (so a frontend on another
origin can call the API), and the built SPA (so the same process serves both
in production). We mount the SPA only if `frontend/dist` exists so local dev
stays fast (Vite serves the frontend separately).
"""
import subprocess as _subprocess
from pathlib import Path

from backend.app.api.routes import router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Sandboxed Agent Studio")

# CORS is intentionally permissive here because:
#   - In dev, Vite proxies /api so CORS isn't even used.
#   - In production (Vultr VM) the SPA is served by FastAPI itself (same origin).
#   - Only when someone sets VITE_BACKEND_ORIGIN to a different backend does
#     CORS matter, and then we want it to just work.
# Credentials are False because we use no cookies/sessions — only API calls.
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


_cached_sha = "dev"
try:
    _cached_sha = _subprocess.run(
        ["git", "rev-parse", "--short", "HEAD"],
        capture_output=True,
        text=True,
        timeout=5,
    ).stdout.strip() or "dev"
except Exception:
    pass


@app.get("/api/version")
def version() -> dict:
    """Deployed revision + app version (useful for verifying CD)."""
    return {"app": "sandboxed-agent-studio", "version": "0.1.0", "sha": _cached_sha}


# Serve built frontend static files if present (SPA fallback).
_frontend_dist = Path("frontend/dist")
if _frontend_dist.is_dir():
    from fastapi.responses import FileResponse

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        asset = _frontend_dist / full_path
        if asset.is_file():
            return FileResponse(asset)
        return FileResponse(_frontend_dist / "index.html")

