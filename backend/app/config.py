"""Application configuration backed by environment variables.

Contract (see CONTEXT/CONTRACTS.md §6). Implement all fields below.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # LLM — OpenRouter (fallback)
    openrouter_api_key: str = ""
    openrouter_api_url: str = ""
    or_model: str = "anthropic/claude-3.5-sonnet"

    # LLM — Ollama (active when key set; Anthropic-compatible endpoint)
    ollama_api_key: str = ""
    ollama_api_base: str = "https://ollama.com"
    ollama_model: str = "gemma4:31b-cloud"

    # LLM — Vultr Serverless Inference (disabled stub)
    vultr_llm_enabled: bool = False
    vultr_llm_api_key: str = ""
    vultr_llm_model: str = ""

    # Sandbox limits
    sandbox_memory: str = "512m"
    sandbox_cpus: str = "0.5"
    sandbox_timeout_s: int = 60
    sandbox_image: str = "sandbox-runner:latest"

    # General
    max_task_size_mb: int = 25
    max_retries: int = 3


_settings: Settings | None = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
