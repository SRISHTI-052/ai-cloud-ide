// App.js
import React, { useState } from "react";
import Editor from "@monaco-editor/react";
import Sidebar from "./Sidebar"; 
import Tabs from "./Tabs";
import SuggestionDiff from "./SuggestionDiff";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [files, setFiles] = useState([
    { name: "App.js", content: "// App.js content" },
    { name: "index.js", content: "// index.js content" },
    { name: "package.json", content: "{\n  \"name\": \"my-app\"\n}" },
  ]);

  const [currentFile, setCurrentFile] = useState("App.js");
  // Pending AI suggestion awaiting Accept/Reject: { fileName, original, modified }.
  // Tied to the file it was requested for, so switching files can't misapply it.
  const [review, setReview] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [sidebarWidth, setSidebarWidth] = useState(200); // default width

  const currentFileObj = files.find((f) => f.name === currentFile);

  // --- Editor change ---
  const handleEditorChange = (value) => {
    setFiles(
      files.map((file) =>
        file.name === currentFile ? { ...file, content: value } : file
      )
    );
  };

  // --- AI Suggestion ---
  const getAISuggestion = async () => {
    if (!currentFileObj) return;
    const fileName = currentFileObj.name;
    const original = currentFileObj.content;
    setAiLoading(true);
    setAiError("");
    try {
      const response = await fetch(`${API_URL}/ai-suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: original }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || `Request failed (${response.status})`);
      }
      setReview({ fileName, original, modified: data.suggestion });
    } catch (error) {
      console.error("Error fetching AI suggestion:", error);
      setAiError(`Failed to get AI suggestion: ${error.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const acceptSuggestion = () => {
    setFiles((prev) =>
      prev.map((file) =>
        file.name === review.fileName ? { ...file, content: review.modified } : file
      )
    );
    setReview(null);
  };

  const rejectSuggestion = () => setReview(null);

  // --- File selection ---
  const handleFileSelect = (fileName) => {
    setCurrentFile(fileName);
  };

  // --- New file creation ---
  const handleNewFile = () => {
    const newFileName = `NewFile${files.length + 1}.js`;
    setFiles([...files, { name: newFileName, content: "// Start coding here" }]);
    setCurrentFile(newFileName);
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
        onFileSelect={handleFileSelect}
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
        openFiles={files}
        currentFile={currentFile}
        onTabSelect={handleFileSelect}
      />

      {review ? (
        <SuggestionDiff
          fileName={review.fileName}
          original={review.original}
          modified={review.modified}
          onAccept={acceptSuggestion}
          onReject={rejectSuggestion}
        />
      ) : (
        <Editor
          height="65vh"
          defaultLanguage="javascript"
          value={currentFileObj?.content || ""}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            automaticLayout: true,
            minimap: { enabled: false },
            renderValidationDecorations: "off", // disables the red underlines
          }}
        />
      )}

      <button
        onClick={getAISuggestion}
        className="btn"
        disabled={aiLoading || review !== null}
      >
        {aiLoading ? "Getting suggestion…" : "Get AI Suggestion"}
      </button>

      <div className="output">
        <h4>💡 AI Suggestion Output</h4>
        {aiError ? (
          <pre className="error" role="alert">{aiError}</pre>
        ) : (
          <pre>{review ? "Review the suggestion above, then Accept or Reject." : ""}</pre>
        )}
      </div>
    </div>
  </div>
);
}

export default App;
