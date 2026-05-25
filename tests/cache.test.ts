import { vi } from "vitest";

const { browseMock } = vi.hoisted(() => ({
  browseMock: vi.fn(),
}));

vi.mock("../src/ipc/sources", () => ({
  browse: browseMock,
  getTitle: vi.fn(),
}));

import { cachedBrowse, useCache } from "../src/stores/useCache";

const page0 = [
  { source: "mangadex", source_id: "p0", title: "Page Zero", kind: "manga" as const },
];

const page1 = [
  { source: "mangadex", source_id: "p1", title: "Page One", kind: "manga" as const },
];

beforeEach(() => {
  useCache.getState().clear();
  browseMock.mockReset();
});

test("cachedBrowse keeps different pages in separate cache entries", async () => {
  browseMock
    .mockResolvedValueOnce(page0)
    .mockResolvedValueOnce(page1);

  await expect(cachedBrowse("mangadex", "latest", 0)).resolves.toEqual(page0);
  await expect(cachedBrowse("mangadex", "latest", 1)).resolves.toEqual(page1);
  await expect(cachedBrowse("mangadex", "latest", 0)).resolves.toEqual(page0);
  await expect(cachedBrowse("mangadex", "latest", 1)).resolves.toEqual(page1);

  expect(browseMock).toHaveBeenCalledTimes(2);
  expect(browseMock).toHaveBeenNthCalledWith(1, "mangadex", "latest", 0);
  expect(browseMock).toHaveBeenNthCalledWith(2, "mangadex", "latest", 1);
});
