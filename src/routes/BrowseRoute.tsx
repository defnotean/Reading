import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { browse, search as ipcSearch } from "../ipc/sources";
import type { BrowseList, TitleSummary } from "../types";
import { CoverGrid } from "../components/CoverGrid";
import { toastError } from "../stores/useToast";
import { PasteUrlBar } from "../components/PasteUrlBar";

type SourceId = "mangadex" | "novelfire" | "comick";

const SOURCES: { id: SourceId; label: string }[] = [
  { id: "mangadex",  label: "MangaDex"  },
  { id: "novelfire", label: "NovelFire" },
  { id: "comick",    label: "ComicK"    },
];

export default function BrowseRoute() {
  const [items, setItems] = useState<TitleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<BrowseList>("trending");
  const [source, setSource] = useState<SourceId>("mangadex");
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const op = q.trim().length > 0
      ? ipcSearch(source, q.trim())
      : browse(source, list, 0);
    op.then(rows => { if (!cancelled) setItems(rows); })
      .catch(e => { if (!cancelled) toastError(e.message ?? String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [list, q, source]);

  const sourceLabel = SOURCES.find(s => s.id === source)?.label ?? source;

  return (
    <div className="h-full overflow-y-auto">
      <header className="sticky top-0 z-10 glass border-b border-ink-700/40 px-6 py-3 flex items-center gap-4">
        {/* Source tabs */}
        <div className="flex bg-ink-800/60 rounded-md p-0.5 text-sm">
          {SOURCES.map(s => (
            <button
              key={s.id}
              onClick={() => setSource(s.id)}
              className={`px-3 py-1 rounded transition-colors ${source === s.id ? "bg-accent text-white" : "text-ink-300 hover:text-ink-100"}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Sort tabs */}
        <div className="flex bg-ink-800/60 rounded-md p-0.5 text-sm">
          {(["trending", "latest"] as const).map(k => (
            <button
              key={k}
              onClick={() => setList(k)}
              className={`px-3 py-1 rounded transition-colors ${list === k ? "bg-accent text-white" : "text-ink-300 hover:text-ink-100"}`}
            >
              {k[0].toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <PasteUrlBar />
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-300" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder={`Search ${sourceLabel}…`}
              className="bg-ink-800/60 rounded-md pl-8 pr-3 py-1.5 text-sm w-64 outline-none border border-ink-700/40 focus:border-accent"
            />
          </div>
        </div>
      </header>

      <div className="p-6">
        {loading ? (
          <SkeletonGrid />
        ) : items.length === 0 ? (
          <p className="text-ink-300 text-sm">No results.</p>
        ) : (
          <CoverGrid items={items} />
        )}
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: 18 }).map((_, i) => (
        <motion.li
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.02 }}
          className="aspect-[2/3] rounded-lg bg-gradient-to-br from-ink-800 via-ink-700 to-ink-800 bg-[length:200%_100%] animate-shimmer"
        />
      ))}
    </ul>
  );
}
