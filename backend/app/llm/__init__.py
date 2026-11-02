"""LLM client factory. Precedence: Vultr (if enabled) -> Ollama (if key set) -> OpenRouter."""
from backend.app.config import Settings
from backend.app.llm.base import LLMClient
from backend.app.llm.ollama import OllamaClient
from backend.app.llm.openrouter import OpenRouterClient
from backend.app.llm.vultr import VultrLLMClient


def get_llm_client(settings: Settings) -> LLMClient:
    if settings.vultr_llm_enabled and settings.vultr_llm_api_key:
        return VultrLLMClient(settings)
    if settings.ollama_api_key:
        return OllamaClient(settings)
    return OpenRouterClient(settings)
