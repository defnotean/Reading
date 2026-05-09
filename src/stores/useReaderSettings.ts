import { create } from "zustand";

export type ReadingMode      = "paginated" | "continuous";
export type ReadingDirection = "ltr" | "rtl";
export type FitMode          = "width" | "height" | "actual";
export type Theme            = "dark" | "sepia" | "light";
export type FontFamily       = "sans" | "serif";
export type FontSize         = "xs" | "sm" | "base" | "lg" | "xl";
export type LineSpacing      = "tight" | "normal" | "loose";

interface State {
  // Manga
  mangaMode:      ReadingMode;
  mangaDirection: ReadingDirection;
  mangaFit:       FitMode;
  // Novel
  novelMode:      ReadingMode;
  novelTheme:     Theme;
  novelFont:      FontFamily;
  novelSize:      FontSize;
  novelSpacing:   LineSpacing;
  // Cross-cutting
  hintSeen:       boolean;

  set:                  <K extends keyof State>(k: K, v: State[K]) => void;
  toggleMangaMode:      () => void;
  toggleNovelMode:      () => void;
  toggleMangaDirection: () => void;
  cycleFitMode:         () => void;
  cycleTheme:           () => void;
  cycleFontSize:        () => void;
  cycleSpacing:         () => void;
}

const KEY = "reading.settings.v1";

function load(): Partial<State> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<State>;
  } catch { return {}; }
}

function persist(s: State) {
  // Strip functions before serializing
  const {
    set: _s,
    toggleMangaMode: _a,
    toggleNovelMode: _n,
    toggleMangaDirection: _b,
    cycleFitMode: _c,
    cycleTheme: _d,
    cycleFontSize: _e,
    cycleSpacing: _f,
    ...data
  } = s;
  void _s; void _a; void _n; void _b; void _c; void _d; void _e; void _f;
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* storage may be unavailable */ }
}

const defaults: Pick<State,
  "mangaMode" | "mangaDirection" | "mangaFit" |
  "novelMode" | "novelTheme" | "novelFont" | "novelSize" | "novelSpacing" | "hintSeen"
> = {
  mangaMode:      "paginated",
  mangaDirection: "ltr",
  mangaFit:       "width",
  novelMode:      "paginated",
  novelTheme:     "dark",
  novelFont:      "serif",
  novelSize:      "base",
  novelSpacing:   "normal",
  hintSeen:       false,
};

export const useReaderSettings = create<State>((set, get) => {
  const initial = { ...defaults, ...load() };
  return {
    ...initial,
    set: (k, v) => {
      set({ [k]: v } as Partial<State>);
      persist(get());
    },
    toggleMangaMode: () => {
      set({ mangaMode: get().mangaMode === "paginated" ? "continuous" : "paginated" });
      persist(get());
    },
    toggleNovelMode: () => {
      set({ novelMode: get().novelMode === "paginated" ? "continuous" : "paginated" });
      persist(get());
    },
    toggleMangaDirection: () => {
      set({ mangaDirection: get().mangaDirection === "ltr" ? "rtl" : "ltr" });
      persist(get());
    },
    cycleFitMode: () => {
      const order: FitMode[] = ["width", "height", "actual"];
      const i = order.indexOf(get().mangaFit);
      set({ mangaFit: order[(i + 1) % order.length] });
      persist(get());
    },
    cycleTheme: () => {
      const order: Theme[] = ["dark", "sepia", "light"];
      const i = order.indexOf(get().novelTheme);
      set({ novelTheme: order[(i + 1) % order.length] });
      persist(get());
    },
    cycleFontSize: () => {
      const order: FontSize[] = ["xs", "sm", "base", "lg", "xl"];
      const i = order.indexOf(get().novelSize);
      set({ novelSize: order[(i + 1) % order.length] });
      persist(get());
    },
    cycleSpacing: () => {
      const order: LineSpacing[] = ["tight", "normal", "loose"];
      const i = order.indexOf(get().novelSpacing);
      set({ novelSpacing: order[(i + 1) % order.length] });
      persist(get());
    },
  };
});

// Map size + spacing to actual Tailwind classes for the prose.
export const SIZE_CLASSES: Record<FontSize, string> = {
  xs:   "text-sm",
  sm:   "text-[15px]",
  base: "text-base",
  lg:   "text-lg",
  xl:   "text-xl",
};
export const SPACING_CLASSES: Record<LineSpacing, string> = {
  tight:  "leading-snug",
  normal: "leading-relaxed",
  loose:  "leading-loose",
};
