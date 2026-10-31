// Tabs.js
import React from "react";
import "./Tabs.css";

function Tabs({ openFiles, currentFile, onTabSelect, onTabClose }) {
  return (
    <div className="tabs">
      {openFiles.map((file) => (
        <div
          key={file.name}
          className={`tab ${file.name === currentFile ? "active" : ""}`}
        >
          <span onClick={() => onTabSelect(file.name)}>{file.name}</span>
          {onTabClose && (
            <button className="close-btn" onClick={() => onTabClose(file.name)}>
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default Tabs;
