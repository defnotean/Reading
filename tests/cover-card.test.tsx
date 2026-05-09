import { vi } from "vitest";
vi.mock("@tauri-apps/api/core", () => ({ convertFileSrc: (s: string) => s }));

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CoverCard } from "../src/components/CoverCard";

const item = {
  source: "mangadex",
  source_id: "abc",
  title: "Sample",
  author: "Author Name",
  cover_url: null,
  cover_path: null,
  kind: "manga" as const,
};

test("CoverCard renders title and author", () => {
  render(
    <MemoryRouter>
      <CoverCard item={item} />
    </MemoryRouter>
  );
  expect(screen.getAllByText("Sample").length).toBeGreaterThan(0);
  expect(screen.getByText("Author Name")).toBeInTheDocument();
});
