import { vi } from "vitest";

const { searchMock } = vi.hoisted(() => ({
  searchMock: vi.fn(),
}));

vi.mock("../src/ipc/sources", () => ({
  search: searchMock,
  browse: vi.fn(),
  getTitle: vi.fn(),
  getChapter: vi.fn(),
}));

import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BrowseRoute from "../src/routes/BrowseRoute";

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IntersectionObserver", class {
    observe() {}
    disconnect() {}
  });
  searchMock.mockReset();
  searchMock.mockResolvedValue([
    { source: "mangadex", source_id: "one", title: "One Piece", kind: "manga" as const },
  ]);
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("BrowseRoute debounces search and skips blank or too-short queries", async () => {
  render(
    <MemoryRouter>
      <BrowseRoute />
    </MemoryRouter>
  );

  const input = screen.getByPlaceholderText(/search mangadex/i);

  fireEvent.change(input, { target: { value: "  " } });
  act(() => { vi.advanceTimersByTime(350); });
  expect(searchMock).not.toHaveBeenCalled();

  fireEvent.change(input, { target: { value: "op" } });
  act(() => { vi.advanceTimersByTime(350); });
  expect(searchMock).not.toHaveBeenCalled();

  fireEvent.change(input, { target: { value: "one" } });
  act(() => { vi.advanceTimersByTime(299); });
  expect(searchMock).not.toHaveBeenCalled();

  act(() => { vi.advanceTimersByTime(1); });
  expect(searchMock).toHaveBeenCalledTimes(1);
  expect(searchMock).toHaveBeenCalledWith("mangadex", "one");
});
