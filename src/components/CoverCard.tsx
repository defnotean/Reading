import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { TitleSummary } from "../types";

export function CoverCard({ item }: { item: TitleSummary }) {
  const src = item.cover_path ? convertFileSrc(item.cover_path) : item.cover_url ?? undefined;
  const location = useLocation();
  // Remember the list view the user came from so the Title's Back button
  // returns there instead of `navigate(-1)`-ing into a Reader detour.
  const from = location.pathname.startsWith("/t/") || location.pathname.startsWith("/r/")
    ? "/"
    : location.pathname;
  return (
    <Link to={`/t/${item.source}/${item.source_id}`} state={{ from }} aria-label={item.title}>
      <motion.div
        layoutId={`cover-${item.source}-${item.source_id}`}
        whileHover={{ y: -4, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="group rounded-lg overflow-hidden glass focus-ring cursor-pointer"
      >
        <div className="aspect-[2/3] bg-ink-800 relative overflow-hidden">
          {src ? (
            <img
              src={src}
              alt={item.title}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-ink-400 text-xs">
              {item.title}
            </div>
          )}
        </div>
        <div className="p-2.5">
          <p className="text-sm font-medium line-clamp-2 leading-snug">{item.title}</p>
          {item.author && (
            <p className="text-xs text-ink-300 truncate mt-1">{item.author}</p>
          )}
        </div>
      </motion.div>
    </Link>
  );
}
