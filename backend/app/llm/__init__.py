"""LLM client factory. Selects Vultr if enabled, else OpenRouter."""
from backend.app.config import Settings
from backend.app.llm.base import LLMClient
from backend.app.llm.openrouter import OpenRouterClient
from backend.app.llm.vultr import VultrLLMClient


def get_llm_client(settings: Settings) -> LLMClient:
    if settings.vultr_llm_enabled and settings.vultr_llm_api_key:
        return VultrLLMClient(settings)
    return OpenRouterClient(settings)
