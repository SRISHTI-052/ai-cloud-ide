import pytest
from fastapi.testclient import TestClient

import main
from llm import FakeProvider
from storage import Storage


@pytest.fixture(autouse=True)
def no_real_llm(monkeypatch):
    """Tests must never reach a real LLM: drop any API key and provider overrides."""
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("LLM_PROVIDER", raising=False)
    monkeypatch.delenv("LLM_MODEL", raising=False)
    yield
    main.app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def storage(tmp_path, monkeypatch):
    """Every test gets a fresh SQLite DB in a temp dir; the real DB is never touched."""
    store = Storage(tmp_path / "test.db")
    monkeypatch.setattr(main, "_storage", store)
    return store


@pytest.fixture
def client():
    return TestClient(main.app)


@pytest.fixture
def fake_llm():
    """A FakeProvider wired into the app; set .response to control replies."""
    provider = FakeProvider()
    main.app.dependency_overrides[main.get_llm] = lambda: provider
    return provider
