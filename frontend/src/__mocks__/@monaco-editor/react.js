// Monaco can't run in jsdom, so tests use plain textareas instead.
import React from "react";

function Editor({ value, onChange }) {
  return (
    <textarea
      data-testid="editor"
      value={value}
      onChange={(e) => onChange && onChange(e.target.value)}
    />
  );
}

export function DiffEditor({ original, modified }) {
  return (
    <div data-testid="diff-editor">
      <pre data-testid="diff-original">{original}</pre>
      <pre data-testid="diff-modified">{modified}</pre>
    </div>
  );
}

export default Editor;
