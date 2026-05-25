import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PageImage } from "../../types";
import { recordProgress } from "../../ipc/library";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import type { FitMode, ReadingDirection, ReadingMode } from "../../stores/useReaderSettings";

interface Props {
  source: string;
  titleId: string;
  chapterId: string;
  pages: PageImage[];
  mode: ReadingMode;
  direction?: ReadingDirection;
  fit?: FitMode;
  onProgress?: (pct: number) => void;
}

/** CSS classes per fit mode */
function fitClass(fit: FitMode): string {
  switch (fit) {
    case "width":  return "w-full h-auto max-w-none";
    case "height": return "h-full w-auto max-h-none mx-auto block";
    case "actual": return "block mx-auto";
  }
}

export function MangaReader({
  source, titleId, chapterId, pages,
  mode,
  direction = "ltr",
  fit = "width",
  onProgress,
}: Props) {
  if (pages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-ink-300 text-sm px-6 text-center">
        This chapter has no images yet. Reading tried its in-app fallback but could not extract pages.
      </div>
    );
  }
  return mode === "continuous"
    ? (
      <MangaContinuous
        source={source} titleId={titleId} chapterId={chapterId}
        pages={pages} onProgress={onProgress}
      />
    )
    : (
      <MangaPaginated
        source={source} titleId={titleId} chapterId={chapterId}
        pages={pages}
        direction={direction}
        fit={fit}
        onProgress={onProgress}
      />
    );
}

// Paginated

interface PaginatedProps {
  source: string;
  titleId: string;
  chapterId: string;
  pages: PageImage[];
  direction: ReadingDirection;
  fit: FitMode;
  onProgress?: (pct: number) => void;
}

