import os
from typing import Optional

from .base import LLMProvider, ProviderConfigError


class OpenAIProvider(LLMProvider):
    name = "openai"

    def __init__(self, model: str, api_key: Optional[str] = None, client=None):
        super().__init__(model)
        self._api_key = api_key
        self._client = client

    def _get_client(self):
        # Created on first use so the app can start without a key.
        if self._client is None:
            api_key = self._api_key or os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ProviderConfigError("OPENAI_API_KEY is not configured")
            from openai import OpenAI

            self._client = OpenAI(api_key=api_key)
        return self._client

    def complete(self, system: str, user: str, *, max_tokens: Optional[int] = None) -> str:
        kwargs = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        }
        if max_tokens is not None:
            kwargs["max_tokens"] = max_tokens
        response = self._get_client().chat.completions.create(**kwargs)
        return response.choices[0].message.content
