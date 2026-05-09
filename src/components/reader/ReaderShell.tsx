import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronsLeft, ChevronsRight, LayoutGrid, AlignJustify } from "lucide-react";
import { getChapter, getTitle } from "../../ipc/sources";
import type { ChapterContent, ChapterSummary, TitleDetail } from "../../types";
import { toastError } from "../../stores/useToast";
import { useReadingMode } from "../../stores/useReadingMode";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { MangaReader } from "./MangaReader";
import { NovelReader } from "./NovelReader";

export function ReaderShell() {
  const { source = "", id = "", chapter = "" } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState<ChapterContent | null>(null);
  const [title, setTitle] = useState<TitleDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const { manga: mangaMode, novel: novelMode, toggle } = useReadingMode();

  // Fetch chapter content and title detail in parallel
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getChapter(source, id, chapter),
      getTitle(source, id).catch(() => null),
    ])
      .then(([c, t]) => {
        if (cancelled) return;
        setContent(c);
        setTitle(t);
      })
      .catch(e => { if (!cancelled) toastError(e?.message ?? String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [source, id, chapter]);

  // Only non-external chapters are navigable in-app
  const playable: ChapterSummary[] = useMemo(
    () => (title?.chapters ?? []).filter(c => !c.external_url),
    [title]
  );
  const idx = playable.findIndex(c => c.chapter_id === chapter);
  const prevChapter = idx > 0 ? playable[idx - 1] : null;
  const nextChapter = idx >= 0 && idx < playable.length - 1 ? playable[idx + 1] : null;

  function gotoPrev() { if (prevChapter) navigate(`/r/${source}/${id}/${prevChapter.chapter_id}`); }
  function gotoNext() { if (nextChapter) navigate(`/r/${source}/${id}/${nextChapter.chapter_id}`); }
  function goBack()   { navigate(`/t/${source}/${id}`); }

  useKeyboardShortcuts({
    "[": gotoPrev,
    "]": gotoNext,
    Escape: goBack,
  }, [source, id, prevChapter?.chapter_id ?? "", nextChapter?.chapter_id ?? ""]);

  // Pretty labels for the header
  const titleText = title?.summary.title ?? id;
  const currentChapter = playable[idx >= 0 ? idx : 0] ?? null;
  const chapterLabel = currentChapter
    ? (currentChapter.title || (currentChapter.number != null ? `Chapter ${currentChapter.number}` : chapter))
    : chapter;
  const counter = idx >= 0 && playable.length > 0 ? `${idx + 1} of ${playable.length}` : "";

  // Pick mode icon based on current content kind
  const isMangaContent = content?.kind === "manga_pages";
  const mode = isMangaContent ? mangaMode : novelMode;
  const ModeIcon = mode === "paginated" ? AlignJustify : LayoutGrid;
  const modeNext = mode === "paginated" ? "continuous" : "paginated";
  const modeTooltip = `Switch to ${modeNext} reading`;

  return (
    <div className="h-full w-full flex flex-col bg-ink-950 text-ink-100">
      <header className="glass border-b border-ink-700/40 px-4 py-2.5 flex items-center gap-2 flex-shrink-0">
        {/* Back button */}
        <button
          onClick={goBack}
          className="rounded-md px-2.5 py-1.5 hover:bg-ink-700/60 focus-ring flex items-center gap-1.5 text-sm text-ink-200"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        <div className="h-5 w-px bg-ink-700/60 mx-1" />

        {/* Chapter prev/next with labels */}
        <button
          type="button"
          onClick={gotoPrev}
          disabled={!prevChapter}
          aria-label="Previous chapter"
          title="Previous chapter ([)"
          className="rounded-md px-2 py-1.5 hover:bg-ink-700/60 focus-ring disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 text-xs text-ink-300"
        >
          <ChevronsLeft size={16} />
          <span className="hidden sm:inline">Prev ch.</span>
        </button>
        <button
          type="button"
          onClick={gotoNext}
          disabled={!nextChapter}
          aria-label="Next chapter"
          title="Next chapter (])"
          className="rounded-md px-2 py-1.5 hover:bg-ink-700/60 focus-ring disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 text-xs text-ink-300"
        >
          <span className="hidden sm:inline">Next ch.</span>
          <ChevronsRight size={16} />
        </button>

        {/* Title + chapter label with counter */}
        <div className="ml-3 flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{titleText}</div>
          <div className="text-xs text-ink-300 truncate">
            {chapterLabel}
            {counter && <span className="ml-2 text-ink-400">· {counter}</span>}
          </div>
        </div>

        {/* Reading mode toggle — only shown once content is known */}
        {content && (
          <button
            onClick={() => toggle(isMangaContent ? "manga" : "novel")}
            title={modeTooltip}
            aria-label={modeTooltip}
            className="rounded-md px-2.5 py-1.5 hover:bg-ink-700/60 focus-ring flex items-center gap-1.5 text-xs text-ink-300"
          >
            <ModeIcon size={16} />
            <span className="hidden md:inline capitalize">{mode}</span>
          </button>
        )}
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
          <MangaReader
            source={source} titleId={id} chapterId={chapter}
            pages={content.pages}
            mode={mangaMode}
          />
        ) : (
          <NovelReader
            source={source} titleId={id} chapterId={chapter}
            paragraphs={content.paragraphs} plain={content.plain}
            mode={novelMode}
          />
        )}
      </motion.div>
    </div>
  );
}
