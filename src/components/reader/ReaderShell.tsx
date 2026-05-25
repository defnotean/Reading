import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, ChevronsLeft, ChevronsRight,
  Settings, HelpCircle,
} from "lucide-react";
import { getChapter } from "../../ipc/sources";
import type { ChapterContent, ChapterSummary, TitleDetail } from "../../types";
import { toastError } from "../../stores/useToast";
import { cachedGetTitle } from "../../stores/useCache";
import { useReaderSettings } from "../../stores/useReaderSettings";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { useAutoHideChrome } from "../../hooks/useAutoHideChrome";
import { MangaReader } from "./MangaReader";
import { NovelReader } from "./NovelReader";
import { ReaderSettings } from "./ReaderSettings";
import { ShortcutsOverlay } from "./ShortcutsOverlay";
import { ChapterPicker } from "./ChapterPicker";

export function ReaderShell() {
  const { source = "", id = "", chapter = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // Preserve the original list view (`from`) across Reader navigations so
  // Title's Back button can return to it instead of `navigate(-1)`-ing into
  // a stale Reader entry.
  const fromState = (location.state as { from?: string } | null)?.from;
  const [content, setContent] = useState<ChapterContent | null>(null);
  const [title, setTitle] = useState<TitleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pct, setPct] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const s = useReaderSettings();
  const { visible: chromeVisible } = useAutoHideChrome(2500);

  // Fetch chapter content and title detail in parallel
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPct(0);
    Promise.all([
      getChapter(source, id, chapter),
      cachedGetTitle(source, id).catch(() => null),
    ])
      .then(([c, t]) => {
        if (cancelled) return;
        setContent(c);
        setTitle(t);
      })
      .catch(e => { if (!cancelled) {
        const message = e?.message ?? String(e);
        setContent(null);
        setError(message);
        toastError(message);
      }})
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

  function gotoPrev() {
    if (prevChapter) navigate(`/r/${source}/${id}/${prevChapter.chapter_id}`, { state: { from: fromState } });
  }
  function gotoNext() {
    if (nextChapter) navigate(`/r/${source}/${id}/${nextChapter.chapter_id}`, { state: { from: fromState } });
  }
  function goBack()   {
    if (settingsOpen) { setSettingsOpen(false); return; }
    if (shortcutsOpen) { setShortcutsOpen(false); return; }
    // Forward `from` to the Title page so its Back button returns to the
    // original list view, not to this Reader.
    navigate(`/t/${source}/${id}`, { state: { from: fromState } });
  }

  const isManga = content?.kind === "manga_pages";

  // Global keyboard shortcuts
  useKeyboardShortcuts({
    "[":      gotoPrev,
    "]":      gotoNext,
    Escape:   goBack,
    "?":      () => { setShortcutsOpen(o => !o); },
    "s":      () => { setSettingsOpen(o => !o); },
    "S":      () => { setSettingsOpen(o => !o); },
    // Manga-specific
    "f":      () => { if (isManga) s.cycleFitMode(); },
    "F":      () => { if (isManga) s.cycleFitMode(); },
    "d":      () => { if (isManga) s.toggleMangaDirection(); },
    "D":      () => { if (isManga) s.toggleMangaDirection(); },
    "m":      () => { if (isManga) s.toggleMangaMode(); else s.toggleNovelMode(); },
    "M":      () => { if (isManga) s.toggleMangaMode(); else s.toggleNovelMode(); },
    // Novel-specific
    "t":      () => { if (!isManga) s.cycleTheme(); },
    "T":      () => { if (!isManga) s.cycleTheme(); },
    "+":      () => { if (!isManga) s.cycleFontSize(); },
    "=":      () => { if (!isManga) s.cycleFontSize(); },
    "-":      () => { if (!isManga) s.cycleFontSize(); },
  }, [source, id, prevChapter?.chapter_id ?? "", nextChapter?.chapter_id ?? "", isManga, settingsOpen, shortcutsOpen]);

  // Pretty labels for the header
  const titleText = title?.summary.title ?? id;
  const currentChapter = playable[idx >= 0 ? idx : 0] ?? null;
  const chapterLabel = currentChapter
    ? (currentChapter.title?.trim() || (currentChapter.number != null ? `Chapter ${currentChapter.number}` : chapter))
    : chapter;
  const counter = idx >= 0 && playable.length > 0 ? `${idx + 1} / ${playable.length}` : "";

  // Determine theme class for root
  const themeClass = isManga ? "theme-dark" : `theme-${s.novelTheme}`;

  const kind = content?.kind ?? "manga_pages";

  return (
    <div className={`h-full w-full flex flex-col relative ${themeClass}`} style={{ cursor: chromeVisible ? undefined : "none" }}>
      {/* Slim progress bar — always visible at top */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-ink-700/40 z-30 pointer-events-none">
        <div
          className="h-full bg-accent transition-[width] duration-300"
          style={{ width: `${pct * 100}%` }}
        />
      </div>

      {/* Header — auto-hides */}
      <AnimatePresence>
        {chromeVisible && (
          <motion.header
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="glass border-b border-ink-700/40 px-4 py-2.5 flex items-center gap-2 flex-shrink-0 z-20 relative"
          >
            {/* Back */}
            <button
              onClick={goBack}
              className="rounded-md px-2.5 py-1.5 hover:bg-ink-700/60 focus-ring flex items-center gap-1.5 text-sm text-ink-200 flex-shrink-0"
            >
              <ArrowLeft size={15} />
              <span className="hidden sm:inline">Back</span>
            </button>

            <div className="h-5 w-px bg-ink-700/60 mx-0.5" />

            {/* Chapter prev/next */}
            <button
              type="button"
              onClick={gotoPrev}
              disabled={!prevChapter}
              aria-label="Previous chapter"
              title="Previous chapter ([)"
              className="rounded-md px-2 py-1.5 hover:bg-ink-700/60 focus-ring disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 text-xs text-ink-300"
            >
              <ChevronsLeft size={15} />
            </button>
            <button
              type="button"
              onClick={gotoNext}
              disabled={!nextChapter}
              aria-label="Next chapter"
              title="Next chapter (])"
              className="rounded-md px-2 py-1.5 hover:bg-ink-700/60 focus-ring disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 text-xs text-ink-300"
            >
              <ChevronsRight size={15} />
            </button>

            {/* Title + chapter picker */}
            <div className="ml-2 flex-1 min-w-0">
              <div className="text-sm font-semibold truncate leading-tight">{titleText}</div>
              <div className="flex items-center gap-1">
                {playable.length > 1 ? (
                  <ChapterPicker
                    source={source}
                    titleId={id}
                    chapters={playable}
                    currentChapterId={chapter}
                    fromState={fromState}
                  />
                ) : (
                  <div className="text-xs text-ink-400 truncate leading-tight">
                    {chapterLabel}
                  </div>
                )}
                {counter && (
                  <span className="text-xs text-ink-500 flex-shrink-0 hidden sm:inline">
                    · {counter}
                  </span>
                )}
              </div>
            </div>

            {/* Right cluster: shortcuts + settings */}
            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
              <button
                onClick={() => setShortcutsOpen(o => !o)}
                title="Keyboard shortcuts (?)"
                aria-label="Keyboard shortcuts"
                className="rounded-md p-1.5 hover:bg-ink-700/60 focus-ring text-ink-400 hover:text-ink-200 transition-colors"
              >
                <HelpCircle size={16} />
              </button>
              {content && (
                <button
                  onClick={() => setSettingsOpen(o => !o)}
                  title="Settings (S)"
                  aria-label="Reader settings"
                  className={`rounded-md p-1.5 hover:bg-ink-700/60 focus-ring transition-colors ${
                    settingsOpen ? "text-accent" : "text-ink-400 hover:text-ink-200"
                  }`}
                >
                  <Settings size={16} />
                </button>
              )}
            </div>

            {/* Settings panel anchored to header */}
            <ReaderSettings
              open={settingsOpen}
              onClose={() => setSettingsOpen(false)}
              kind={kind}
            />
          </motion.header>
        )}
      </AnimatePresence>

      {/* Shortcuts overlay */}
      <ShortcutsOverlay
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        kind={kind}
      />

      {/* Main reader area */}
      <div className="flex-1 overflow-hidden relative">
        {loading ? (
          <div className="h-full flex items-center justify-center text-ink-300 text-sm">Loading...</div>
        ) : error || !content ? (
          <div className="h-full flex items-center justify-center p-6">
            <div className="max-w-xl rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-center">
              <h1 className="text-lg font-semibold text-ink-100">Could not load chapter</h1>
              <p className="mt-2 text-sm text-ink-300">{error ?? "Chapter content was unavailable."}</p>
            </div>
          </div>
        ) : content.kind === "manga_pages" ? (
          <MangaReader
            source={source}
            titleId={id}
            chapterId={chapter}
            pages={content.pages}
            mode={s.mangaMode}
            direction={s.mangaDirection}
            fit={s.mangaFit}
            onProgress={setPct}
          />
        ) : (
          <NovelReader
            source={source}
            titleId={id}
            chapterId={chapter}
            paragraphs={content.paragraphs}
            plain={content.plain}
            mode={s.novelMode}
            theme={s.novelTheme}
            font={s.novelFont}
            size={s.novelSize}
            spacing={s.novelSpacing}
            onProgress={setPct}
          />
        )}
      </div>
    </div>
  );
}
