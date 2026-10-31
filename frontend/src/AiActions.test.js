import { act, fireEvent, render, screen } from "@testing-library/react";
// Resolves to src/__mocks__/@monaco-editor/react.js, the same instance App uses.
import { __editors } from "@monaco-editor/react";
import App from "./App";
import { languageFor, testFileNameFor } from "./fileUtils";
import { callsTo, mockBackend } from "./testUtils/mockBackend";

const CODE = "function add(a, b) {\n  return a - b;\n}\nconsole.log(add(1, 2));\n";
const SELECTED = "return a - b;";

afterEach(() => {
  delete global.fetch;
});

async function renderWithAction(response) {
  const backend = mockBackend({
    files: { "App.js": CODE },
    ai: { "/ai/action": () => ({ body: response }) },
  });
  render(<App />);
  await screen.findByTestId("editor");
  return backend;
}

function selectText(text) {
  const editor = screen.getByTestId("editor");
  const start = editor.value.indexOf(text);
  editor.setSelectionRange(start, start + text.length);
  fireEvent.select(editor);
}

const actionButton = (name) => screen.getByRole("button", { name });

test("actions are disabled until code is selected", async () => {
  await renderWithAction({ result: "", kind: "text" });

  for (const name of ["Explain", "Fix", "Refactor", "Write Tests"]) {
    expect(actionButton(name)).toBeDisabled();
  }
  selectText(SELECTED);
  for (const name of ["Explain", "Fix", "Refactor", "Write Tests"]) {
    expect(actionButton(name)).toBeEnabled();
  }
});

test.each([
  ["Explain", "explain"],
  ["Fix", "fix"],
  ["Refactor", "refactor"],
  ["Write Tests", "write_tests"],
])("%s sends the selection, file and language", async (label, action) => {
  const { fetchMock } = await renderWithAction({ result: "x", kind: "text" });
  selectText(SELECTED);

  fireEvent.click(actionButton(label));
  await screen.findByTestId("explanation");

  const [[, options]] = callsTo(fetchMock, "POST", "/ai/action");
  expect(JSON.parse(options.body)).toEqual({
    action,
    code: CODE,
    selection: SELECTED,
    language: "javascript",
    filename: "App.js",
  });
});

test("Explain shows text in the output panel and leaves the file unchanged", async () => {
  await renderWithAction({ result: "It subtracts instead of adding.", kind: "text" });
  selectText(SELECTED);

  fireEvent.click(actionButton("Explain"));

  expect(await screen.findByTestId("explanation")).toHaveTextContent(
    "It subtracts instead of adding."
  );
  expect(screen.queryByTestId("diff-editor")).not.toBeInTheDocument();
  expect(screen.getByTestId("editor")).toHaveValue(CODE);
});

test("Fix shows a diff and accept replaces only the selection", async () => {
  const { store } = await renderWithAction({ result: "return a + b;", kind: "code" });
  selectText(SELECTED);

  fireEvent.click(actionButton("Fix"));
  await screen.findByTestId("diff-editor");

  const expected = CODE.replace(SELECTED, "return a + b;");
  expect(screen.getByTestId("diff-original").textContent).toBe(CODE);
  expect(screen.getByTestId("diff-modified").textContent).toBe(expected);
  expect(store["App.js"]).toBe(CODE); // nothing saved before accept

  fireEvent.click(actionButton(/accept/i));
  expect(screen.getByTestId("editor")).toHaveValue(expected);
});

test("Refactor can be rejected without changing the file", async () => {
  await renderWithAction({ result: "return b - a;", kind: "code" });
  selectText(SELECTED);

  fireEvent.click(actionButton("Refactor"));
  await screen.findByTestId("diff-editor");
  fireEvent.click(actionButton(/reject/i));

  expect(screen.getByTestId("editor")).toHaveValue(CODE);
});

test("Write Tests offers a new test file and accept creates it", async () => {
  const { store } = await renderWithAction({ result: "test('adds', () => {});", kind: "code" });
  selectText(SELECTED);

  fireEvent.click(actionButton("Write Tests"));
  await screen.findByTestId("diff-editor");
  expect(screen.getByText(/Accept to create App\.test\.js/)).toBeInTheDocument();

  fireEvent.click(actionButton(/accept/i));

  expect(await screen.findByRole("tab", { name: /App\.test\.js/ })).toBeInTheDocument();
  expect(store["App.test.js"]).toBe("test('adds', () => {});");
  expect(store["App.js"]).toBe(CODE);
});

test("selection is cleared when switching files", async () => {
  await renderWithAction({ result: "", kind: "text" });
  selectText(SELECTED);
  expect(actionButton("Fix")).toBeEnabled();

  fireEvent.click(screen.getAllByText("index.js").find((el) => el.tagName === "LI"));

  expect(actionButton("Fix")).toBeDisabled();
});

test("context menu actions are registered and run against the selection", async () => {
  const { fetchMock } = await renderWithAction({ result: "return a + b;", kind: "code" });
  const editor = __editors[__editors.length - 1];

  expect(editor.actions.map((a) => a.id)).toEqual([
    "ai.explain",
    "ai.fix",
    "ai.refactor",
    "ai.write_tests",
  ]);
  expect(editor.actions.every((a) => a.precondition === "editorHasSelection")).toBe(true);

  selectText(SELECTED);
  await act(async () => {
    editor.actions.find((a) => a.id === "ai.fix").run();
  });

  const [[, options]] = callsTo(fetchMock, "POST", "/ai/action");
  expect(JSON.parse(options.body)).toMatchObject({ action: "fix", selection: SELECTED });
  expect(await screen.findByTestId("diff-editor")).toBeInTheDocument();
});

describe("fileUtils", () => {
  test("languageFor maps extensions", () => {
    expect(languageFor("a.py")).toBe("python");
    expect(languageFor("a.tsx")).toBe("typescript");
    expect(languageFor("Makefile")).toBe("plaintext");
  });

  test("testFileNameFor follows language conventions and avoids collisions", () => {
    expect(testFileNameFor("App.js", [])).toBe("App.test.js");
    expect(testFileNameFor("utils.py", [])).toBe("test_utils.py");
    expect(testFileNameFor("App.js", ["App.test.js"])).toBe("App2.test.js");
  });
});
