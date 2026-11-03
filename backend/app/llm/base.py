"""The LLM provider abstraction. FROZEN contract — do not edit.

Implementations live in openrouter.py and vultr.py; selection lives in __init__.py.
"""
from typing import Protocol


class LLMClient(Protocol):
    provider_name: str

    def generate(
        self,
        prompt: str,
        system: str | None = None,
        max_tokens: int = 1024,
    ) -> str: ...

    def generate_json(self, prompt: str, schema: dict) -> dict: ...


class LLMError(RuntimeError):
    """Raised when an LLM call fails after retries."""
