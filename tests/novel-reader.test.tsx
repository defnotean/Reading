import { vi } from "vitest";
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
  convertFileSrc: (s: string) => s,
}));

import { render, screen, fireEvent } from "@testing-library/react";
import { NovelReader } from "../src/components/reader/NovelReader";

const paragraphs = Array.from({ length: 30 }, (_, i) =>
  `Paragraph ${i + 1}. ` + "Lorem ipsum dolor sit amet, ".repeat(10));

test("NovelReader paginates and shows page count", () => {
  render(<NovelReader source="nf" titleId="t" chapterId="c" paragraphs={paragraphs} plain={paragraphs.join("\n\n")} />);
  expect(screen.getByText(/page 1 of \d+/i)).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText(/next page/i));
  expect(screen.getByText(/page 2 of \d+/i)).toBeInTheDocument();
});
