import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { search as ipcSearch } from "../ipc/sources";
import type { BrowseList, TitleSummary } from "../types";
import { CoverGrid } from "../components/CoverGrid";
import { BrowseSection } from "../components/BrowseSection";
import { PasteUrlBar } from "../components/PasteUrlBar";
import { toastError } from "../stores/useToast";

type SourceId = "mangadex" | "novelfire" | "comick";
const SEARCH_DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 3;

const SOURCES: { id: SourceId; label: string }[] = [
  { id: "mangadex",  label: "MangaDex"  },
  { id: "novelfire", label: "NovelFire" },
  { id: "comick",    label: "ComicK"    },
];

interface Section { id: string; label: string; list: BrowseList; }

const MANGADEX_SECTIONS: Section[] = [
  { id: "trending",   label: "Trending",       list: "trending" },
  { id: "latest",     label: "Latest Updates", list: "latest"   },
  { id: "isekai",     label: "Isekai",         list: { genre: "isekai" } },
  { id: "action",     label: "Action",         list: { genre: "action" } },
  { id: "comedy",     label: "Comedy",         list: { genre: "comedy" } },
  { id: "romance",    label: "Romance",        list: { genre: "romance" } },
  { id: "fantasy",    label: "Fantasy",        list: { genre: "fantasy" } },
  { id: "slice",      label: "Slice of Life",  list: { genre: "slice-of-life" } },
  { id: "mystery",    label: "Mystery",        list: { genre: "mystery" } },
  { id: "scifi",      label: "Sci-Fi",         list: { genre: "sci-fi" } },
  { id: "manhua",     label: "Manhua",         list: { lang: "zh" } },
  { id: "manhwa",     label: "Manhwa",         list: { lang: "ko" } },
];

const COMICK_SECTIONS: Section[] = [
  { id: "trending",   label: "Trending",       list: "trending" },
  { id: "latest",     label: "Latest Updates", list: "latest"   },
  { id: "isekai",     label: "Isekai",         list: { genre: "isekai" } },
  { id: "action",     label: "Action",         list: { genre: "action" } },
  { id: "comedy",     label: "Comedy",         list: { genre: "comedy" } },
  { id: "romance",    label: "Romance",        list: { genre: "romance" } },
  { id: "fantasy",    label: "Fantasy",        list: { genre: "fantasy" } },
];

const NOVELFIRE_SECTIONS: Section[] = [
  { id: "trending",   label: "Trending",       list: "trending" },
  { id: "latest",     label: "Latest Updates", list: "latest"   },
  { id: "action",     label: "Action",         list: { genre: "action" } },
  { id: "fantasy",    label: "Fantasy",        list: { genre: "fantasy" } },
  { id: "romance",    label: "Romance",        list: { genre: "romance" } },
  { id: "scifi",      label: "Sci-Fi",         list: { genre: "sci-fi" } },
];

export default function BrowseRoute() {
  const [source, setSource] = useState<SourceId>("mangadex");
  const [q, setQ] = useState("");

  // Search results (when query is non-empty, replaces the categorized view)
  const [searchItems, setSearchItems] = useState<TitleSummary[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const trimmedQuery = q.trim();
  const hasSearchQuery = trimmedQuery.length >= MIN_SEARCH_LENGTH;

  useEffect(() => {
    if (trimmedQuery.length < MIN_SEARCH_LENGTH) {
      setSearchItems(null);
      setSearchLoading(false);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    const timer = window.setTimeout(() => {
      ipcSearch(source, trimmedQuery)
        .then(rows => { if (!cancelled) setSearchItems(rows); })
        .catch(e => { if (!cancelled) toastError(e.message ?? String(e)); })
        .finally(() => { if (!cancelled) setSearchLoading(false); });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [trimmedQuery, source]);

  const sourceLabel = SOURCES.find(s => s.id === source)?.label ?? source;
  const sections =
    source === "mangadex"  ? MANGADEX_SECTIONS  :
    source === "comick"    ? COMICK_SECTIONS    :
                             NOVELFIRE_SECTIONS;

  return (
    <div className="h-full overflow-y-auto">
      <header className="sticky top-0 z-10 glass border-b border-ink-700/40 px-6 py-3 flex items-center gap-4">
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
        <div className="ml-auto flex items-center gap-3">
          <PasteUrlBar />
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-300" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder={`Search ${sourceLabel}...`}
              className="bg-ink-800/60 rounded-md pl-8 pr-3 py-1.5 text-sm w-64 outline-none border border-ink-700/40 focus:border-accent"
            />
          </div>
        </div>
      </header>

      <div className="p-6 space-y-8">
        {hasSearchQuery ? (
          searchLoading ? (
            <SkeletonGrid />
          ) : !searchItems || searchItems.length === 0 ? (
            <p className="text-ink-300 text-sm">No results for "{trimmedQuery}".</p>
          ) : (
            <CoverGrid items={searchItems} />
          )
        ) : (
          sections.map(s => (
            <BrowseSection key={`${source}-${s.id}`} source={source} list={s.list} label={s.label} />
          ))
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
