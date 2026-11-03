"""Shared test fixtures (TASK 08 — qa).

Run ``pytest`` from the **repo root** so ``backend.app.*`` imports resolve. This
file also guarantees the repo root is on ``sys.path`` regardless of the
invocation directory, and registers project markers that are normally declared
in ``backend/pyproject.toml`` (which pytest does not load when running from the
repo root).
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

import docker as docker_sdk
import pytest
from backend.app.config import Settings
from backend.app.engine.orchestrator import Orchestrator
from backend.app.sandbox.manager import SandboxManager
from backend.tests._support import (
    FakeLLM,
    FakeSandbox,
    make_test_settings,
)


def pytest_configure(config):
    """Register custom markers even when the repo-root pytest config is used."""
    existing = " ".join(config.getini("markers"))
    if "containment" not in existing:
        config.addinivalue_line(
            "markers", "containment: negative tests proving sandbox isolation"
        )


@pytest.fixture(autouse=True, scope="session")
def _chdir_to_repo_root():
    """Artifact paths are relative to cwd; always run from the repo root."""
    os.chdir(REPO_ROOT)
    yield


@pytest.fixture
def settings() -> Settings:
    return make_test_settings()


@pytest.fixture
def fake_llm() -> FakeLLM:
    return FakeLLM()


@pytest.fixture
def fake_sandbox() -> FakeSandbox:
    return FakeSandbox()


@pytest.fixture
def make_orch(tmp_path):
    """Factory for an Orchestrator with deterministic fakes and a temp store."""

    def _make(*, llm=None, sandbox=None, cfg=None, max_retries: int = 3):
        st = cfg if cfg is not None else make_test_settings(max_retries=max_retries)
        llm_obj = llm if llm is not None else FakeLLM()
        sb = sandbox if sandbox is not None else FakeSandbox()
        return Orchestrator(st, llm_obj, sb, str(tmp_path / "test.db"))

    return _make


@pytest.fixture
def docker_client():
    return docker_sdk.from_env()


@pytest.fixture
def sandbox_manager(settings, docker_client) -> SandboxManager:
    """A real SandboxManager wired to the same Docker client as the test."""
    return SandboxManager(settings, client=docker_client)
