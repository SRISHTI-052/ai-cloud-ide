import { render, screen } from "@testing-library/react";
import App from "./App";
import { mockBackend } from "./testUtils/mockBackend";

afterEach(() => {
  delete global.fetch;
});

test("loads files from the backend and opens the first one", async () => {
  mockBackend();
  render(<App />);

  expect(await screen.findByTestId("editor")).toHaveValue("// App.js content");
  expect(screen.getByRole("button", { name: /get ai suggestion/i })).toBeEnabled();
  expect(screen.getAllByText("index.js").length).toBeGreaterThan(0);
});

test("shows an error when the backend is unreachable", async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error("Failed to fetch"));
  render(<App />);

  expect(await screen.findByRole("alert")).toHaveTextContent(/could not load files/i);
  expect(screen.getByRole("button", { name: /get ai suggestion/i })).toBeDisabled();
});
