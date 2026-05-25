import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useToast } from "../stores/useToast";

const ICON = { error: AlertCircle, info: Info, success: CheckCircle2 } as const;

export function Toaster() {
  const { toasts, dismiss } = useToast();
  return (
    <div
      data-testid="toaster-stack"
      className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] left-3 right-3 md:bottom-6 sm:left-auto sm:right-6 flex flex-col gap-2 z-50 pointer-events-none"
    >
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
              role={t.kind === "error" ? "alert" : "status"}
              aria-live={t.kind === "error" ? "assertive" : "polite"}
              className="glass rounded-lg px-4 py-3 flex items-start gap-3 w-full sm:w-auto sm:max-w-sm pointer-events-auto shadow-glow"
            >
              <Icon size={18} className={t.kind === "error" ? "text-red-400" : "text-accent-soft"} />
              <p className="text-sm flex-1">{t.message}</p>
              <button
                aria-label={`Dismiss ${t.message} notification`}
                onClick={() => dismiss(t.id)}
                className="text-ink-300 hover:text-ink-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
              >
                <X size={16} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
