import { Link } from "react-router-dom";
import type { ChapterSummary, TitleSummary } from "../types";

export function ChapterList({
  summary, chapters, from,
}: { summary: TitleSummary; chapters: ChapterSummary[]; from?: string }) {
  if (chapters.length === 0) {
    return <p className="text-ink-300 text-sm">No chapters available.</p>;
  }

  return (
    <ul className="divide-y divide-ink-700/40 rounded-lg overflow-hidden glass">
      {chapters.map(c => (
        <li key={c.chapter_id}>
          <Link
            to={`/r/${summary.source}/${summary.source_id}/${c.chapter_id}`}
            state={{ from }}
            className="flex items-baseline gap-3 px-4 py-2.5 hover:bg-ink-700/40 focus-ring"
          >
            <span className="text-accent text-sm font-mono w-12">
              {c.number != null ? `${c.number}` : "-"}
            </span>
            <span className="text-sm flex-1 truncate">
              {c.title?.trim() || (c.number != null ? `Chapter ${c.number}` : "Untitled")}
            </span>
            {c.published_at && (
              <span className="text-xs text-ink-300">
                {new Date(c.published_at * 1000).toLocaleDateString()}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
