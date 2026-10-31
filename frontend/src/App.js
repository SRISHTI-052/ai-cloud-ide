// App.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import debounce from "lodash.debounce";
import Sidebar from "./Sidebar";
import Tabs from "./Tabs";
import SuggestionDiff from "./SuggestionDiff";
import AiActions, { AI_ACTIONS } from "./AiActions";
import { languageFor, testFileNameFor } from "./fileUtils";
import * as api from "./api";
import "./App.css";

export const SAVE_DELAY_MS = 500;

function App() {
  const [files, setFiles] = useState([]); // [{ name, content }] loaded from the backend
  const [loading, setLoading] = useState(true);
  const [openTabs, setOpenTabs] = useState([]); // file names, in tab order
  const [currentFile, setCurrentFile] = useState(null);
  const [saveStatus, setSaveStatus] = useState({}); // name -> "unsaved" | "saving" | "error"

  // Pending AI suggestion awaiting Accept/Reject: { fileName, original, modified, isNew? }.
  // Tied to the file it was requested for, so switching files can't misapply it.
  // isNew: accepting creates `fileName` instead of updating it (used by Write Tests).
  const [review, setReview] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState("");
  const [explanation, setExplanation] = useState(null); // { fileName, text }
  // Current editor selection as character offsets into the current file, or null.
  const [selection, setSelection] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(200); // default width

  const currentFileObj = files.find((f) => f.name === currentFile);

  const setStatus = (name, status) =>
    setSaveStatus((prev) => {
      const next = { ...prev };
      if (status) next[name] = status;
      else delete next[name];
      return next;
    });

  // --- Debounced save ---
  // Only the latest edit is kept; it is written after SAVE_DELAY_MS of inactivity,
  // or immediately when switching/closing files.
  const pendingSave = useRef(null); // { name, content }
  const saveNow = useRef(null);
  saveNow.current = async () => {
    const pending = pendingSave.current;
    if (!pending) return;
    pendingSave.current = null;
    setStatus(pending.name, "saving");
    try {
      await api.updateFile(pending.name, pending.content);
      // A newer edit may have arrived while this one was in flight.
      setStatus(pending.name, pendingSave.current?.name === pending.name ? "unsaved" : null);
    } catch (err) {
      console.error("Error saving file:", err);
      setStatus(pending.name, "error");
      setError(`Failed to save ${pending.name}: ${err.message}`);
    }
  };
  const debouncedSave = useMemo(
    () => debounce(() => saveNow.current(), SAVE_DELAY_MS),
    []
  );
  useEffect(() => () => debouncedSave.flush(), [debouncedSave]);

  const updateContent = (name, content) => {
    if (pendingSave.current && pendingSave.current.name !== name) {
      debouncedSave.flush();
    }
    setFiles((prev) => prev.map((f) => (f.name === name ? { ...f, content } : f)));
    pendingSave.current = { name, content };
    setStatus(name, "unsaved");
    debouncedSave();
  };

  // --- Initial load ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const names = await api.listFiles();
        const loaded = await Promise.all(
          names.map(async (name) => ({ name, content: (await api.getFile(name)).content }))
        );
        if (cancelled) return;
        setFiles(loaded);
        if (loaded.length > 0) {
          setOpenTabs([loaded[0].name]);
          setCurrentFile(loaded[0].name);
        }
      } catch (err) {
        if (!cancelled) setError(`Could not load files from backend: ${err.message}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // --- Editor change ---
  const handleEditorChange = (value) => {
    if (currentFile) updateContent(currentFile, value ?? "");
  };

  // --- AI Suggestion ---
  const getAISuggestion = async () => {
    if (!currentFileObj) return;
    const fileName = currentFileObj.name;
    const original = currentFileObj.content;
    setAiLoading(true);
    setError("");
    try {
      const data = await api.aiSuggest(original);
      setReview({ fileName, original, modified: data.suggestion });
    } catch (err) {
      console.error("Error fetching AI suggestion:", err);
      setError(`Failed to get AI suggestion: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const acceptSuggestion = async () => {
    const accepted = review;
    setReview(null);
    if (!accepted.isNew) {
      updateContent(accepted.fileName, accepted.modified);
      return;
    }
    try {
      await api.createFile(accepted.fileName, accepted.modified);
      setFiles((prev) => [...prev, { name: accepted.fileName, content: accepted.modified }]);
      openFile(accepted.fileName);
    } catch (err) {
      setError(`Failed to create ${accepted.fileName}: ${err.message}`);
    }
  };

  const rejectSuggestion = () => setReview(null);

  // --- Selection-aware AI actions ---
  const runAction = async (action) => {
    if (!currentFileObj || !selection) return;
    const { name, content } = currentFileObj;
    const { start, end } = selection;
    setAiLoading(true);
    setError("");
    setExplanation(null);
    try {
      const data = await api.aiAction({
        action,
        code: content,
        selection: content.slice(start, end),
        language: languageFor(name),
        filename: name,
      });
      if (data.kind === "text") {
        setExplanation({ fileName: name, text: data.result });
      } else if (action === "write_tests") {
        const testName = testFileNameFor(name, files.map((f) => f.name));
        setReview({ fileName: testName, original: "", modified: data.result, isNew: true });
      } else {
        // Replace only the selected range; the rest of the file is untouched.
        const modified = content.slice(0, start) + data.result + content.slice(end);
        setReview({ fileName: name, original: content, modified });
      }
    } catch (err) {
      console.error(`Error running AI action ${action}:`, err);
      setError(`AI action failed: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };
  // Monaco context-menu actions are registered once per editor, so they call the latest runAction.
  const runActionRef = useRef(runAction);
  runActionRef.current = runAction;

  const handleEditorMount = (editor) => {
    editor.onDidChangeCursorSelection(() => {
      const sel = editor.getSelection();
      if (!sel || sel.isEmpty()) {
        setSelection(null);
        return;
      }
      const model = editor.getModel();
      setSelection({
        start: model.getOffsetAt(sel.getStartPosition()),
        end: model.getOffsetAt(sel.getEndPosition()),
      });
    });
    AI_ACTIONS.forEach(({ id, label }) =>
      editor.addAction({
        id: `ai.${id}`,
        label: `AI: ${label}`,
        contextMenuGroupId: "ai",
        precondition: "editorHasSelection",
        run: () => runActionRef.current(id),
      })
    );
  };

  // Offsets belong to one file's content; drop them when the file changes.
  useEffect(() => setSelection(null), [currentFile]);

  // --- Tabs ---
  const openFile = (fileName) => {
    debouncedSave.flush();
    setOpenTabs((prev) => (prev.includes(fileName) ? prev : [...prev, fileName]));
    setCurrentFile(fileName);
  };

  const closeTab = (fileName) => {
    debouncedSave.flush();
    const index = openTabs.indexOf(fileName);
    const remaining = openTabs.filter((name) => name !== fileName);
    setOpenTabs(remaining);
    if (fileName === currentFile) {
      // Activate the tab to the right, else the one to the left, else nothing.
      setCurrentFile(remaining[index] ?? remaining[index - 1] ?? null);
    }
  };

  // --- New file creation ---
  const handleNewFile = async () => {
    const existing = new Set(files.map((f) => f.name));
    let n = files.length + 1;
    while (existing.has(`NewFile${n}.js`)) n += 1;
    const newFileName = `NewFile${n}.js`;
    const content = "// Start coding here";
    try {
      await api.createFile(newFileName, content);
      setFiles((prev) => [...prev, { name: newFileName, content }]);
      openFile(newFileName);
    } catch (err) {
      setError(`Failed to create file: ${err.message}`);
    }
  };

return (
  <div style={{ display: "flex", height: "100vh" }}>
    {/* Sidebar + Resizer */}
    <div
      style={{ width: sidebarWidth, minWidth: 100, position: "relative" }}
      className="sidebar-wrapper"
    >
      <Sidebar
        files={files}
        currentFile={currentFile}
        onFileSelect={openFile}
        onNewFile={handleNewFile}
      />

      {/* Resizer */}
      <div
        className="resizer"
        onMouseDown={(e) => {
          const startX = e.clientX;
          const startWidth = sidebarWidth;

          const onMouseMove = (e) => {
            const newWidth = startWidth + (e.clientX - startX);
            if (newWidth > 100 && newWidth < 500) {
              setSidebarWidth(newWidth);
            }
          };

          const onMouseUp = () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
          };

          document.addEventListener("mousemove", onMouseMove);
          document.addEventListener("mouseup", onMouseUp);
        }}
      />
    </div>

    {/* Editor + Tabs */}
    <div className="editor-container" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <Tabs
        openFiles={openTabs.map((name) => ({ name }))}
        currentFile={currentFile}
        status={saveStatus}
        onTabSelect={openFile}
        onTabClose={closeTab}
      />

      {review ? (
        <SuggestionDiff
          fileName={review.fileName}
          original={review.original}
          modified={review.modified}
          onAccept={acceptSuggestion}
          onReject={rejectSuggestion}
        />
      ) : currentFileObj ? (
        <Editor
          height="65vh"
          defaultLanguage="javascript"
          path={currentFileObj.name}
          value={currentFileObj.content}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            automaticLayout: true,
            minimap: { enabled: false },
            renderValidationDecorations: "off", // disables the red underlines
          }}
        />
      ) : (
        <div className="editor-placeholder">
          {loading ? "Loading files…" : "Open a file from the explorer."}
        </div>
      )}

      <AiActions
        hasSelection={Boolean(currentFileObj && selection && !review)}
        disabled={aiLoading}
        onAction={runAction}
      />

      <button
        onClick={getAISuggestion}
        className="btn"
        disabled={!currentFileObj || aiLoading || review !== null}
      >
        {aiLoading ? "Getting suggestion…" : "Get AI Suggestion"}
      </button>

      <div className="output">
        <h4>💡 AI Suggestion Output</h4>
        {error ? (
          <pre className="error" role="alert">{error}</pre>
        ) : review ? (
          <pre>
            {review.isNew
              ? `Accept to create ${review.fileName}, or Reject.`
              : "Review the suggestion above, then Accept or Reject."}
          </pre>
        ) : explanation ? (
          <pre data-testid="explanation">
            {`Explanation (${explanation.fileName}):\n\n${explanation.text}`}
          </pre>
        ) : (
          <pre />
        )}
      </div>
    </div>
  </div>
);
}

export default App;
