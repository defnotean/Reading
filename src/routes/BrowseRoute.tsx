import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Feather, Library, Search, X } from "lucide-react";
import { search as ipcSearch } from "../ipc/sources";
import type { BrowseList, TitleSummary } from "../types";
import { CoverGrid } from "../components/CoverGrid";
import { BrowseSection } from "../components/BrowseSection";
import { PasteUrlBar } from "../components/PasteUrlBar";
import { toastError } from "../stores/useToast";

type SourceId = "mangadex" | "novelfire" | "comick";
const SEARCH_DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 3;

const SOURCES = [
  { id: "mangadex",  label: "MangaDex",  Icon: BookOpen },
  { id: "novelfire", label: "NovelFire", Icon: Feather },
  { id: "comick",    label: "ComicK",    Icon: Library },
] as const;

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
  const panelId = `source-panel-${source}`;

  return (
    <div className="h-full overflow-y-auto">
      <header className="sticky top-0 z-10 glass border-b border-ink-700/40 px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div role="tablist" aria-label="Content sources" className="flex w-full overflow-x-auto rounded-md bg-ink-900/70 p-1 text-sm sm:w-auto">
            {SOURCES.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={source === id}
                aria-controls={panelId}
                id={`source-tab-${id}`}
                onClick={() => setSource(id)}
                className={`min-w-28 flex-none px-3 py-2 rounded flex items-center justify-center gap-2 transition-colors focus-ring ${
                  source === id
                    ? "bg-accent text-white shadow-glow"
                    : "text-ink-300 hover:text-ink-100 hover:bg-ink-700/60"
                }`}
              >
                <Icon size={15} aria-hidden="true" className="flex-shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:ml-auto">
            <PasteUrlBar />
            <div className="relative w-full sm:w-64">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-300" aria-hidden="true" />
              <input
                aria-label={`Search ${sourceLabel}`}
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder={`Search ${sourceLabel}...`}
                className="bg-ink-800/70 rounded-md pl-8 pr-9 py-2 text-sm w-full outline-none border border-ink-700/60 focus:border-accent focus:ring-1 focus:ring-accent/50"
              />
              {q && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setQ("")}
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1.5 text-ink-300 hover:text-ink-100 hover:bg-ink-700/80 focus-ring"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={`source-tab-${source}`}
        className="p-4 space-y-8 sm:p-6"
      >
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
