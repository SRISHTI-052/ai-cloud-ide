// fileUtils.js — helpers based on file names.
const LANGUAGES = {
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  json: "json",
  css: "css",
  html: "html",
  md: "markdown",
};

export function languageFor(fileName) {
  const ext = fileName.includes(".") ? fileName.split(".").pop().toLowerCase() : "";
  return LANGUAGES[ext] || "plaintext";
}

// Conventional test file name for `fileName`, made unique against `existingNames`.
// App.js -> App.test.js, utils.py -> test_utils.py
export function testFileNameFor(fileName, existingNames) {
  const dot = fileName.lastIndexOf(".");
  const base = dot > 0 ? fileName.slice(0, dot) : fileName;
  const ext = dot > 0 ? fileName.slice(dot + 1) : "";
  const make = (suffix) =>
    ext === "py" ? `test_${base}${suffix}.py` : `${base}${suffix}.test${ext ? `.${ext}` : ""}`;

  const taken = new Set(existingNames);
  let name = make("");
  for (let n = 2; taken.has(name); n += 1) name = make(n);
  return name;
}
