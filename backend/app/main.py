"""FastAPI application entrypoint. Owned by the `engine` agent (TASK 01)."""
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.api.routes import router

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


# Serve built frontend static files if present.
_frontend_dist = Path("frontend/dist")
if _frontend_dist.is_dir():
    app.mount("/", StaticFiles(directory=str(_frontend_dist), html=True), name="app")