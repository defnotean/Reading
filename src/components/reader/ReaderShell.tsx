import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { getChapter } from "../../ipc/sources";
import type { ChapterContent } from "../../types";
import { toastError } from "../../stores/useToast";
import { MangaReader } from "./MangaReader";
import { NovelReader } from "./NovelReader";

export function ReaderShell() {
  const { source = "", id = "", chapter = "" } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState<ChapterContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getChapter(source, id, chapter)
      .then(c => { if (!cancelled) setContent(c); })
      .catch(e => { if (!cancelled) toastError(e.message ?? String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [source, id, chapter]);

  return (
    <div className="h-full w-full flex flex-col bg-ink-950 text-ink-100">
      <header className="glass border-b border-ink-700/40 px-4 py-2 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => navigate(`/t/${source}/${id}`)}
          aria-label="Back to title"
          className="rounded-md p-1.5 hover:bg-ink-700/60 focus-ring"
        >
          <ArrowLeft size={18} />
        </button>
        <span className="text-sm text-ink-300 truncate">
          {source} / {id} / {chapter}
        </span>
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
