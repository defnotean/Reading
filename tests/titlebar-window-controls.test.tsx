import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

const windowControls = vi.hoisted(() => ({
  close: vi.fn(() => Promise.resolve()),
  minimize: vi.fn(() => Promise.resolve()),
  startDragging: vi.fn(() => Promise.resolve()),
  toggleMaximize: vi.fn(() => Promise.resolve()),
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => windowControls,
}));

import { Titlebar } from "../src/components/Titlebar";

beforeEach(() => {
  Object.defineProperty(window, "__TAURI_INTERNALS__", {
    value: {},
    configurable: true,
  });
  vi.clearAllMocks();
});

test("custom titlebar buttons call the matching Tauri window commands", () => {
  render(<Titlebar />);

  fireEvent.click(screen.getByRole("button", { name: "Minimize" }));
  fireEvent.click(screen.getByRole("button", { name: "Maximize" }));
  fireEvent.click(screen.getByRole("button", { name: "Close" }));

  expect(windowControls.minimize).toHaveBeenCalledTimes(1);
  expect(windowControls.toggleMaximize).toHaveBeenCalledTimes(1);
  expect(windowControls.close).toHaveBeenCalledTimes(1);
});

test("drag region starts a Tauri window drag from the primary mouse button only", () => {
  const { container } = render(<Titlebar />);
  const dragRegion = container.querySelector("[data-tauri-drag-region]");

  expect(dragRegion).not.toBeNull();

  fireEvent.mouseDown(dragRegion!, { button: 2 });
  expect(windowControls.startDragging).not.toHaveBeenCalled();

  fireEvent.mouseDown(dragRegion!, { button: 0, detail: 1 });
  expect(windowControls.startDragging).toHaveBeenCalledTimes(1);
});

test("app title area also starts a Tauri window drag", () => {
  render(<Titlebar />);
  const titleDragRegion = screen.getByText("Reading").closest("[data-tauri-drag-region]");

  expect(titleDragRegion).not.toBeNull();

  fireEvent.mouseDown(titleDragRegion!, { button: 0, detail: 1 });
  expect(windowControls.startDragging).toHaveBeenCalledTimes(1);
});

test("double-clicking the drag region toggles maximized state", () => {
  const { container } = render(<Titlebar />);
  const dragRegion = container.querySelector("[data-tauri-drag-region]");

  expect(dragRegion).not.toBeNull();

  fireEvent.doubleClick(dragRegion!);

  expect(windowControls.toggleMaximize).toHaveBeenCalledTimes(1);
});
