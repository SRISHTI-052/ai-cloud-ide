import { act, fireEvent, render, screen, within } from "@testing-library/react";
import App, { SAVE_DELAY_MS } from "./App";
import { callsTo, mockBackend } from "./testUtils/mockBackend";

afterEach(() => {
  jest.useRealTimers();
  delete global.fetch;
});

const tabNames = () => screen.queryAllByRole("tab").map((t) => within(t).getAllByText(/\S/)[0].textContent);
const sidebarItem = (name) => screen.getAllByText(name).find((el) => el.tagName === "LI");

async function renderApp(files) {
  const backend = mockBackend({ files });
  render(<App />);
  await screen.findByTestId("editor");
  return backend;
}

test("opening files from the sidebar adds tabs once", async () => {
  await renderApp({ "util.js": "// util" });
  expect(tabNames()).toEqual(["App.js"]);

  fireEvent.click(sidebarItem("index.js"));
  fireEvent.click(sidebarItem("util.js"));
  fireEvent.click(sidebarItem("index.js"));

  expect(tabNames()).toEqual(["App.js", "index.js", "util.js"]);
  expect(screen.getByTestId("editor")).toHaveValue("// index.js content");
});

test("closing the active tab activates its neighbour and keeps the file in the sidebar", async () => {
  await renderApp({ "util.js": "// util" });
  fireEvent.click(sidebarItem("index.js"));
  fireEvent.click(sidebarItem("util.js"));
  fireEvent.click(screen.getAllByRole("tab")[1].querySelector("span")); // index.js

  fireEvent.click(screen.getByRole("button", { name: "Close index.js" }));
  expect(tabNames()).toEqual(["App.js", "util.js"]);
  expect(screen.getByTestId("editor")).toHaveValue("// util"); // right neighbour

  fireEvent.click(screen.getByRole("button", { name: "Close util.js" }));
  expect(screen.getByTestId("editor")).toHaveValue("// App.js content"); // left neighbour

  fireEvent.click(screen.getByRole("button", { name: "Close App.js" }));
  expect(tabNames()).toEqual([]);
  expect(screen.queryByTestId("editor")).not.toBeInTheDocument();
  expect(sidebarItem("App.js")).toBeInTheDocument();
});

test("rapid edits are saved once after the debounce delay", async () => {
  const { fetchMock, store } = await renderApp();
  jest.useFakeTimers();

  const editor = screen.getByTestId("editor");
  fireEvent.change(editor, { target: { value: "a" } });
  fireEvent.change(editor, { target: { value: "ab" } });
  fireEvent.change(editor, { target: { value: "abc" } });

  expect(screen.getByTestId("tab-status-App.js")).toHaveTextContent("●");
  expect(callsTo(fetchMock, "PUT", "/files/")).toHaveLength(0);

  await act(async () => {
    jest.advanceTimersByTime(SAVE_DELAY_MS);
  });

  const puts = callsTo(fetchMock, "PUT", "/files/");
  expect(puts).toHaveLength(1);
  expect(JSON.parse(puts[0][1].body)).toEqual({ content: "abc" });
  expect(store["App.js"]).toBe("abc");
  expect(screen.queryByTestId("tab-status-App.js")).not.toBeInTheDocument();
});

test("pending save is flushed when switching files", async () => {
  const { fetchMock, store } = await renderApp();
  jest.useFakeTimers();

  fireEvent.change(screen.getByTestId("editor"), { target: { value: "edited" } });
  await act(async () => {
    fireEvent.click(sidebarItem("index.js"));
  });

  expect(callsTo(fetchMock, "PUT", "/files/App.js")).toHaveLength(1);
  expect(store["App.js"]).toBe("edited");
});

test("new file is created on the backend and opened in a tab", async () => {
  const { store } = await renderApp();

  fireEvent.click(screen.getByRole("button", { name: /new file/i }));

  expect(await screen.findByRole("tab", { name: /NewFile3\.js/ })).toBeInTheDocument();
  expect(store["NewFile3.js"]).toBe("// Start coding here");
});
