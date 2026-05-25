import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";

const { cachedBrowseMock } = vi.hoisted(() => ({
  cachedBrowseMock: vi.fn(),
}));

vi.mock("../src/stores/useCache", () => ({
  cachedBrowse: cachedBrowseMock,
}));

import { BrowseSection } from "../src/components/BrowseSection";

beforeEach(() => {
  cachedBrowseMock.mockReset();
  vi.stubGlobal("IntersectionObserver", class {
    private cb: IntersectionObserverCallback;
    constructor(cb: IntersectionObserverCallback) {
      this.cb = cb;
    }
    observe(target: Element) {
      window.setTimeout(() => {
        this.cb([{ isIntersecting: true, target } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
      }, 0);
    }
    disconnect() {}
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("BrowseSection renders source load failures inline instead of replacing them with an empty state", async () => {
  cachedBrowseMock.mockRejectedValue(new Error("source unavailable"));

  render(
    <MemoryRouter>
      <BrowseSection source="mangadex" list="trending" label="Trending" />
    </MemoryRouter>
  );

  await waitFor(() => {
    expect(screen.getByText(/could not load trending/i)).toBeInTheDocument();
  });
  expect(screen.getByText(/source unavailable/i)).toBeInTheDocument();
  expect(screen.queryByText(/nothing here/i)).not.toBeInTheDocument();
});
