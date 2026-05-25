import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { useAutoHideChrome } from "../src/hooks/useAutoHideChrome";

function ReaderChromeProbe() {
  const { visible } = useAutoHideChrome(100);
  return visible ? <button aria-label="Reader settings">Settings</button> : null;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

test("touch and pointer input restore auto-hidden reader chrome", () => {
  render(<ReaderChromeProbe />);

  expect(screen.getByLabelText(/reader settings/i)).toBeInTheDocument();

  act(() => {
    vi.advanceTimersByTime(101);
  });

  expect(screen.queryByLabelText(/reader settings/i)).not.toBeInTheDocument();

  act(() => {
    window.dispatchEvent(new Event("pointerdown"));
  });

  expect(screen.getByLabelText(/reader settings/i)).toBeInTheDocument();

  act(() => {
    vi.advanceTimersByTime(101);
  });

  expect(screen.queryByLabelText(/reader settings/i)).not.toBeInTheDocument();

  act(() => {
    window.dispatchEvent(new Event("touchstart"));
  });

  expect(screen.getByLabelText(/reader settings/i)).toBeInTheDocument();
});
