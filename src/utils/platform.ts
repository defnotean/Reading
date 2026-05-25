export function isMobileUserAgent(userAgent: string): boolean {
  return /\b(Android|iPhone|iPad|iPod)\b/i.test(userAgent);
}

export function isMobileRuntime(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  return isMobileUserAgent(navigator.userAgent);
}

export function hasCoarsePointer(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches === true;
}

export function shouldHideReaderCursor({
  chromeVisible,
  coarsePointer,
}: {
  chromeVisible: boolean;
  coarsePointer: boolean;
}): boolean {
  return !chromeVisible && !coarsePointer;
}
