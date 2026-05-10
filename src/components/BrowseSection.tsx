import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cachedBrowse } from "../stores/useCache";
import type { BrowseList, TitleSummary } from "../types";
import { CoverCard } from "./CoverCard";
import { toastError } from "../stores/useToast";

interface Props {
  source: string;
  list: BrowseList;
  label: string;
}

export function BrowseSection({ source, list, label }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [items, setItems] = useState<TitleSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  // Lazy load: only fetch when section enters viewport
  useEffect(() => {
    if (visible || !ref.current) return;
    const obs = new IntersectionObserver(
      entries => { if (entries.some(e => e.isIntersecting)) setVisible(true); },
      { rootMargin: "200px 0px" }   // start fetching slightly before it enters
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible || items !== null) return;
    let cancelled = false;
    setLoading(true);
    cachedBrowse(source, list, 0)
      .then(rows => { if (!cancelled) setItems(rows); })
      .catch(e => { if (!cancelled) {
        toastError(`${label}: ${e?.message ?? String(e)}`);
        setItems([]);
      }})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [visible, source, list, label, items]);

  // Reset on source or list change
  useEffect(() => {
    setItems(null);
    setVisible(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, JSON.stringify(list)]);

  function scrollBy(delta: number) {
    scrollerRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  }

  return (
    <section ref={ref} className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold tracking-tight">{label}</h2>
        {items && items.length > 0 && (
          <div className="flex gap-1">
            <button
              onClick={() => scrollBy(-600)}
              aria-label={`Scroll ${label} left`}
              className="rounded-md p-1 text-ink-300 hover:text-ink-100 hover:bg-ink-700/60 focus-ring"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => scrollBy(600)}
              aria-label={`Scroll ${label} right`}
              className="rounded-md p-1 text-ink-300 hover:text-ink-100 hover:bg-ink-700/60 focus-ring"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
      <div
        ref={scrollerRef}
        className="flex gap-4 overflow-x-auto snap-x scroll-px-2 -mx-2 px-2 pb-2 [scrollbar-width:thin]"
      >
        {loading || !items ? (
          // Skeleton cards
          Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.02 }}
              className="snap-start flex-shrink-0 w-40 aspect-[2/3] rounded-lg bg-gradient-to-br from-ink-800 via-ink-700 to-ink-800 bg-[length:200%_100%] animate-shimmer"
            />
          ))
        ) : items.length === 0 ? (
          <p className="text-ink-300 text-sm py-8">Nothing here.</p>
        ) : (
          items.slice(0, 20).map(t => (
            <div key={`${t.source}_${t.source_id}`} className="snap-start flex-shrink-0 w-40">
              <CoverCard item={t} />
            </div>
          ))
        )}
      </div>
    </section>
  );
}
