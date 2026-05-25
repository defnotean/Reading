import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";

import { ChapterList } from "../src/components/ChapterList";
import { useToast } from "../src/stores/useToast";

const summary = {
  source: "mangadex",
  source_id: "title-1",
  title: "Title",
  kind: "manga" as const,
};

beforeEach(() => {
  useToast.setState({ toasts: [] });
});

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="path">{location.pathname}</p>;
}

test("ChapterList opens external MangaDex chapters inside the app reader", () => {
  render(
    <MemoryRouter initialEntries={["/t/mangadex/title-1"]}>
      <Routes>
        <Route
          path="/t/:source/:id"
          element={
            <ChapterList
              summary={summary}
              chapters={[{ chapter_id: "external", number: 1, title: "External", external_url: "https://example.com" }]}
              from="/"
            />
          }
        />
        <Route path="/r/:source/:id/:chapter" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole("link", { name: /external/i }));

  expect(screen.getByTestId("path")).toHaveTextContent("/r/mangadex/title-1/external");
});
