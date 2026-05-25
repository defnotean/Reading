import { vi } from "vitest";

const { getChapterMock, getTitleMock } = vi.hoisted(() => ({
  getChapterMock: vi.fn(),
  getTitleMock: vi.fn(),
}));

vi.mock("../src/ipc/sources", () => ({
  getChapter: getChapterMock,
  getTitle: getTitleMock,
  browse: vi.fn(),
  search: vi.fn(),
}));

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ReaderShell } from "../src/components/reader/ReaderShell";
import { useCache } from "../src/stores/useCache";

const titleDetail = {
  summary: {
    source: "mangadex",
    source_id: "title-1",
    title: "Cached Title",
    kind: "manga" as const,
  },
  synopsis: null,
  status: null,
  original_language: null,
  genres: [],
  chapters: [
    { chapter_id: "chapter-1", number: 1, title: "Chapter 1" },
    { chapter_id: "chapter-2", number: 2, title: "Chapter 2" },
  ],
};

beforeEach(() => {
  useCache.getState().clear();
  getChapterMock.mockReset();
  getTitleMock.mockReset();
  getChapterMock.mockResolvedValue({
    kind: "manga_pages",
    pages: [{ url: "https://example.com/1.jpg", width: null, height: null }],
  });
  getTitleMock.mockResolvedValue(titleDetail);
});

test("ReaderShell reuses cached title metadata when navigating chapters", async () => {
  render(
    <MemoryRouter initialEntries={["/r/mangadex/title-1/chapter-1"]}>
      <Routes>
        <Route path="/r/:source/:id/:chapter" element={<ReaderShell />} />
      </Routes>
    </MemoryRouter>
  );

  await screen.findByText("Cached Title");
  fireEvent.click(screen.getByLabelText(/next chapter/i));

  await waitFor(() => {
    expect(getChapterMock).toHaveBeenLastCalledWith("mangadex", "title-1", "chapter-2");
  });
  expect(getTitleMock).toHaveBeenCalledTimes(1);
});
