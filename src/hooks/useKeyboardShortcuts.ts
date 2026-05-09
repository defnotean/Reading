import { useEffect } from "react";

type Handler = (e: KeyboardEvent) => void;
export type ShortcutMap = Record<string, Handler>;

export function useKeyboardShortcuts(map: ShortcutMap, deps: ReadonlyArray<unknown> = []) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Ignore when user is typing in an input/textarea/contentEditable
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      const handler = map[e.key];
      if (handler) {
        handler(e);
        e.preventDefault();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
