import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { recordProgress } from "../../ipc/library";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import type { ReadingMode } from "../../stores/useReadingMode";

interface Props {
  source: string;
  titleId: string;
  chapterId: string;
  paragraphs: string[];
  plain: string;
  mode: ReadingMode;
}

const PARAS_PER_PAGE = 6;

export function NovelReader(props: Props) {
  return props.mode === "continuous"
    ? <NovelContinuous {...props} />
    : <NovelPaginated  {...props} />;
}

// ── Paginated ──────────────────────────────────────────────────────────────

function NovelPaginated({ source, titleId, chapterId, paragraphs }: Props) {
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
    const pct = (index + 1) / total;
    void recordProgress(source, titleId, chapterId, pct).catch(() => {});
  }, [source, titleId, chapterId, index, total]);

  function next() { setIndex(i => Math.min(i + 1, total - 1)); }
  function prev() { setIndex(i => Math.max(i - 1, 0)); }

  useKeyboardShortcuts({
    ArrowLeft:  prev,
    ArrowRight: next,
    PageUp:     prev,
    PageDown:   next,
  }, [index, total]);

  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0 overflow-y-auto px-12 py-8">
        <motion.article
          key={index}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="max-w-3xl mx-auto leading-relaxed text-ink-100 space-y-5"
        >
          {pages[index].map((p, i) => (
            <p key={i} className="text-base whitespace-pre-line">{p}</p>
          ))}
        </motion.article>
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

function NovelContinuous({ source, titleId, chapterId, paragraphs }: Props) {
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
    <div onScroll={onScroll} className="h-full w-full overflow-y-auto">
      <article className="max-w-3xl mx-auto px-12 py-10 leading-relaxed text-ink-100 space-y-5">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-base whitespace-pre-line">{p}</p>
        ))}
      </article>
    </div>
  );
}
