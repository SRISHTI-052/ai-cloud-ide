// Monaco can't run in jsdom, so tests use plain textareas instead.
// The fake editor passed to onMount mirrors the small slice of the Monaco API
// the app uses: selections (positions are plain character offsets), selection
// change listeners, getModel().getOffsetAt, and addAction.
import React, { useEffect, useRef } from "react";

// Every fake editor created, so tests can inspect what the app registered.
export const __editors = [];

function createFakeEditor() {
  const listeners = [];
  const editor = {
    selection: { start: 0, end: 0 },
    actions: [],
    onDidChangeCursorSelection(cb) {
      listeners.push(cb);
      return { dispose: () => listeners.splice(listeners.indexOf(cb), 1) };
    },
    getSelection() {
      const { start, end } = editor.selection;
      return {
        getStartPosition: () => start,
        getEndPosition: () => end,
        isEmpty: () => start === end,
      };
    },
    getModel() {
      return { getOffsetAt: (position) => position };
    },
    addAction(action) {
      editor.actions.push(action);
      return { dispose: () => {} };
    },
    _select(start, end) {
      editor.selection = { start, end };
      listeners.forEach((cb) => cb());
    },
  };
  __editors.push(editor);
  return editor;
}

function Editor({ value, onChange, onMount }) {
  const editorRef = useRef(null);
  if (!editorRef.current) editorRef.current = createFakeEditor();

  useEffect(() => {
    if (onMount) onMount(editorRef.current, {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <textarea
      data-testid="editor"
      value={value}
      onChange={(e) => onChange && onChange(e.target.value)}
      onSelect={(e) => editorRef.current._select(e.target.selectionStart, e.target.selectionEnd)}
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
