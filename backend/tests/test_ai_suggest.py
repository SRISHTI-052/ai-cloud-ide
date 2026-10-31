from types import SimpleNamespace
from unittest.mock import MagicMock

import main


def fake_openai_client(content=None, error=None):
    fake = MagicMock()
    if error:
        fake.chat.completions.create.side_effect = error
    else:
        fake.chat.completions.create.return_value = SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=content))]
        )
    return fake


def test_ai_suggest_returns_suggestion(client, monkeypatch):
    fake = fake_openai_client(content="better code")
    monkeypatch.setattr(main, "_client", fake)

    res = client.post("/ai-suggest", json={"code": "x=1"})

    assert res.status_code == 200
    assert res.json() == {"suggestion": "better code"}
    messages = fake.chat.completions.create.call_args.kwargs["messages"]
    assert "x=1" in messages[-1]["content"]


def test_ai_suggest_upstream_error_returns_500(client, monkeypatch):
    monkeypatch.setattr(main, "_client", fake_openai_client(error=RuntimeError("boom")))

    res = client.post("/ai-suggest", json={"code": "x=1"})

    assert res.status_code == 500
    assert "boom" in res.json()["detail"]


def test_ai_suggest_without_api_key_returns_503(client):
    res = client.post("/ai-suggest", json={"code": "x=1"})

    assert res.status_code == 503
    assert "OPENAI_API_KEY" in res.json()["detail"]
