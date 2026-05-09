import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PageImage } from "../../types";
import { recordProgress } from "../../ipc/library";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import type { ReadingMode } from "../../stores/useReadingMode";

interface Props {
  source: string;
  titleId: string;
  chapterId: string;
  pages: PageImage[];
  mode: ReadingMode;
}

export function MangaReader({ source, titleId, chapterId, pages, mode }: Props) {
  if (pages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-ink-300 text-sm px-6 text-center">
        This chapter has no images. It may be hosted externally — try opening it in your browser from the title page.
      </div>
    );
  }
  return mode === "continuous"
    ? <MangaContinuous source={source} titleId={titleId} chapterId={chapterId} pages={pages} />
    : <MangaPaginated  source={source} titleId={titleId} chapterId={chapterId} pages={pages} />;
}

// ── Paginated ──────────────────────────────────────────────────────────────

type InnerProps = Omit<Props, "mode">;

function MangaPaginated({ source, titleId, chapterId, pages }: InnerProps) {
  const [index, setIndex] = useState(0);
  const total = pages.length;

  useEffect(() => {
    const pct = (index + 1) / total;
    void recordProgress(source, titleId, chapterId, pct).catch(() => {});
  }, [source, titleId, chapterId, index, total]);

  function next() { setIndex(i => Math.min(i + 1, total - 1)); }
  function prev() { setIndex(i => Math.max(i - 1, 0)); }

  useKeyboardShortcuts({
    ArrowLeft:  prev,
    ArrowRight: next,
  }, [index, total]);

  const page = pages[index];

  return (
    <div className="relative h-full w-full bg-ink-950">
      <motion.img
        key={page.url}
        src={page.url}
        alt={`Page ${index + 1}`}
        loading="eager"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        className="absolute inset-0 m-auto max-h-full max-w-full object-contain"
      />

      <button
        type="button"
        onClick={prev}
        aria-label="Previous page"
        className="absolute left-0 top-0 h-full w-1/3 focus-ring group"
      >
        <ChevronLeft className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-300/60 group-hover:text-ink-100 transition-colors" size={32} />
      </button>
      <button
        type="button"
        onClick={next}
        aria-label="Next page"
        className="absolute right-0 top-0 h-full w-1/3 focus-ring group"
      >
        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-300/60 group-hover:text-ink-100 transition-colors" size={32} />
      </button>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 glass rounded-full px-3 py-1 text-xs text-ink-200 pointer-events-none">
        Page {index + 1} of {total}
      </div>
    </div>
  );
}

// ── Continuous ─────────────────────────────────────────────────────────────

function MangaContinuous({ source, titleId, chapterId, pages }: InnerProps) {
  const lastPctRef = useMemo(() => ({ current: 0 }), []);

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const pct = Math.min(1, Math.max(0, el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight)));
    if (Math.abs(pct - lastPctRef.current) > 0.05) {
      lastPctRef.current = pct;
      void recordProgress(source, titleId, chapterId, pct).catch(() => {});
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
