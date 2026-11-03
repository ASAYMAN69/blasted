"""LLM client selection tests (TASK 08).

Covers the ``get_llm_client`` factory and the Vultr gate. Client constructors
make no network calls, so this runs without credentials of any kind.
"""
from __future__ import annotations

import pytest
from backend.app.config import Settings
from backend.app.llm import get_llm_client
from backend.app.llm.base import LLMError
from backend.app.llm.openrouter import OpenRouterClient
from backend.app.llm.vultr import VultrLLMClient


def _base(**overrides) -> Settings:
    defaults = dict(
        openrouter_api_key="test-key",
        or_model="test/model",
        vultr_llm_enabled=False,
        vultr_llm_api_key="",
        vultr_llm_model="",
        # Explicitly empty so ambient .env values never leak into selection tests.
        ollama_api_key="",
        ollama_api_base="https://ollama.com",
        ollama_model="gemma4:31b-cloud",
        sandbox_memory="512m",
        sandbox_cpus="0.5",
        sandbox_timeout_s=20,
        sandbox_image="sandbox-runner:latest",
        max_task_size_mb=25,
        max_retries=3,
    )
    defaults.update(overrides)
    return Settings(**defaults)


def test_vultr_disabled_returns_openrouter():
    client = get_llm_client(_base())
    assert isinstance(client, OpenRouterClient)
    assert client.provider_name == "openrouter"


def test_vultr_enabled_without_key_falls_back_to_openrouter():
    client = get_llm_client(_base(vultr_llm_enabled=True))
    assert isinstance(client, OpenRouterClient)


def test_vultr_enabled_with_key_returns_vultr():
    client = get_llm_client(
        _base(
            vultr_llm_enabled=True,
            vultr_llm_api_key="vk",
            vultr_llm_model="vultr/model",
        )
    )
    assert isinstance(client, VultrLLMClient)
    assert client.provider_name == "vultr"


def test_vultr_client_gates_on_enabled_flag():
    with pytest.raises(RuntimeError, match="disabled stub"):
        VultrLLMClient(_base())


def test_vultr_client_requires_model():
    with pytest.raises(RuntimeError, match="VULTR_LLM_MODEL"):
        VultrLLMClient(
            _base(vultr_llm_enabled=True, vultr_llm_api_key="vk")
        )


def test_openrouter_client_requires_key():
    with pytest.raises(LLMError, match="OPENROUTER_API_KEY"):
        OpenRouterClient(_base(openrouter_api_key=""))
