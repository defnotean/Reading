import { create } from "zustand";
import { libraryList, setStarred } from "../ipc/library";
import type { TitleRecord } from "../types";

interface LibraryStore {
  items: TitleRecord[];
  loading: boolean;
  refresh: () => Promise<void>;
  remove: (source: string, id: string) => Promise<void>;
}

export const useLibrary = create<LibraryStore>((set, get) => ({
  items: [],
  loading: false,
  refresh: async () => {
    set({ loading: true });
    try {
      const items = await libraryList();
      set({ items });
    } finally { set({ loading: false }); }
  },
  remove: async (source, id) => {
    await setStarred(source, id, false);
    set({ items: get().items.filter(x => !(x.source === source && x.source_id === id)) });
  },
}));
