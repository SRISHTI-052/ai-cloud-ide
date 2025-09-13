// App.js
import React, { useState } from "react";
import Editor from "@monaco-editor/react";
import Sidebar from "./Sidebar"; 
import Tabs from "./Tabs";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [files, setFiles] = useState([
    { name: "App.js", content: "// App.js content" },
    { name: "index.js", content: "// index.js content" },
    { name: "package.json", content: "{\n  \"name\": \"my-app\"\n}" },
  ]);

  const [currentFile, setCurrentFile] = useState("App.js");
  const [suggestion, setSuggestion] = useState("");
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
    try {
      const response = await fetch(`${API_URL}/ai-suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: currentFileObj.content }),
      });
      const data = await response.json();
      setSuggestion(data.suggestion);

      setFiles(
        files.map((file) =>
          file.name === currentFile ? { ...file, content: data.suggestion } : file
        )
      );
    } catch (error) {
      console.error("Error fetching AI suggestion:", error);
      alert("Failed to get AI suggestion");
    }
  };

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

  // --- Sidebar resizing ---
  let startX;
  let startWidth;

  const startResizing = (e) => {
    startX = e.clientX;
    startWidth = sidebarWidth;
    document.addEventListener("mousemove", resize);
    document.addEventListener("mouseup", stopResizing);
  };

  const resize = (e) => {
    const newWidth = startWidth + (e.clientX - startX);
    if (newWidth > 100 && newWidth < 500) {
      setSidebarWidth(newWidth);
    }
  };

  const stopResizing = () => {
    document.removeEventListener("mousemove", resize);
    document.removeEventListener("mouseup", stopResizing);
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

      <Editor
        height="65vh"
        defaultLanguage="javascript"
        value={currentFileObj?.content || ""}
        onChange={handleEditorChange}
        theme="vs-dark"
      />

      <button onClick={getAISuggestion} className="btn">
        Get AI Suggestion
      </button>

      <div className="output">
        <h4>💡 AI Suggestion Output</h4>
        <pre>{suggestion}</pre>
      </div>
    </div>
  </div>
);
}

export default App;
