import { vi } from "vitest";

const invokeMock = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

import { sourceCapabilities } from "../src/ipc/sources";

test("sourceCapabilities invokes the source capability command", async () => {
  invokeMock.mockResolvedValueOnce([
    {
      source: "mangadex",
      content_kind: "manga",
      browse: true,
      search: true,
      title_detail: true,
      chapter_content: true,
      external_chapters: true,
      public_store_safe: false,
    },
  ]);

  await expect(sourceCapabilities()).resolves.toEqual([
    {
      source: "mangadex",
      content_kind: "manga",
      browse: true,
      search: true,
      title_detail: true,
      chapter_content: true,
      external_chapters: true,
      public_store_safe: false,
    },
  ]);
  expect(invokeMock).toHaveBeenCalledWith("source_capabilities");
});
