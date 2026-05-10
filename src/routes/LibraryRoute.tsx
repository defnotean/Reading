import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useLibrary } from "../stores/useLibrary";

export default function LibraryRoute() {
  const { items, recents, loading, refresh, remove } = useLibrary();
  useEffect(() => { void refresh(); }, [refresh]);

  return (
    <div className="h-full overflow-y-auto p-8">
      <h1 className="text-2xl font-semibold mb-6">Library</h1>

      {recents.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3">Continue Reading</h2>
          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-2 px-2">
            {recents.map(r => {
              const cover = r.cover_path ? convertFileSrc(r.cover_path) : undefined;
              const pct   = Math.round(r.position_pct * 100);
              const label = r.title ?? "Untitled";
              const chapShort = r.chapter_id
                .replace(/^chapter-/, "ch. ")
                .replace(/^([0-9a-f-]{36})$/, "ch.");   // collapse bare UUIDs
              return (
                <Link
                  key={`${r.source}_${r.source_id}`}
                  to={`/r/${r.source}/${r.source_id}/${r.chapter_id}`}
                  className="snap-start flex-shrink-0 w-40 group"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="aspect-[2/3] rounded-lg overflow-hidden glass relative"
                  >
                    {cover ? (
                      <img
                        src={cover}
                        alt={label}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-ink-400 text-xs px-3 text-center">
                        {label}
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-ink-900/80">
                      <div
                        className="h-full bg-accent transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </motion.div>
                  <p className="text-sm font-medium line-clamp-2 mt-2">{label}</p>
                  <p className="text-xs text-ink-300">
                    {pct}% — {chapShort}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">Saved</h2>
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
      </section>
    </div>
  );
}
