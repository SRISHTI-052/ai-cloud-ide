from typing import Callable, List, Optional, Union

from .base import LLMProvider

Response = Union[str, Callable[[str, str], str], Exception]


class FakeProvider(LLMProvider):
    """Deterministic provider for tests and offline development. Records every call."""

    name = "fake"

    def __init__(self, model: str = "fake-model", response: Response = "fake suggestion"):
        super().__init__(model)
        self.response = response
        self.calls: List[dict] = []

    def complete(self, system: str, user: str, *, max_tokens: Optional[int] = None) -> str:
        self.calls.append({"system": system, "user": user, "max_tokens": max_tokens})
        if isinstance(self.response, Exception):
            raise self.response
        if callable(self.response):
            return self.response(system, user)
        return self.response
