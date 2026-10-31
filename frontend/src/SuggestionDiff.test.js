import { render, screen, fireEvent } from "@testing-library/react";
import App from "./App";

function mockFetchOnce(body, ok = true, status = 200) {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  });
}

afterEach(() => {
  delete global.fetch;
});

async function requestSuggestion() {
  fireEvent.click(screen.getByRole("button", { name: /get ai suggestion/i }));
  return screen.findByTestId("diff-editor");
}

test("shows a diff and leaves the file unchanged until accepted", async () => {
  mockFetchOnce({ suggestion: "// improved" });
  render(<App />);

  await requestSuggestion();

  expect(screen.getByTestId("diff-original")).toHaveTextContent("// App.js content");
  expect(screen.getByTestId("diff-modified")).toHaveTextContent("// improved");
  expect(global.fetch).toHaveBeenCalledWith(
    "http://127.0.0.1:8000/ai-suggest",
    expect.objectContaining({ body: JSON.stringify({ code: "// App.js content" }) })
  );

  // Reject: diff closes, editor still has the original content.
  fireEvent.click(screen.getByRole("button", { name: /reject/i }));
  expect(screen.queryByTestId("diff-editor")).not.toBeInTheDocument();
  expect(screen.getByTestId("editor")).toHaveValue("// App.js content");
});

test("accept applies the suggestion to the file", async () => {
  mockFetchOnce({ suggestion: "// improved" });
  render(<App />);

  await requestSuggestion();
  fireEvent.click(screen.getByRole("button", { name: /accept/i }));

  expect(screen.queryByTestId("diff-editor")).not.toBeInTheDocument();
  expect(screen.getByTestId("editor")).toHaveValue("// improved");
});

test("accept applies to the file the suggestion was requested for", async () => {
  mockFetchOnce({ suggestion: "// improved" });
  render(<App />);

  await requestSuggestion();
  // Switch to another file while the suggestion is open, then accept.
  fireEvent.click(screen.getAllByText("index.js")[0]);
  fireEvent.click(screen.getByRole("button", { name: /accept/i }));

  expect(screen.getByTestId("editor")).toHaveValue("// index.js content");
  fireEvent.click(screen.getAllByText("App.js")[0]);
  expect(screen.getByTestId("editor")).toHaveValue("// improved");
});

test("shows errors inline instead of alert", async () => {
  mockFetchOnce({ detail: "OPENAI_API_KEY is not configured" }, false, 503);
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: /get ai suggestion/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent("OPENAI_API_KEY is not configured");
  expect(screen.queryByTestId("diff-editor")).not.toBeInTheDocument();
  expect(screen.getByTestId("editor")).toHaveValue("// App.js content");
});
