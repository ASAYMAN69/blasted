"""OpenRouter LLM client (ACTIVE default provider).

Uses the Anthropic SDK pointed at OpenRouter's OpenAI-compatible endpoint.
"""
import json

from anthropic import Anthropic

from backend.app.config import Settings
from backend.app.llm.base import LLMError


class OpenRouterClient:
    provider_name = "openrouter"

    def __init__(self, settings: Settings):
        if not settings.openrouter_api_key:
            raise LLMError("OPENROUTER_API_KEY is not set")
        self._model = settings.or_model
        self._client = Anthropic(
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.openrouter_api_key,
        )

    def generate(
        self,
        prompt: str,
        system: str | None = None,
        max_tokens: int = 1024,
    ) -> str:
        message = self._client.messages.create(
            model=self._model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        )
        parts = [b.text for b in message.content if getattr(b, "type", "") == "text"]
        return "\n".join(parts).strip()

    def generate_json(self, prompt: str, schema: dict) -> dict:
        text = self.generate(prompt, system="Respond with JSON only.", max_tokens=2048)
        try:
            return json.loads(text)
        except json.JSONDecodeError as exc:
            raise LLMError(f"model did not return valid JSON: {exc}") from exc
