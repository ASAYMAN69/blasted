"""Ollama LLM client (ACTIVE default when configured).

Uses the Anthropic SDK against Ollama's Anthropic-compatible endpoint
(https://ollama.com/v1/messages for cloud; http://localhost:11434 for local).
"""
import json

from anthropic import Anthropic

from backend.app.config import Settings
from backend.app.llm.base import LLMError

_DEFAULT_API_BASE = "https://ollama.com"


class OllamaClient:
    provider_name = "ollama"

    def __init__(self, settings: Settings):
        if not settings.ollama_api_key:
            raise LLMError("OLLAMA_API_KEY is not set")
        self._model = settings.ollama_model or "gemma4:31b-cloud"
        self._client = Anthropic(
            # Anthropic SDK appends "/v1/messages" to base_url.
            base_url=settings.ollama_api_base or _DEFAULT_API_BASE,
            api_key=settings.ollama_api_key,
        )

    def generate(
        self,
        prompt: str,
        system: str | None = None,
        max_tokens: int = 1024,
    ) -> str:
        kwargs: dict = {
            "model": self._model,
            "max_tokens": max_tokens,
            "messages": [{"role": "user", "content": prompt}],
        }
        if system:
            kwargs["system"] = system
        message = self._client.messages.create(**kwargs)
        parts = [b.text for b in message.content if getattr(b, "type", "") == "text"]
        return "\n".join(parts).strip()

    def generate_json(self, prompt: str, schema: dict) -> dict:
        text = self.generate(prompt, system="Respond with JSON only.", max_tokens=2048)
        cleaned = text.strip()
        if cleaned.startswith("```"):
            lines = cleaned.splitlines()
            if lines and lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            cleaned = "\n".join(lines).strip()
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as exc:
            raise LLMError(f"model did not return valid JSON: {exc}") from exc
