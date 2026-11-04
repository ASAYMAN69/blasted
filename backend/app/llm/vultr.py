"""Vultr Serverless Inference LLM client (OpenAI-compatible).

Endpoint: https://api.vultrinference.com/v1  (OpenAI-compatible, per hackathon brief)
This is the REQUIRED LLM provider for Challenge 1. It becomes the primary
provider whenever VULTR_LLM_API_KEY is set.
"""
import json

from openai import OpenAI

from backend.app.config import Settings
from backend.app.llm.base import LLMError

_DEFAULT_ENDPOINT = "https://api.vultrinference.com/v1"


class VultrLLMClient:
    provider_name = "vultr"

    def __init__(self, settings: Settings):
        if not settings.vultr_llm_api_key:
            raise LLMError("VULTR_LLM_API_KEY is not set")
        if not settings.vultr_llm_model:
            raise LLMError("VULTR_LLM_MODEL is not set")
        self._model = settings.vultr_llm_model
        self._client = OpenAI(
            base_url=settings.vultr_llm_api_base or _DEFAULT_ENDPOINT,
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
        except Exception as exc:
            raise LLMError(f"vultr generate failed: {exc}") from exc
        choices = getattr(resp, "choices", None) or []
        if not choices:
            return ""
        msg = choices[0].message
        content = getattr(msg, "content", None)
        if not content:
            # Some thinking models (glm, deepseek, qwen3) put their answer in
            # the `reasoning` field and leave `content` empty. Fall back to it.
            content = getattr(msg, "reasoning", None)
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
