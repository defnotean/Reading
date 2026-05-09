import { vi } from "vitest";
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
  convertFileSrc: (s: string) => s,
}));

import { render, screen, fireEvent } from "@testing-library/react";
import { MangaReader } from "../src/components/reader/MangaReader";

const pages = [
  { url: "https://example.com/p1.jpg", width: null, height: null },
  { url: "https://example.com/p2.jpg", width: null, height: null },
  { url: "https://example.com/p3.jpg", width: null, height: null },
];

test("MangaReader renders first page and advances on Next click", () => {
  render(<MangaReader source="mangadex" titleId="t" chapterId="c" pages={pages} />);
  expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText(/next page/i));
  expect(screen.getByText(/page 2 of 3/i)).toBeInTheDocument();
});

test("MangaReader does not advance past last page", () => {
  render(<MangaReader source="mangadex" titleId="t" chapterId="c" pages={pages} />);
  fireEvent.click(screen.getByLabelText(/next page/i));
  fireEvent.click(screen.getByLabelText(/next page/i));
  fireEvent.click(screen.getByLabelText(/next page/i));   // would go past end
  expect(screen.getByText(/page 3 of 3/i)).toBeInTheDocument();
});
