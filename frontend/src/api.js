// api.js — thin fetch helpers for the backend.
export const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || `Request failed (${response.status})`);
  }
  return data;
}

const enc = encodeURIComponent;

export const listFiles = () => request("/files");

export const getFile = (name) => request(`/files/${enc(name)}`);

export const createFile = (name, content = "") =>
  request("/files", { method: "POST", body: JSON.stringify({ filename: name, content }) });

export const updateFile = (name, content) =>
  request(`/files/${enc(name)}`, { method: "PUT", body: JSON.stringify({ content }) });

export const aiSuggest = (code) =>
  request("/ai-suggest", { method: "POST", body: JSON.stringify({ code }) });

// payload: { action, code, selection, language?, filename? } -> { result, kind }
export const aiAction = (payload) =>
  request("/ai/action", { method: "POST", body: JSON.stringify(payload) });
