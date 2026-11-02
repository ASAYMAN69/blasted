"""OpenRouter LLM client (ACTIVE default provider).

Supports both request styles:
- Anthropic SDK (default) -> https://openrouter.ai/api/v1/messages  (true Anthropic style)
- OpenAI-style (when OPENROUTER_API_URL points at .../chat/completions)
"""
import json

from anthropic import Anthropic
from openai import OpenAI

from backend.app.config import Settings
from backend.app.llm.base import LLMError

# OpenRouter API root. The Anthropic SDK appends "/v1/messages" to base_url, so
# the base must be the root (NOT .../api/v1, which would produce /api/v1/v1/messages).
_DEFAULT_API_ROOT = "https://openrouter.ai/api"


class OpenRouterClient:
    provider_name = "openrouter"

    def __init__(self, settings: Settings):
        if not settings.openrouter_api_key:
            raise LLMError("OPENROUTER_API_KEY is not set")
        self._model = settings.or_model
        self._api_url = (settings.openrouter_api_url or "").strip()
        if self._api_url and "/chat/completions" in self._api_url:
            # OpenAI-style endpoint: use the OpenAI-compatible client.
            self._style = "openai"
            self._client = OpenAI(
                base_url=self._api_url.removesuffix("/chat/completions").removesuffix("/"),
                api_key=settings.openrouter_api_key,
            )
        else:
            # Anthropic-style endpoint (default).
            self._style = "anthropic"
            self._client = Anthropic(
                base_url=self._api_url or _DEFAULT_API_ROOT,
                api_key=settings.openrouter_api_key,
            )

    def generate(
        self,
        prompt: str,
        system: str | None = None,
        max_tokens: int = 1024,
    ) -> str:
        if self._style == "openai":
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
                raise LLMError(f"openrouter (openai-style) generate failed: {exc}") from exc
            choices = getattr(resp, "choices", None) or []
            if not choices:
                return ""
            content = choices[0].message.content
            return (content or "").strip()

        # Anthropic-style default
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
