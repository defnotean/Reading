import { create } from "zustand";

export type ReadingMode = "paginated" | "continuous";
type Kind = "manga" | "novel";

const KEY = (k: Kind) => `reading.mode.${k}`;

function load(k: Kind): ReadingMode {
  const v = localStorage.getItem(KEY(k));
  return v === "continuous" ? "continuous" : "paginated";
}

interface State {
  manga: ReadingMode;
  novel: ReadingMode;
  set: (k: Kind, m: ReadingMode) => void;
  toggle: (k: Kind) => void;
}

export const useReadingMode = create<State>((set, get) => ({
  manga: load("manga"),
  novel: load("novel"),
  set: (k, m) => {
    localStorage.setItem(KEY(k), m);
    set({ [k]: m } as Partial<State>);
  },
  toggle: (k) => {
    const next: ReadingMode = get()[k] === "paginated" ? "continuous" : "paginated";
    localStorage.setItem(KEY(k), next);
    set({ [k]: next } as Partial<State>);
  },
}));
