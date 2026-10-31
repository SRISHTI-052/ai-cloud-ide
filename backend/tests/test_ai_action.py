import pytest

from ai_actions import INSTRUCTIONS, SYSTEM_PROMPT

CODE = "def add(a, b):\n    return a - b\n\nprint(add(1, 2))\n"
SELECTION = "def add(a, b):\n    return a - b"


def post_action(client, action, **overrides):
    body = {
        "action": action,
        "code": CODE,
        "selection": SELECTION,
        "language": "python",
        "filename": "math.py",
        **overrides,
    }
    return client.post("/ai/action", json=body)


@pytest.mark.parametrize(
    "action, kind",
    [("explain", "text"), ("fix", "code"), ("refactor", "code"), ("write_tests", "code")],
)
def test_each_action_builds_its_prompt(client, fake_llm, action, kind):
    fake_llm.response = "result"

    res = post_action(client, action)

    assert res.status_code == 200
    assert res.json() == {"result": "result", "kind": kind}
    assert len(fake_llm.calls) == 1
    call = fake_llm.calls[0]
    assert call["system"] == SYSTEM_PROMPT
    assert INSTRUCTIONS[action] in call["user"]
    assert f"<selection>\n{SELECTION}\n</selection>" in call["user"]
    assert f"<file>\n{CODE}\n</file>" in call["user"]
    assert "file: math.py" in call["user"]
    assert "language: python" in call["user"]


def test_actions_use_distinct_instructions():
    assert len(set(INSTRUCTIONS.values())) == len(INSTRUCTIONS)


def test_language_and_filename_are_optional(client, fake_llm):
    res = client.post("/ai/action", json={"action": "fix", "code": CODE, "selection": SELECTION})

    assert res.status_code == 200
    assert "file:" not in fake_llm.calls[0]["user"]


def test_invalid_action_is_rejected(client, fake_llm):
    res = post_action(client, "delete_everything")

    assert res.status_code == 422
    assert fake_llm.calls == []


def test_empty_selection_is_rejected(client, fake_llm):
    res = post_action(client, "fix", selection="   ")

    assert res.status_code == 422
    assert fake_llm.calls == []


def test_code_fences_are_stripped(client, fake_llm):
    fake_llm.response = "```python\ndef add(a, b):\n    return a + b\n```"

    res = post_action(client, "fix")

    assert res.json()["result"] == "def add(a, b):\n    return a + b"


def test_explain_text_is_not_altered(client, fake_llm):
    fake_llm.response = "It adds `a` and `b`... but subtracts.\n```py\nx\n```\nmore"

    res = post_action(client, "explain")

    assert res.json()["result"] == fake_llm.response


def test_provider_error_returns_500(client, fake_llm):
    fake_llm.response = RuntimeError("upstream down")

    res = post_action(client, "refactor")

    assert res.status_code == 500
    assert "upstream down" in res.json()["detail"]
