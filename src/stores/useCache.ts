import { create } from "zustand";

const TTL = 5 * 60 * 1000; // 5 minutes

interface Entry<T> {
  value: T;
  loadedAt: number;
}

interface CacheState {
  browse: Map<string, Entry<unknown>>;
  title: Map<string, Entry<unknown>>;
  get: <T>(bucket: "browse" | "title", key: string, ttlMs?: number) => T | null;
  set: <T>(bucket: "browse" | "title", key: string, value: T) => void;
  clear: (bucket?: "browse" | "title") => void;
}

export const useCache = create<CacheState>((set, get) => ({
  browse: new Map(),
  title: new Map(),

  get: <T>(bucket: "browse" | "title", key: string, ttlMs = TTL): T | null => {
    const entry = get()[bucket].get(key) as Entry<T> | undefined;
    if (!entry) return null;
    const age = Date.now() - entry.loadedAt;
    if (age > ttlMs) return null;
    return entry.value;
  },

  set: <T>(bucket: "browse" | "title", key: string, value: T) => {
    set(state => {
      const map = new Map(state[bucket]);
      map.set(key, { value, loadedAt: Date.now() });
      return { [bucket]: map };
    });
  },

  clear: (bucket?: "browse" | "title") => {
    if (!bucket) {
      set({ browse: new Map(), title: new Map() });
    } else {
      set({ [bucket]: new Map() });
    }
  },
}));

// ---------------------------------------------------------------------------
// Stale-while-revalidate helpers
// ---------------------------------------------------------------------------

import { browse as ipBrowse, getTitle as ipGetTitle } from "../ipc/sources";
import type { BrowseList, TitleDetail, TitleSummary } from "../types";

function browseKey(source: string, list: BrowseList): string {
  return JSON.stringify({ source, list });
}

function titleKey(source: string, id: string): string {
  return JSON.stringify({ source, id });
}

/**
 * Cached browse: returns cached value immediately if within TTL, fires a
 * background refresh when stale (stale-while-revalidate pattern).
 * On cache miss, awaits the network call, caches, and returns.
 */
export async function cachedBrowse(
  source: string,
  list: BrowseList,
  page = 0,
): Promise<TitleSummary[]> {
  const cache = useCache.getState();
  const key = browseKey(source, list);
  const cached = cache.get<TitleSummary[]>("browse", key);

  if (cached !== null) {
    // Fresh hit — revalidate silently in background for next render
    const age = Date.now() - (
      (useCache.getState().browse.get(key) as Entry<TitleSummary[]>)?.loadedAt ?? 0
    );
    if (age > TTL / 2) {
      // Half-TTL: kick off background refresh
      ipBrowse(source, list, page)
        .then(rows => useCache.getState().set("browse", key, rows))
        .catch(() => { /* silent */ });
    }
    return cached;
  }

  // Cache miss — await and store
  const rows = await ipBrowse(source, list, page);
  useCache.getState().set("browse", key, rows);
  return rows;
}

/**
 * Cached getTitle: same stale-while-revalidate pattern.
 */
export async function cachedGetTitle(
  source: string,
  id: string,
): Promise<TitleDetail> {
  const cache = useCache.getState();
  const key = titleKey(source, id);
  const cached = cache.get<TitleDetail>("title", key);

  if (cached !== null) {
    const age = Date.now() - (
      (useCache.getState().title.get(key) as Entry<TitleDetail>)?.loadedAt ?? 0
    );
    if (age > TTL / 2) {
      ipGetTitle(source, id)
        .then(detail => useCache.getState().set("title", key, detail))
        .catch(() => { /* silent */ });
    }
    return cached;
  }

  const detail = await ipGetTitle(source, id);
  useCache.getState().set("title", key, detail);
  return detail;
}
