// AiActions.js — toolbar for AI actions on the selected code.
import React from "react";
import "./AiActions.css";

export const AI_ACTIONS = [
  { id: "explain", label: "Explain" },
  { id: "fix", label: "Fix" },
  { id: "refactor", label: "Refactor" },
  { id: "write_tests", label: "Write Tests" },
];

function AiActions({ hasSelection, disabled, onAction }) {
  return (
    <div className="ai-actions" role="toolbar" aria-label="AI actions on selection">
      <span className="ai-actions-label">
        {hasSelection ? "Selection:" : "Select code to use AI actions"}
      </span>
      {AI_ACTIONS.map(({ id, label }) => (
        <button
          key={id}
          className="btn ai-action-btn"
          disabled={!hasSelection || disabled}
          onClick={() => onAction(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default AiActions;
