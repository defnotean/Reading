import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: vi.fn(() => {
    throw new TypeError("Cannot read properties of undefined (reading 'metadata')");
  }),
}));

import { Titlebar } from "../src/components/Titlebar";

test("titlebar still renders when the web dev server is opened outside Tauri", () => {
  delete (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;

  expect(() => render(<Titlebar />)).not.toThrow();
  expect(screen.getByText("Reading")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Minimize" })).not.toBeInTheDocument();
});
