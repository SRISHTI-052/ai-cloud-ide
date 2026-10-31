from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from llm import FakeProvider, OpenAIProvider, ProviderConfigError, create_provider


def test_default_provider_is_openai_with_default_model():
    provider = create_provider()
    assert isinstance(provider, OpenAIProvider)
    assert provider.model == "gpt-4o-mini"


def test_provider_selected_from_env(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "fake")
    assert isinstance(create_provider(), FakeProvider)


def test_model_selected_from_env(monkeypatch):
    monkeypatch.setenv("LLM_MODEL", "gpt-4.1")
    assert create_provider().model == "gpt-4.1"


def test_provider_name_is_case_insensitive(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", " FAKE ")
    assert isinstance(create_provider(), FakeProvider)


def test_unknown_provider_raises_clear_error():
    with pytest.raises(ValueError, match="Unknown LLM_PROVIDER 'nope'"):
        create_provider("nope")


def test_fake_provider_records_calls_and_supports_callables():
    fake = FakeProvider(response=lambda system, user: user.upper())
    assert fake.complete("sys", "hi", max_tokens=5) == "HI"
    assert fake.calls == [{"system": "sys", "user": "hi", "max_tokens": 5}]


def test_openai_provider_sends_model_and_messages():
    client = MagicMock()
    client.chat.completions.create.return_value = SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content="ok"))]
    )
    provider = OpenAIProvider(model="gpt-test", client=client)

    assert provider.complete("sys", "user msg", max_tokens=10) == "ok"
    client.chat.completions.create.assert_called_once_with(
        model="gpt-test",
        messages=[
            {"role": "system", "content": "sys"},
            {"role": "user", "content": "user msg"},
        ],
        max_tokens=10,
    )


def test_openai_provider_without_key_raises_config_error():
    with pytest.raises(ProviderConfigError):
        OpenAIProvider(model="gpt-4o-mini").complete("s", "u")
