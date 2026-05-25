import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";

const { fromUrlMock } = vi.hoisted(() => ({
  fromUrlMock: vi.fn(),
}));

vi.mock("../src/ipc/sources", () => ({
  fromUrl: fromUrlMock,
}));

import { PasteUrlBar } from "../src/components/PasteUrlBar";

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="path">{location.pathname}</p>;
}

beforeEach(() => {
  fromUrlMock.mockReset();
  fromUrlMock.mockResolvedValue({
    source: "generic",
    source_id: "encoded-title",
    kind: "manga",
    title: "Generic",
    chapter_id: "encoded-chapter",
  });
});

test("PasteUrlBar submits pasted URLs from the icon button", async () => {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route
          path="*"
          element={(
            <>
              <PasteUrlBar />
              <LocationProbe />
            </>
          )}
        />
      </Routes>
    </MemoryRouter>
  );

  fireEvent.change(screen.getByLabelText(/manga or novel url/i), {
    target: { value: "https://example.com/chapter" },
  });
  fireEvent.click(screen.getByRole("button", { name: /open pasted url/i }));

  await waitFor(() => {
    expect(fromUrlMock).toHaveBeenCalledWith("https://example.com/chapter");
  });
  expect(await screen.findByTestId("path")).toHaveTextContent("/r/generic/encoded-title/encoded-chapter");
});
