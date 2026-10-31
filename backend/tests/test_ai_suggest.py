import main
from llm import OpenAIProvider


def test_ai_suggest_returns_suggestion(client, fake_llm):
    fake_llm.response = "better code"

    res = client.post("/ai-suggest", json={"code": "x=1"})

    assert res.status_code == 200
    assert res.json() == {"suggestion": "better code"}
    assert len(fake_llm.calls) == 1
    assert "x=1" in fake_llm.calls[0]["user"]
    assert fake_llm.calls[0]["max_tokens"] == 150


def test_ai_suggest_provider_error_returns_500(client, fake_llm):
    fake_llm.response = RuntimeError("boom")

    res = client.post("/ai-suggest", json={"code": "x=1"})

    assert res.status_code == 500
    assert "boom" in res.json()["detail"]


def test_ai_suggest_without_api_key_returns_503(client):
    # Real OpenAIProvider with no key and no client: must fail before any network call.
    main.app.dependency_overrides[main.get_llm] = lambda: OpenAIProvider(model="gpt-4o-mini")

    res = client.post("/ai-suggest", json={"code": "x=1"})

    assert res.status_code == 503
    assert "OPENAI_API_KEY" in res.json()["detail"]
