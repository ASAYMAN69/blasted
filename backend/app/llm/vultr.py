"""Vultr Serverless Inference LLM client — DISABLED stub.

Endpoint (from hackathon brief): https://api.vultrinference.com/v1 (OpenAI-compatible).
This implementation is complete in structure but gated: it raises unless
VULTR_LLM_ENABLED=true. TODO(enable): confirm Vultr's auth-header format and model-ID
list from their docs, then un-gate and verify against a live key.
"""
import json

from openai import OpenAI

from backend.app.config import Settings
from backend.app.llm.base import LLMError


class VultrLLMClient:
    provider_name = "vultr"
    _endpoint = "https://api.vultrinference.com/v1"

    def __init__(self, settings: Settings):
        if not settings.vultr_llm_enabled:
            raise RuntimeError(
                "Vultr LLM is a disabled stub. Set VULTR_LLM_ENABLED=true "
                "and provide VULTR_LLM_API_KEY to enable."
            )
        if not settings.vultr_llm_api_key:
            raise RuntimeError("VULTR_LLM_API_KEY is not set")
        if not settings.vultr_llm_model:
            raise RuntimeError("VULTR_LLM_MODEL is not set")
        # TODO(enable): confirm Vultr's auth-header format and model-ID list.
        self._model = settings.vultr_llm_model
        self._client = OpenAI(
            base_url=self._endpoint,
            api_key=settings.vultr_llm_api_key,
        )

    def generate(
        self,
        prompt: str,
        system: str | None = None,
        max_tokens: int = 1024,
    ) -> str:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        try:
            resp = self._client.chat.completions.create(
                model=self._model,
                messages=messages,
                max_tokens=max_tokens,
            )
        except Exception as exc:  # pragma: no cover - network
            raise LLMError(f"vultr generate failed: {exc}") from exc
        choices = getattr(resp, "choices", None) or []
        if not choices:
            return ""
        content = choices[0].message.content
        return (content or "").strip()

    def generate_json(self, prompt: str, schema: dict) -> dict:
        text = self.generate(
            prompt + "\n\nRespond with JSON only.",
            system="You must respond with valid JSON matching the provided schema.",
            max_tokens=2048,
        )
        try:
            return json.loads(text)
        except json.JSONDecodeError as exc:
            raise LLMError(f"model did not return valid JSON: {exc}") from exc