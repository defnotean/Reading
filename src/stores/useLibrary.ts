import { create } from "zustand";
import { libraryList, setStarred, continueReading } from "../ipc/library";
import type { ProgressRecord, TitleRecord } from "../types";

interface LibraryStore {
  items: TitleRecord[];
  recents: ProgressRecord[];
  loading: boolean;
  refresh: () => Promise<void>;
  remove: (source: string, id: string) => Promise<void>;
}

export const useLibrary = create<LibraryStore>((set, get) => ({
  items: [],
  recents: [],
  loading: false,
  refresh: async () => {
    set({ loading: true });
    try {
      const [items, recents] = await Promise.all([libraryList(), continueReading(10)]);
      set({ items, recents });
    } finally { set({ loading: false }); }
  },
  remove: async (source, id) => {
    await setStarred(source, id, false);
    set({ items: get().items.filter(x => !(x.source === source && x.source_id === id)) });
  },
}));
