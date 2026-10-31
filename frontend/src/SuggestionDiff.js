// SuggestionDiff.js
import React from "react";
import { DiffEditor } from "@monaco-editor/react";
import "./SuggestionDiff.css";

function SuggestionDiff({ fileName, original, modified, onAccept, onReject }) {
  return (
    <div className="suggestion-diff">
      <div className="suggestion-diff-header">
        <span>
          AI suggestion for <strong>{fileName}</strong> (original ← → suggested)
        </span>
        <div className="suggestion-diff-actions">
          <button className="btn accept-btn" onClick={onAccept}>
            Accept
          </button>
          <button className="btn reject-btn" onClick={onReject}>
            Reject
          </button>
        </div>
      </div>
      <DiffEditor
        height="60vh"
        language="javascript"
        original={original}
        modified={modified}
        theme="vs-dark"
        options={{
          readOnly: true,
          automaticLayout: true,
          minimap: { enabled: false },
          renderSideBySide: true,
        }}
      />
    </div>
  );
}

export default SuggestionDiff;
