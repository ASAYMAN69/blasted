"""Persistent store: SQLite task history + filesystem artifacts. FR FEN (read-only).

Owned by the lead. The engine and sandbox agents consume this through simple functions.
"""
import sqlite3
from datetime import datetime
from pathlib import Path

_DB_PATH = Path("data/sandboxed.db")
_ARTIFACT_ROOT = Path("data/artifacts")


def init_store(db_path: Path = _DB_PATH, artifact_root: Path = _ARTIFACT_ROOT) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    artifact_root.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(db_path) as con:
        con.execute(
            """
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                mode TEXT NOT NULL,
                inputs TEXT NOT NULL,
                status TEXT NOT NULL,
                attempts INTEGER DEFAULT 0,
                summary TEXT DEFAULT '',
                created_at TEXT NOT NULL
            )
            """
        )
        con.execute(
            """
            CREATE TABLE IF NOT EXISTS artifacts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id TEXT NOT NULL,
                attempt_id INTEGER,
                name TEXT NOT NULL,
                kind TEXT NOT NULL,
                path TEXT NOT NULL
            )
            """
        )


def create_task(db_path: Path, task_id: str, mode: str, inputs: dict) -> None:
    with sqlite3.connect(db_path) as con:
        con.execute(
            "INSERT INTO tasks (id, mode, inputs, status, created_at) VALUES (?,?,?,?,?)",
            (task_id, mode, str(inputs), "queued", datetime.utcnow().isoformat()),
        )


def update_task_status(db_path: Path, task_id: str, status: str, summary: str = "") -> None:
    with sqlite3.connect(db_path) as con:
        con.execute(
            "UPDATE tasks SET status = ?, summary = ? WHERE id = ?",
            (status, summary, task_id),
        )
