import { expect, test } from "vitest";
import { isMobileUserAgent, shouldHideReaderCursor } from "../src/utils/platform";

test("mobile runtime detection includes Android tablets", () => {
  expect(isMobileUserAgent("Mozilla/5.0 (Linux; Android 15; Pixel Tablet)")).toBe(true);
  expect(isMobileUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe(false);
});

test("reader cursor is not hidden for coarse pointer devices", () => {
  expect(shouldHideReaderCursor({ chromeVisible: false, coarsePointer: true })).toBe(false);
  expect(shouldHideReaderCursor({ chromeVisible: false, coarsePointer: false })).toBe(true);
  expect(shouldHideReaderCursor({ chromeVisible: true, coarsePointer: false })).toBe(false);
});
