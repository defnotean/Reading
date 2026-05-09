import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useLibrary } from "../stores/useLibrary";

export default function LibraryRoute() {
  const { items, loading, refresh, remove } = useLibrary();
  useEffect(() => { void refresh(); }, [refresh]);

  return (
    <div className="h-full overflow-y-auto p-8">
      <h1 className="text-2xl font-semibold mb-6">Library</h1>
      {loading ? (
        <p className="text-ink-300 text-sm">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-ink-300 text-sm">
          Nothing here yet — star a title from <Link to="/" className="text-accent underline">Browse</Link>.
        </p>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {items.map(t => {
            const cover = t.cover_path ? convertFileSrc(t.cover_path) : undefined;
            return (
              <motion.li
                key={`${t.source}_${t.source_id}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg overflow-hidden glass relative group"
              >
                <Link to={`/t/${t.source}/${t.source_id}`}>
                  <div className="aspect-[2/3] bg-ink-800">
                    {cover && <img src={cover} alt={t.title} className="w-full h-full object-cover" />}
                  </div>
                  <div className="p-2.5">
                    <p className="text-sm font-medium line-clamp-2">{t.title}</p>
                    {t.author && <p className="text-xs text-ink-300 truncate mt-1">{t.author}</p>}
                  </div>
                </Link>
                <button
                  onClick={(e) => { e.preventDefault(); void remove(t.source, t.source_id); }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-ink-900/70 backdrop-blur px-2 py-1 rounded text-xs hover:bg-red-500/80"
                >
                  Remove
                </button>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