function MangaPaginated({ source, titleId, chapterId, pages, direction, fit, onProgress }: PaginatedProps) {
  const [index, setIndex] = useState(0);
  // Track direction of last navigation for animation
  const lastDirRef = useRef<"forward" | "backward">("forward");
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const total = pages.length;

  useEffect(() => {
    const p = (index + 1) / total;
    void recordProgress(source, titleId, chapterId, p).catch(() => {});
    onProgress?.(p);
  }, [source, titleId, chapterId, index, total, onProgress]);

  // In RTL: "next" means going to lower index (previous image in array), visually right-to-left
  // In LTR: "next" means higher index
  function next() {
    if (direction === "rtl") {
      if (index > 0) { lastDirRef.current = "forward"; setIndex(i => i - 1); }
    } else {
      if (index < total - 1) { lastDirRef.current = "forward"; setIndex(i => i + 1); }
    }
  }
  function prev() {
    if (direction === "rtl") {
      if (index < total - 1) { lastDirRef.current = "backward"; setIndex(i => i + 1); }
    } else {
      if (index > 0) { lastDirRef.current = "backward"; setIndex(i => i - 1); }
    }
  }

  // In RTL: ArrowRight = prev (go back), ArrowLeft = next (go forward)
  // In LTR: ArrowLeft = prev, ArrowRight = next
  const arrowLeft  = direction === "rtl" ? next : prev;
  const arrowRight = direction === "rtl" ? prev : next;

  useKeyboardShortcuts({
    ArrowLeft:  () => arrowLeft(),
    ArrowRight: () => arrowRight(),
  }, [index, total, direction]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start) return;

    const deltaX = e.clientX - start.x;
    const deltaY = e.clientY - start.y;
    const absDeltaX = Math.abs(deltaX);

    if (absDeltaX < 48 || absDeltaX <= Math.abs(deltaY)) return;
    if (deltaX < 0) arrowRight();
    else arrowLeft();
  }

  function onPointerCancel() {
    pointerStartRef.current = null;
  }

  const page = pages[index];

  // Slide direction for animation
  const enterX  = lastDirRef.current === "forward"  ? 40 : -40;
  const exitX   = lastDirRef.current === "forward"  ? -40 : 40;

  // Click zones: in RTL, right = prev, left = next. In LTR, left = prev, right = next.
  const leftZoneAction  = direction === "rtl" ? next : prev;
  const rightZoneAction = direction === "rtl" ? prev : next;
  const leftZoneLabel   = direction === "rtl" ? "Next page" : "Previous page";
  const rightZoneLabel  = direction === "rtl" ? "Previous page" : "Next page";
  const canGoNext = direction === "rtl" ? index > 0 : index < total - 1;
  const canGoPrev = direction === "rtl" ? index < total - 1 : index > 0;
  const leftZoneAvailable = direction === "rtl" ? canGoNext : canGoPrev;
  const rightZoneAvailable = direction === "rtl" ? canGoPrev : canGoNext;

  // For overflow scroll in "height" and "actual" fit modes
  const containerClass = fit === "width"
    ? "relative h-full w-full bg-ink-950 overflow-hidden touch-pan-y"
    : "relative h-full w-full bg-ink-950 overflow-auto touch-pan-y";

  return (
    <div
      data-testid="manga-page-stage"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      className={containerClass}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={`${chapterId}_${index}`}
          initial={{ x: enterX, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: exitX, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="absolute inset-0 flex items-center justify-center"
          style={fit !== "width" ? { position: "relative", minHeight: "100%" } : undefined}
        >
          <img
            src={page.url}
            alt={`Page ${index + 1}`}
            loading="eager"
            draggable={false}
            className={fitClass(fit)}
          />
        </motion.div>
      </AnimatePresence>

      {/* Left click zone */}
      <button
        type="button"
        onClick={leftZoneAvailable ? leftZoneAction : undefined}
        aria-label={leftZoneLabel}
        disabled={!leftZoneAvailable}
        tabIndex={leftZoneAvailable ? 0 : -1}
        className="absolute left-0 top-0 h-full w-1/3 focus-ring group z-10 touch-manipulation disabled:pointer-events-none"
      >
        <ChevronLeft
          className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-300/60 group-hover:text-ink-100 transition-colors"
          size={32}
        />
      </button>

      {/* Right click zone */}
      <button
        type="button"
        onClick={rightZoneAvailable ? rightZoneAction : undefined}
        aria-label={rightZoneLabel}
        disabled={!rightZoneAvailable}
        tabIndex={rightZoneAvailable ? 0 : -1}
        className="absolute right-0 top-0 h-full w-1/3 focus-ring group z-10 touch-manipulation disabled:pointer-events-none"
      >
        <ChevronRight
          className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-300/60 group-hover:text-ink-100 transition-colors"
          size={32}
        />
      </button>

      {/* Page counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 glass rounded-full px-3 py-1 text-xs text-ink-200 pointer-events-none z-10">
        {direction === "rtl"
          ? `Page ${total - index} of ${total}`
          : `Page ${index + 1} of ${total}`}
      </div>

      {/* RTL indicator */}
      {direction === "rtl" && (
        <div className="absolute top-4 right-4 glass rounded-full px-2 py-0.5 text-[10px] text-ink-400 pointer-events-none z-10">
          RTL
        </div>
      )}
    </div>
  );
}

// Continuous

interface ContinuousProps {
  source: string;
  titleId: string;
  chapterId: string;
  pages: PageImage[];
  onProgress?: (pct: number) => void;
}

function MangaContinuous({ source, titleId, chapterId, pages, onProgress }: ContinuousProps) {
  const lastPctRef = useMemo(() => ({ current: 0 }), []);

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const p = Math.min(1, Math.max(0, el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight)));
    if (Math.abs(p - lastPctRef.current) > 0.02) {
      lastPctRef.current = p;
      void recordProgress(source, titleId, chapterId, p).catch(() => {});
      onProgress?.(p);
    }
  }

  return (
    <div onScroll={onScroll} className="h-full w-full overflow-y-auto bg-ink-950">
      <div className="max-w-3xl mx-auto py-2 flex flex-col items-center gap-1">
        {pages.map((p, i) => (
          <img
            key={`${i}_${p.url}`}
            src={p.url}
            alt={`Page ${i + 1}`}
            loading={i < 3 ? "eager" : "lazy"}
            className="w-full max-h-none"
          />
        ))}
      </div>
    </div>
  );
}
