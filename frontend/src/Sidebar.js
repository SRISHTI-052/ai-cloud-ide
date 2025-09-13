// Sidebar.js
import React from "react";
import "./Sidebar.css";

function Sidebar({ files, currentFile, onFileSelect, onNewFile }) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>Explorer</h3>
        <button onClick={onNewFile} className="new-file-btn">
          + New File
        </button>
      </div>

      <ul className="file-list">
        {files.map((file) => (
          <li
            key={file.name}
            className={`file ${file.name === currentFile ? "active" : ""}`}
            onClick={() => onFileSelect(file.name)}
          >
            {file.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Sidebar;
