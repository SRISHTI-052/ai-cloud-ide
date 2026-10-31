import os
from typing import Optional

from .base import LLMProvider, LLMProviderError, ProviderConfigError
from .fake_provider import FakeProvider
from .openai_provider import OpenAIProvider

DEFAULT_PROVIDER = "openai"
DEFAULT_MODEL = "gpt-4o-mini"

PROVIDERS = {
    "openai": OpenAIProvider,
    "fake": FakeProvider,
}


def create_provider(name: Optional[str] = None, model: Optional[str] = None) -> LLMProvider:
    """Build a provider from arguments, falling back to LLM_PROVIDER / LLM_MODEL env vars."""
    name = (name or os.getenv("LLM_PROVIDER") or DEFAULT_PROVIDER).strip().lower()
    model = model or os.getenv("LLM_MODEL") or DEFAULT_MODEL
    if name not in PROVIDERS:
        raise ValueError(
            f"Unknown LLM_PROVIDER '{name}'. Expected one of: {', '.join(sorted(PROVIDERS))}"
        )
    return PROVIDERS[name](model=model)


__all__ = [
    "LLMProvider",
    "LLMProviderError",
    "ProviderConfigError",
    "OpenAIProvider",
    "FakeProvider",
    "create_provider",
]
