import pytest
from fastapi.testclient import TestClient

import main

INITIAL_FILES = dict(main.file_store)


@pytest.fixture(autouse=True)
def no_openai_key(monkeypatch):
    """Tests must never reach OpenAI: drop any real key and reset the cached client."""
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setattr(main, "_client", None)


@pytest.fixture(autouse=True)
def reset_file_store():
    main.file_store.clear()
    main.file_store.update(INITIAL_FILES)
    yield
    main.file_store.clear()
    main.file_store.update(INITIAL_FILES)


@pytest.fixture
def client():
    return TestClient(main.app)
