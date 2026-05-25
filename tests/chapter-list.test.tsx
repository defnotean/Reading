import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";

const { openUrlMock } = vi.hoisted(() => ({
  openUrlMock: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-opener", () => ({
  openUrl: openUrlMock,
}));

import { ChapterList } from "../src/components/ChapterList";
import { Toaster } from "../src/components/Toast";
import { useToast } from "../src/stores/useToast";

const summary = {
  source: "mangadex",
  source_id: "title-1",
  title: "Title",
  kind: "manga" as const,
};

beforeEach(() => {
  openUrlMock.mockReset();
  useToast.setState({ toasts: [] });
});

test("ChapterList reports external open failures instead of silently dropping button errors", async () => {
  openUrlMock.mockRejectedValue(new Error("blocked popup"));

  render(
    <MemoryRouter>
      <ChapterList
        summary={summary}
        chapters={[{ chapter_id: "external", number: 1, title: "External", external_url: "https://example.com" }]}
      />
      <Toaster />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole("button", { name: /external/i }));

  await waitFor(() => {
    expect(screen.getByRole("alert")).toHaveTextContent("blocked popup");
  });
});
