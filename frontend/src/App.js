// App.js
import React, { useState } from "react";
import Editor from "@monaco-editor/react";
import "./App.css"; // import styles

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [code, setCode] = useState("// Start coding here");
  const [suggestion, setSuggestion] = useState("");

  const handleEditorChange = (value) => {
    setCode(value);
  };

  const getAISuggestion = async () => {
    try {
      const response = await fetch(`${API_URL}/ai-suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();
      setSuggestion(data.suggestion);
      setCode(data.suggestion); // overwrite editor with AI suggestion
    } catch (error) {
      console.error("Error fetching AI suggestion:", error);
      alert("Failed to get AI suggestion");
    }
  };

  return (
    <div className="app">
      {/* Sidebar */}
      <div className="sidebar">
        <h3>Explorer</h3>
        <ul>
          <li>📁 src</li>
          <ul>
            <li>📄 App.js</li>
            <li>📄 index.js</li>
          </ul>
          <li>📄 package.json</li>
        </ul>
      </div>

      {/* Main editor */}
      <div className="editor-container">
        <Editor
          height="70vh"
          defaultLanguage="javascript"
          value={code}
          onChange={handleEditorChange}
          theme="vs-dark"
        />
        <button onClick={getAISuggestion} className="btn">
          Get AI Suggestion
        </button>

        {/* AI output panel */}
        <div className="output">
          <h4>💡 AI Suggestion Output</h4>
          <pre>{suggestion}</pre>
        </div>
      </div>
    </div>
  );
}

export default App;
