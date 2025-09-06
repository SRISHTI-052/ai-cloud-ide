import React, { useState } from "react";
import Editor from "@monaco-editor/react";

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [code, setCode] = useState("// Start coding here");

  const handleEditorChange = (value, event) => {
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
      setCode(data.suggestion); // Update editor with AI suggestion
    } catch (error) {
      console.error("Error fetching AI suggestion:", error);
      alert("Failed to get AI suggestion");
    }
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <Editor
        height="90%"
        defaultLanguage="javascript"
        value={code}
        onChange={handleEditorChange}
      />
      <button onClick={getAISuggestion} style={{ height: "10%" }}>
        Get AI Suggestion
      </button>
    </div>
  );
}

export default App;
