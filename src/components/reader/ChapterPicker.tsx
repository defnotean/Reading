import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import type { ChapterSummary } from "../../types";

function chapterLabel(c: ChapterSummary): string {
  if (c.title?.trim()) return c.title.trim();
  if (c.number != null) return `Chapter ${c.number}`;
  return "Untitled";
}

interface Props {
  source: string;
  titleId: string;
  chapters: ChapterSummary[];
  currentChapterId: string;
  /** Preserved across navigation for the Back button chain. */
  fromState?: string;
}

export function ChapterPicker({
  source,
  titleId,
  chapters,
  currentChapterId,
  fromState,
}: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLButtonElement>(null);

  const current = chapters.find(c => c.chapter_id === currentChapterId) ?? chapters[0] ?? null;
  const label = current ? chapterLabel(current) : "Chapter";

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  // Scroll current item into view when dropdown opens
  useEffect(() => {
    if (open && currentRef.current) {
      currentRef.current.scrollIntoView({ block: "center" });
    }
  }, [open]);

  function select(ch: ChapterSummary) {
    setOpen(false);
    if (ch.chapter_id !== currentChapterId) {
      navigate(`/r/${source}/${titleId}/${ch.chapter_id}`, {
        state: { from: fromState },
      });
    }
  }

  return (
    <div ref={containerRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-ink-700/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent max-w-[220px] min-w-0"
      >
        <span className="text-xs text-ink-400 truncate leading-tight">{label}</span>
        <ChevronDown
          size={11}
          className={`text-ink-500 flex-shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 w-72 max-h-[60vh] overflow-y-auto z-50 rounded-lg glass border border-ink-700/60 shadow-2xl py-1"
          style={{ minWidth: "200px" }}
        >
          {chapters.length === 0 ? (
            <p className="px-3 py-2 text-xs text-ink-400">No chapters available.</p>
          ) : (
            chapters.map(ch => {
              const isCurrent = ch.chapter_id === currentChapterId;
              return (
                <button
                  key={ch.chapter_id}
                  ref={isCurrent ? currentRef : undefined}
                  type="button"
                  onClick={() => select(ch)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-baseline gap-2 hover:bg-ink-700/40 transition-colors ${
                    isCurrent
                      ? "text-accent bg-ink-700/30 font-semibold"
                      : "text-ink-200"
                  }`}
                >
                  {ch.number != null && (
                    <span className="font-mono text-ink-400 w-10 flex-shrink-0">
                      {ch.number}
                    </span>
                  )}
                  <span className="truncate flex-1">{chapterLabel(ch)}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
