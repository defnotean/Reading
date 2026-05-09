import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronsLeft, ChevronsRight } from "lucide-react";
import { getChapter, getTitle } from "../../ipc/sources";
import type { ChapterContent, ChapterSummary } from "../../types";
import { toastError } from "../../stores/useToast";
import { MangaReader } from "./MangaReader";
import { NovelReader } from "./NovelReader";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";

export function ReaderShell() {
  const { source = "", id = "", chapter = "" } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState<ChapterContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [chapters, setChapters] = useState<ChapterSummary[]>([]);

  // Fetch chapter content
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getChapter(source, id, chapter)
      .then(c => { if (!cancelled) setContent(c); })
      .catch(e => { if (!cancelled) toastError(e.message ?? String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [source, id, chapter]);

  // Fetch chapter list for prev/next navigation
  useEffect(() => {
    let cancelled = false;
    getTitle(source, id)
      .then(t => { if (!cancelled) setChapters(t.chapters); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [source, id]);

  // Only non-external chapters are navigable in-app
  const playable = chapters.filter(c => !c.external_url);
  const idx = playable.findIndex(c => c.chapter_id === chapter);
  const prevChapter = idx > 0 ? playable[idx - 1] : null;
  const nextChapter = idx >= 0 && idx < playable.length - 1 ? playable[idx + 1] : null;

  function gotoPrev() { if (prevChapter) navigate(`/r/${source}/${id}/${prevChapter.chapter_id}`); }
  function gotoNext() { if (nextChapter) navigate(`/r/${source}/${id}/${nextChapter.chapter_id}`); }

  useKeyboardShortcuts({
    "[": gotoPrev,
    "]": gotoNext,
    Escape: () => navigate(`/t/${source}/${id}`),
  }, [source, id, prevChapter, nextChapter]);

  // Derive a display label for the current chapter
  const currentChapter = playable.find(c => c.chapter_id === chapter);
  const chapterLabel = currentChapter
    ? `Ch. ${currentChapter.number ?? "?"}`
    : chapter;

  return (
    <div className="h-full w-full flex flex-col bg-ink-950 text-ink-100">
      <header className="glass border-b border-ink-700/40 px-4 py-2 flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => navigate(`/t/${source}/${id}`)}
          aria-label="Back to title"
          className="rounded-md p-1.5 hover:bg-ink-700/60 focus-ring"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="flex items-center gap-1 ml-2">
          <button
            type="button"
            onClick={gotoPrev}
            disabled={!prevChapter}
            aria-label="Previous chapter"
            className="rounded-md p-1.5 hover:bg-ink-700/60 focus-ring disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronsLeft size={18} />
          </button>

          <span className="text-sm text-ink-300 px-2 min-w-[5rem] text-center">
            {chapterLabel}
          </span>

          <button
            type="button"
            onClick={gotoNext}
            disabled={!nextChapter}
            aria-label="Next chapter"
            className="rounded-md p-1.5 hover:bg-ink-700/60 focus-ring disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronsRight size={18} />
          </button>
        </div>
      </header>

      <motion.div
        key={`${source}_${id}_${chapter}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="flex-1 overflow-hidden relative"
      >
        {loading || !content ? (
          <div className="h-full flex items-center justify-center text-ink-300 text-sm">Loading…</div>
        ) : content.kind === "manga_pages" ? (
          <MangaReader source={source} titleId={id} chapterId={chapter} pages={content.pages} />
        ) : (
          <NovelReader source={source} titleId={id} chapterId={chapter} paragraphs={content.paragraphs} plain={content.plain} />
        )}
      </motion.div>
    </div>
  );
}
