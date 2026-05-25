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

import { act, fireEvent, render, screen, within } from "@testing-library/react";
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

test("BrowseRoute source tabs expose selected state and switch sources from the tab controls", () => {
  render(
    <MemoryRouter>
      <BrowseRoute />
    </MemoryRouter>
  );

  const tabs = screen.getByRole("tablist", { name: /content sources/i });
  expect(within(tabs).getByRole("tab", { name: /mangadex/i })).toHaveAttribute("aria-selected", "true");

  const novelTab = within(tabs).getByRole("tab", { name: /novelfire/i });
  const novelIcon = novelTab.querySelector("svg");
  expect(novelIcon).toBeInTheDocument();
  fireEvent.click(novelIcon!);

  expect(within(tabs).getByRole("tab", { name: /novelfire/i })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByPlaceholderText(/search novelfire/i)).toBeInTheDocument();
});

test("BrowseRoute clear search action resets the query without firing another search", () => {
  render(
    <MemoryRouter>
      <BrowseRoute />
    </MemoryRouter>
  );

  const input = screen.getByPlaceholderText(/search mangadex/i);
  fireEvent.change(input, { target: { value: "one" } });

  const clear = screen.getByRole("button", { name: /clear search/i });
  fireEvent.click(clear);

  expect(input).toHaveValue("");
  expect(searchMock).not.toHaveBeenCalled();
});
