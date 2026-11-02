"""Vultr Serverless Inference LLM client — DISABLED stub.

Endpoint (from hackathon brief): https://api.vultrinference.com/v1 (OpenAI-compatible).
This implementation is complete in structure but gated: it raises unless
VULTR_LLM_ENABLED=true. TODO(enable): confirm Vultr's auth-header format and model-ID
list from their docs, then un-gate and verify against a live key.
"""
import json

from backend.app.config import Settings
from backend.app.llm.base import LLMError


class VultrLLMClient:
    provider_name = "vultr"
    _endpoint = "https://api.vultrinference.com/v1"

    def __init__(self, settings: Settings):
        if not settings.vultr_llm_enabled:
            raise LLMError(
                "Vultr LLM is a disabled stub. Set VULTR_LLM_ENABLED=true "
                "and provide VULTR_LLM_API_KEY to enable."
            )
        # TODO(enable): build the OpenAI-compatible client against self._endpoint
        # once auth model/model list are confirmed.
        raise LLMError("Vultr LLM not yet enabled — see TODO in vultr.py")

    def generate(
        self,
        prompt: str,
        system: str | None = None,
        max_tokens: int = 1024,
    ) -> str:
        raise NotImplementedError

    def generate_json(self, prompt: str, schema: dict) -> dict:
        raise NotImplementedError
