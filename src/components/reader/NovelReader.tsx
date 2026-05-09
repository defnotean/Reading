import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { recordProgress } from "../../ipc/library";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import type { FontFamily, FontSize, LineSpacing, ReadingMode, Theme } from "../../stores/useReaderSettings";
import { SIZE_CLASSES, SPACING_CLASSES } from "../../stores/useReaderSettings";

interface Props {
  source: string;
  titleId: string;
  chapterId: string;
  paragraphs: string[];
  plain: string;
  mode: ReadingMode;
  theme?: Theme;
  font?: FontFamily;
  size?: FontSize;
  spacing?: LineSpacing;
  onProgress?: (pct: number) => void;
}

const PARAS_PER_PAGE = 6;

export function NovelReader(props: Props) {
  return props.mode === "continuous"
    ? <NovelContinuous {...props} />
    : <NovelPaginated  {...props} />;
}

// Build prose class list from settings
function proseClasses(font: FontFamily, size: FontSize, spacing: LineSpacing): string {
  return [
    "reader-prose",
    font === "serif" ? "font-serif" : "font-sans",
    SIZE_CLASSES[size],
    SPACING_CLASSES[spacing],
    "space-y-5",
    "max-w-[64ch]",
    "mx-auto",
  ].join(" ");
}

// ── Paginated ──────────────────────────────────────────────────────────────

function NovelPaginated({
  source, titleId, chapterId, paragraphs,
  font = "serif",
  size = "base",
  spacing = "normal",
  onProgress,
}: Props) {
  const pages = useMemo(() => {
    const out: string[][] = [];
    for (let i = 0; i < paragraphs.length; i += PARAS_PER_PAGE) {
      out.push(paragraphs.slice(i, i + PARAS_PER_PAGE));
    }
    return out.length > 0 ? out : [["(empty chapter)"]];
  }, [paragraphs]);

  const [index, setIndex] = useState(0);
  const total = pages.length;

  useEffect(() => {
    const p = (index + 1) / total;
    void recordProgress(source, titleId, chapterId, p).catch(() => {});
    onProgress?.(p);
  }, [source, titleId, chapterId, index, total, onProgress]);

  function next() { setIndex(i => Math.min(i + 1, total - 1)); }
  function prev() { setIndex(i => Math.max(i - 1, 0)); }

  useKeyboardShortcuts({
    ArrowLeft: prev,
    ArrowRight: next,
    PageUp:    prev,
    PageDown:  next,
  }, [index, total]);

  const prose = proseClasses(font, size, spacing);

  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0 overflow-y-auto px-12 py-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.article
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className={prose}
          >
            {pages[index].map((p, i) => (
              <p key={i} className="whitespace-pre-line">{p}</p>
            ))}
          </motion.article>
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={prev}
        aria-label="Previous page"
        disabled={index === 0}
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full glass p-2 disabled:opacity-30 hover:bg-ink-700/60 focus-ring"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        type="button"
        onClick={next}
        aria-label="Next page"
        disabled={index === total - 1}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full glass p-2 disabled:opacity-30 hover:bg-ink-700/60 focus-ring"
      >
        <ChevronRight size={20} />
      </button>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 glass rounded-full px-3 py-1 text-xs text-ink-200 pointer-events-none">
        Page {index + 1} of {total}
      </div>
    </div>
  );
}

// ── Continuous ─────────────────────────────────────────────────────────────

function NovelContinuous({
  source, titleId, chapterId, paragraphs,
  font = "serif",
  size = "base",
  spacing = "normal",
  onProgress,
}: Props) {
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

  const prose = proseClasses(font, size, spacing);

  return (
    <div onScroll={onScroll} className="h-full w-full overflow-y-auto">
      <article className={`${prose} px-12 py-10`}>
        {paragraphs.map((p, i) => (
          <p key={i} className="whitespace-pre-line">{p}</p>
        ))}
      </article>
    </div>
  );
}
