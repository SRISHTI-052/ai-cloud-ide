import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders the editor, file list and AI button", () => {
  render(<App />);
  expect(screen.getByRole("button", { name: /get ai suggestion/i })).toBeInTheDocument();
  expect(screen.getByTestId("editor")).toBeInTheDocument();
  expect(screen.getAllByText("package.json").length).toBeGreaterThan(0);
});
