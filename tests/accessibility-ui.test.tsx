import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
  convertFileSrc: (s: string) => s,
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    close: vi.fn(),
    minimize: vi.fn(),
    toggleMaximize: vi.fn(),
  }),
}));

vi.mock("../src/ipc/library", () => ({
  continueReading: vi.fn().mockResolvedValue([]),
  libraryList: vi.fn().mockResolvedValue([
    {
      source: "mangadex",
      source_id: "sample",
      kind: "manga",
      title: "Keyboard Story",
      author: "Reader",
      cover_path: null,
      synopsis: null,
      status: null,
      original_lang: null,
      genres: [],
    },
  ]),
  recordProgress: vi.fn().mockResolvedValue(undefined),
  setStarred: vi.fn().mockResolvedValue(undefined),
}));

import LibraryRoute from "../src/routes/LibraryRoute";
import { Titlebar } from "../src/components/Titlebar";
import { Toaster } from "../src/components/Toast";
import { useToast } from "../src/stores/useToast";
import { ReaderSettings } from "../src/components/reader/ReaderSettings";
import { ChapterPicker } from "../src/components/reader/ChapterPicker";
import { MangaReader } from "../src/components/reader/MangaReader";

beforeEach(() => {
  Object.defineProperty(window, "__TAURI_INTERNALS__", {
    value: {},
    configurable: true,
  });
  useToast.setState({ toasts: [] });
});

test("Library remove action is discoverable by keyboard and labelled for its title", async () => {
  render(
    <MemoryRouter>
      <LibraryRoute />
    </MemoryRouter>
  );

  const remove = await screen.findByRole("button", { name: /remove Keyboard Story from library/i });
  expect(remove).toHaveClass("group-focus-within:opacity-100");
  expect(remove).toHaveClass("focus-visible:ring-2");
});

test("custom titlebar buttons keep visible keyboard focus styles", () => {
  render(<Titlebar />);

  for (const name of ["Minimize", "Maximize", "Close"]) {
    expect(screen.getByRole("button", { name })).toHaveClass("focus-visible:ring-2");
  }
});

test("toasts announce their message and expose labelled dismiss buttons", () => {
  useToast.setState({
    toasts: [
      { id: 1, kind: "error", message: "Could not load chapter" },
      { id: 2, kind: "success", message: "Saved to library" },
    ],
  });

  render(<Toaster />);

  expect(screen.getByRole("alert")).toHaveTextContent("Could not load chapter");
  expect(screen.getByRole("status")).toHaveTextContent("Saved to library");
  expect(screen.getByRole("button", { name: /dismiss Could not load chapter notification/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /dismiss Saved to library notification/i })).toBeInTheDocument();
});

test("toast stack clears the mobile bottom navigation", () => {
  useToast.setState({
    toasts: [{ id: 1, kind: "info", message: "Settings saved" }],
  });

  render(<Toaster />);

  const stack = screen.getByTestId("toaster-stack");
  expect(stack).toHaveClass(
    "bottom-[calc(5.25rem+env(safe-area-inset-bottom))]",
    "md:bottom-6"
  );
  expect(stack).not.toHaveClass("sm:bottom-6");
});

test("reader settings expose labelled radiogroups for toggles and discrete sliders", () => {
  render(<ReaderSettings open onClose={vi.fn()} kind="novel_text" />);

  const mode = screen.getByRole("radiogroup", { name: "Mode" });
  expect(within(mode).getByRole("radio", { name: "Pages" })).toHaveAttribute("aria-checked", "true");
  expect(within(mode).getByRole("radio", { name: "Continuous" })).toHaveAttribute("aria-checked", "false");

  const size = screen.getByRole("radiogroup", { name: "Size" });
  expect(within(size).getByRole("radio", { name: "base" })).toHaveAttribute("aria-checked", "true");
});

test("ChapterPicker button and popup advertise expanded state and selected chapter", async () => {
  render(
    <MemoryRouter>
      <ChapterPicker
        source="mangadex"
        titleId="sample"
        currentChapterId="chapter-2"
        chapters={[
          { chapter_id: "chapter-1", number: 1, title: "Opening" },
          { chapter_id: "chapter-2", number: 2, title: "Current" },
        ]}
      />
    </MemoryRouter>
  );

  const trigger = screen.getByRole("button", { name: /Current/i });
  expect(trigger).toHaveAttribute("aria-haspopup", "listbox");
  expect(trigger).toHaveAttribute("aria-expanded", "false");

  fireEvent.click(trigger);
  expect(trigger).toHaveAttribute("aria-expanded", "true");
  const popup = screen.getByRole("listbox", { name: /chapters/i });
  expect(within(popup).getByRole("option", { name: /Current/i })).toHaveAttribute("aria-selected", "true");
});

test("unavailable manga page click zones are disabled and skipped by keyboard tabbing", async () => {
  render(
    <MangaReader
      source="mangadex"
      titleId="sample"
      chapterId="chapter-1"
      mode="paginated"
      pages={[
        { url: "https://example.com/p1.jpg", width: null, height: null },
        { url: "https://example.com/p2.jpg", width: null, height: null },
      ]}
    />
  );

  const previous = screen.getByRole("button", { name: /previous page/i });
  expect(previous).toBeDisabled();
  expect(previous).toHaveAttribute("tabIndex", "-1");

  fireEvent.click(screen.getByRole("button", { name: /next page/i }));
  await waitFor(() => expect(screen.getByText(/page 2 of 2/i)).toBeInTheDocument());

  const next = screen.getByRole("button", { name: /next page/i });
  expect(next).toBeDisabled();
  expect(next).toHaveAttribute("tabIndex", "-1");
});
