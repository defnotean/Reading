import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

interface Shortcut { keys: string; label: string; }

interface Props {
  open: boolean;
  onClose: () => void;
  kind: "manga_pages" | "novel_text";
}

const COMMON: Shortcut[] = [
  { keys: "Esc",  label: "Back to title (or close overlays)" },
  { keys: "[ ]",  label: "Previous / next chapter" },
  { keys: "?",    label: "Show / hide this overlay" },
  { keys: "S",    label: "Open settings panel" },
  { keys: "M",    label: "Toggle paginated / continuous mode" },
];

const MANGA_ONLY: Shortcut[] = [
  { keys: "← →",  label: "Previous / next page" },
  { keys: "F",    label: "Cycle fit mode (width / height / actual)" },
  { keys: "D",    label: "Toggle reading direction (LTR / RTL)" },
];

const NOVEL_ONLY: Shortcut[] = [
  { keys: "← →",       label: "Previous / next page (paginated)" },
  { keys: "PgUp PgDn", label: "Previous / next page" },
  { keys: "T",         label: "Cycle theme (dark / sepia / light)" },
  { keys: "+ -",       label: "Increase / decrease font size" },
];

export function ShortcutsOverlay({ open, onClose, kind }: Props) {
  const list = [
    ...(kind === "manga_pages" ? MANGA_ONLY : NOVEL_ONLY),
    ...COMMON,
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-40 bg-ink-950/70 backdrop-blur-md flex items-center justify-center p-8"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="glass rounded-2xl shadow-glow w-full max-w-md p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Keyboard shortcuts</h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="text-ink-300 hover:text-ink-100 focus-ring rounded-md p-1"
              >
                <X size={18} />
              </button>
            </div>
            <ul className="space-y-2.5">
              {list.map(s => (
                <li key={s.keys} className="flex items-center gap-3 text-sm">
                  <kbd className="font-mono text-xs px-2 py-0.5 rounded border border-ink-600 bg-ink-800 text-ink-100 min-w-[3.5rem] text-center">
                    {s.keys}
                  </kbd>
                  <span className="text-ink-200">{s.label}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-ink-400 mt-5 italic">Click anywhere outside to close.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
