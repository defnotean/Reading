import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Star } from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { cachedGetTitle } from "../stores/useCache";
import { isStarred, setStarred } from "../ipc/library";
import { toastError } from "../stores/useToast";
import type { TitleDetail } from "../types";
import { ChapterList } from "../components/ChapterList";

export default function TitleRoute() {
  const { source = "", id = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [detail, setDetail] = useState<TitleDetail | null>(null);
  const [starred, setStarredState] = useState(false);
  const [loading, setLoading] = useState(true);

  function goBack() {
    // Skip Reader/Title detours: jump straight to the list view the user
    // originally came from (`state.from` set by CoverCard / LibraryRoute).
    // Default to Browse if state was lost (e.g. opened from ReaderShell's
    // "Back to title" button, which doesn't preserve state).
    const from = (location.state as { from?: string } | null)?.from;
    navigate(from ?? "/");
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([cachedGetTitle(source, id), isStarred(source, id)])
      .then(([d, s]) => { if (!cancelled) { setDetail(d); setStarredState(s); }})
      .catch(e => { if (!cancelled) toastError(e.message ?? String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [source, id]);

  async function toggleStar() {
    const next = !starred;
    setStarredState(next);
    try { await setStarred(source, id, next); }
    catch (e: any) { toastError(e.message ?? String(e)); setStarredState(!next); }
  }

  if (loading || !detail) {
    return (
      <div className="h-full">
        <header className="px-6 pt-4">
          <button
            onClick={goBack}
            className="rounded-md px-2.5 py-1.5 glass hover:bg-ink-700/60 focus-ring flex items-center gap-1.5 text-sm text-ink-200"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
        </header>
        <div className="p-8 text-ink-300 text-sm">Loading…</div>
      </div>
    );
  }
  const cover = detail.summary.cover_path
    ? convertFileSrc(detail.summary.cover_path)
    : detail.summary.cover_url ?? undefined;

  return (
    <div className="h-full overflow-y-auto">
      <div className="relative">
        {cover && (
          <div
            className="absolute inset-0 -z-10 opacity-30 blur-2xl scale-110"
            style={{ backgroundImage: `url(${cover})`, backgroundSize: "cover", backgroundPosition: "center" }}
          />
        )}
        <div className="absolute top-4 left-4 z-10">
          <button
            onClick={goBack}
            className="rounded-md px-2.5 py-1.5 glass hover:bg-ink-700/60 focus-ring flex items-center gap-1.5 text-sm text-ink-200"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
        </div>
        <div className="bg-gradient-to-b from-transparent to-ink-950 p-8 pt-16 flex gap-8">
          <motion.div
            layoutId={`cover-${detail.summary.source}-${detail.summary.source_id}`}
            className="w-56 aspect-[2/3] rounded-lg overflow-hidden glass shadow-glow flex-shrink-0"
          >
            {cover && <img src={cover} alt={detail.summary.title} className="w-full h-full object-cover" />}
          </motion.div>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-semibold">{detail.summary.title}</h1>
            {detail.summary.author && (
              <p className="text-ink-300 mt-1">by {detail.summary.author}</p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {detail.genres.slice(0, 8).map(g => (
                <span key={g} className="text-xs px-2 py-0.5 rounded-full bg-ink-700/60 text-ink-200">{g}</span>
              ))}
            </div>
            <p className="text-sm text-ink-200 mt-4 leading-relaxed line-clamp-6 whitespace-pre-line">
              {detail.synopsis ?? "No synopsis available."}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={toggleStar}
                className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm focus-ring ${starred ? "bg-accent text-white" : "bg-ink-700/60 hover:bg-ink-700"}`}
              >
                <Star size={16} fill={starred ? "currentColor" : "none"} />
                {starred ? "In Library" : "Add to Library"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        <h2 className="text-lg font-semibold mb-3">Chapters</h2>
        <ChapterList
          summary={detail.summary}
          chapters={detail.chapters}
          from={(location.state as { from?: string } | null)?.from}
        />
      </div>
    </div>
  );
}
