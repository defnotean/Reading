import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PageImage } from "../../types";
import { recordProgress } from "../../ipc/library";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";

interface Props {
  source: string;
  titleId: string;
  chapterId: string;
  pages: PageImage[];
}

export function MangaReader({ source, titleId, chapterId, pages }: Props) {
  const [index, setIndex] = useState(0);
  const total = pages.length;

  useEffect(() => {
    if (total === 0) return;
    const pct = (index + 1) / total;
    void recordProgress(source, titleId, chapterId, pct).catch(() => {});
  }, [source, titleId, chapterId, index, total]);

  function next() { setIndex(i => Math.min(i + 1, total - 1)); }
  function prev() { setIndex(i => Math.max(i - 1, 0)); }

  useKeyboardShortcuts({
    ArrowLeft:  prev,
    ArrowRight: next,
  }, [index, total]);

  if (total === 0) {
    return <div className="h-full flex items-center justify-center text-ink-300">No pages in this chapter.</div>;
  }
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
