import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";
import SettingsRoute from "../src/routes/SettingsRoute";
import { useCache } from "../src/stores/useCache";
import { useReaderSettings } from "../src/stores/useReaderSettings";

beforeEach(() => {
  useCache.getState().clear();
  useReaderSettings.getState().reset();
});

test("SettingsRoute exposes working reader defaults and cache actions", () => {
  useCache.getState().set("browse", "sample", [{ title: "Cached" }]);

  render(<SettingsRoute />);

  const mangaDirection = screen.getByRole("radiogroup", { name: /manga direction/i });
  fireEvent.click(within(mangaDirection).getByRole("radio", { name: /right to left/i }));
  expect(within(mangaDirection).getByRole("radio", { name: /right to left/i })).toHaveAttribute("aria-checked", "true");
  expect(useReaderSettings.getState().mangaDirection).toBe("rtl");

  fireEvent.click(screen.getByRole("button", { name: /clear browse cache/i }));
  expect(useCache.getState().browse.size).toBe(0);

  fireEvent.click(screen.getByRole("button", { name: /reset reader defaults/i }));
  expect(useReaderSettings.getState().mangaDirection).toBe("ltr");
});
