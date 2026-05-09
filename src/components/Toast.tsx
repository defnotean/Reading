import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useToast } from "../stores/useToast";

const ICON = { error: AlertCircle, info: Info, success: CheckCircle2 } as const;

export function Toaster() {
  const { toasts, dismiss } = useToast();
  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => {
          const Icon = ICON[t.kind];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 240, damping: 26 }}
              className="glass rounded-lg px-4 py-3 flex items-start gap-3 max-w-sm pointer-events-auto shadow-glow"
            >
              <Icon size={18} className={t.kind === "error" ? "text-red-400" : "text-accent-soft"} />
              <p className="text-sm flex-1">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="text-ink-300 hover:text-ink-100">
                <X size={16} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
