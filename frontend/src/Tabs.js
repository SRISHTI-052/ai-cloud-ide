// Tabs.js
import React from "react";
import "./Tabs.css";

const STATUS_LABELS = {
  unsaved: { symbol: "●", title: "Unsaved changes" },
  saving: { symbol: "…", title: "Saving" },
  error: { symbol: "!", title: "Save failed" },
};

function Tabs({ openFiles, currentFile, status = {}, onTabSelect, onTabClose }) {
  return (
    <div className="tabs" role="tablist">
      {openFiles.map((file) => {
        const fileStatus = STATUS_LABELS[status[file.name]];
        return (
          <div
            key={file.name}
            role="tab"
            aria-selected={file.name === currentFile}
            className={`tab ${file.name === currentFile ? "active" : ""}`}
          >
            <span onClick={() => onTabSelect(file.name)}>{file.name}</span>
            {fileStatus && (
              <span
                className={`tab-status ${status[file.name]}`}
                title={fileStatus.title}
                data-testid={`tab-status-${file.name}`}
              >
                {fileStatus.symbol}
              </span>
            )}
            {onTabClose && (
              <button
                className="close-btn"
                aria-label={`Close ${file.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(file.name);
                }}
              >
                ×
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default Tabs;
