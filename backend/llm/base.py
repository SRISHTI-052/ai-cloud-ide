from abc import ABC, abstractmethod
from typing import Optional


class LLMProviderError(Exception):
    """Raised when the provider cannot produce a completion."""


class ProviderConfigError(LLMProviderError):
    """Raised when the provider is misconfigured (e.g. missing API key)."""


class LLMProvider(ABC):
    """Minimal interface every LLM backend implements."""

    name: str = "base"

    def __init__(self, model: str):
        self.model = model

    @abstractmethod
    def complete(self, system: str, user: str, *, max_tokens: Optional[int] = None) -> str:
        """Return the model's reply to a single system + user message."""
