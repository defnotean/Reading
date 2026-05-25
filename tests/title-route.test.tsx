import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";

const { getTitleMock, isStarredMock, setStarredMock } = vi.hoisted(() => ({
  getTitleMock: vi.fn(),
  isStarredMock: vi.fn(),
  setStarredMock: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: (s: string) => s,
}));

vi.mock("../src/ipc/sources", () => ({
  getTitle: getTitleMock,
}));

vi.mock("../src/ipc/library", () => ({
  isStarred: isStarredMock,
  setStarred: setStarredMock,
}));

import TitleRoute from "../src/routes/TitleRoute";
import { useCache } from "../src/stores/useCache";

const detail = {
  summary: {
    source: "mangadex",
    source_id: "title-1",
    title: "Audited Title",
    kind: "manga" as const,
    author: "Writer",
    cover_path: null,
    cover_url: null,
  },
  synopsis: "A clean test synopsis.",
  status: null,
  original_language: null,
  genres: ["Action"],
  chapters: [
    { chapter_id: "chapter-1", number: 1, title: "Opening", external_url: null },
  ],
};

beforeEach(() => {
  useCache.getState().clear();
  getTitleMock.mockReset();
  isStarredMock.mockReset();
  setStarredMock.mockReset();
  getTitleMock.mockResolvedValue(detail);
  isStarredMock.mockResolvedValue(false);
  setStarredMock.mockResolvedValue(undefined);
});

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="path">{location.pathname}</p>;
}

function renderTitleRoute() {
  render(
    <MemoryRouter initialEntries={["/t/mangadex/title-1"]}>
      <Routes>
        <Route path="/t/:source/:id" element={<TitleRoute />} />
        <Route path="/r/:source/:id/:chapter" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

test("TitleRoute Add to Library button toggles the starred state", async () => {
  renderTitleRoute();

  fireEvent.click(await screen.findByRole("button", { name: /add to library/i }));

  await waitFor(() => {
    expect(setStarredMock).toHaveBeenCalledWith("mangadex", "title-1", true);
  });
  expect(screen.getByRole("button", { name: /in library/i })).toBeInTheDocument();
});

test("TitleRoute exposes a Read Now action for the first chapter", async () => {
  renderTitleRoute();

  fireEvent.click(await screen.findByRole("button", { name: /read now/i }));

  expect(screen.getByTestId("path")).toHaveTextContent("/r/mangadex/title-1/chapter-1");
});

test("TitleRoute Read Now keeps an externally hosted first chapter inside the app", async () => {
  getTitleMock.mockResolvedValue({
    ...detail,
    chapters: [
      {
        chapter_id: "external-first",
        number: 1,
        title: "Publisher hosted",
        external_url: "https://publisher.example/chapter-1",
      },
    ],
  });

  renderTitleRoute();

  fireEvent.click(await screen.findByRole("button", { name: /read now/i }));

  expect(screen.getByTestId("path")).toHaveTextContent("/r/mangadex/title-1/external-first");
});

test("TitleRoute shows an error state when title loading fails", async () => {
  getTitleMock.mockRejectedValue(new Error("source timed out"));

  renderTitleRoute();

  expect(await screen.findByText(/could not load title/i)).toBeInTheDocument();
  expect(screen.getByText(/source timed out/i)).toBeInTheDocument();
  expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
});
