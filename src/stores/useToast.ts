import { create } from "zustand";

export type ToastKind = "info" | "error" | "success";
export interface Toast { id: number; kind: ToastKind; message: string; }

interface ToastStore {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToast = create<ToastStore>((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = nextId++;
    set({ toasts: [...get().toasts, { id, ...t }] });
    setTimeout(() => get().dismiss(id), 5000);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter(x => x.id !== id) }),
}));

export function toastError(message: string) {
  useToast.getState().push({ kind: "error", message });
}
export function toastInfo(message: string) {
  useToast.getState().push({ kind: "info", message });
}
