"""Prompt templates for selection-aware AI actions."""
from typing import Literal, Optional

Action = Literal["explain", "fix", "refactor", "write_tests"]

SYSTEM_PROMPT = (
    "You are an AI coding assistant embedded in a code editor. "
    "When asked for code, reply with code only: no Markdown fences and no commentary."
)

INSTRUCTIONS = {
    "explain": (
        "Explain what the selected code does, step by step, in plain language. "
        "Mention any bugs or risks you notice. Reply in prose, not code."
    ),
    "fix": (
        "Fix any bugs in the selected code. Return only the corrected replacement "
        "for the selection, preserving its indentation and behaviour otherwise."
    ),
    "refactor": (
        "Refactor the selected code for readability and maintainability without "
        "changing its behaviour. Return only the replacement for the selection, "
        "preserving its indentation."
    ),
    "write_tests": (
        "Write unit tests for the selected code using the idiomatic test framework "
        "for the language (e.g. Jest for JavaScript, pytest for Python). "
        "Return only the contents of a new test file."
    ),
}

RESULT_KIND = {
    "explain": "text",
    "fix": "code",
    "refactor": "code",
    "write_tests": "code",
}


def build_prompt(
    action: Action,
    code: str,
    selection: str,
    language: Optional[str] = None,
    filename: Optional[str] = None,
) -> str:
    """User message for an action: instruction, the selection, and the whole file as context."""
    about = ", ".join(
        part for part in (f"file: {filename}" if filename else "", f"language: {language}" if language else "") if part
    )
    header = f"Task: {INSTRUCTIONS[action]}"
    if about:
        header += f"\n({about})"
    return (
        f"{header}\n\n"
        f"Selected code:\n<selection>\n{selection}\n</selection>\n\n"
        f"Full file for context:\n<file>\n{code}\n</file>"
    )
