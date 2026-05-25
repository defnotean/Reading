import { useCallback, useEffect, useRef, useState } from "react";

export function useAutoHideChrome(timeoutMs = 2500): { visible: boolean; nudge: () => void } {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<number | undefined>(undefined);

  const nudge = useCallback(() => {
    setVisible(true);
    if (timerRef.current !== undefined) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setVisible(false), timeoutMs);
  }, [timeoutMs]);

  useEffect(() => {
    function onMouse() { nudge(); }
    function onKey()   { nudge(); }
    function onTouch() { nudge(); }

    window.addEventListener("mousemove", onMouse, { passive: true });
    window.addEventListener("keydown",   onKey,   { passive: true });
    window.addEventListener("pointerdown", onTouch, { passive: true });
    window.addEventListener("touchstart", onTouch, { passive: true });

    nudge(); // start the timer immediately

    return () => {
      if (timerRef.current !== undefined) window.clearTimeout(timerRef.current);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("keydown",   onKey);
      window.removeEventListener("pointerdown", onTouch);
      window.removeEventListener("touchstart", onTouch);
    };
  }, [nudge]);

  return { visible, nudge };
}
