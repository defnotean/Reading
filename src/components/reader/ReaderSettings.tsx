import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlignJustify, LayoutGrid,
  ArrowLeftRight, ArrowRight,
  Maximize, Minimize, Image as ImageIcon,
  Sun, Moon, Coffee,
  Type, AlignVerticalSpaceAround,
} from "lucide-react";
import {
  useReaderSettings,
  type FitMode, type Theme, type FontSize, type LineSpacing,
  type FontFamily, type ReadingMode,
} from "../../stores/useReaderSettings";

interface Props {
  open: boolean;
  onClose: () => void;
  kind: "manga_pages" | "novel_text";
}

export function ReaderSettings({ open, onClose, kind }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const s = useReaderSettings();

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: -6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="absolute right-3 top-14 z-30 w-72 glass rounded-xl shadow-glow p-3 space-y-3 text-sm"
        >
          {kind === "manga_pages" ? (
            <>
              <Row label="Mode">
                <Toggle<ReadingMode>
                  options={[
                    { v: "paginated",  label: "Pages",      Icon: AlignJustify },
                    { v: "continuous", label: "Continuous", Icon: LayoutGrid   },
                  ]}
                  current={s.mangaMode}
                  onSelect={v => s.set("mangaMode", v)}
                />
              </Row>
              <Row label="Direction">
                <Toggle
                  options={[
                    { v: "ltr", label: "LTR", Icon: ArrowRight      },
                    { v: "rtl", label: "RTL", Icon: ArrowLeftRight  },
                  ]}
                  current={s.mangaDirection}
                  onSelect={v => s.set("mangaDirection", v)}
                />
              </Row>
              <Row label="Fit">
                <Toggle<FitMode>
                  options={[
                    { v: "width",  label: "Width",  Icon: Maximize  },
                    { v: "height", label: "Height", Icon: Minimize  },
                    { v: "actual", label: "Actual", Icon: ImageIcon },
                  ]}
                  current={s.mangaFit}
                  onSelect={v => s.set("mangaFit", v)}
                />
              </Row>
            </>
          ) : (
            <>
              <Row label="Mode">
                <Toggle<ReadingMode>
                  options={[
                    { v: "paginated",  label: "Pages",      Icon: AlignJustify },
                    { v: "continuous", label: "Continuous", Icon: LayoutGrid   },
                  ]}
                  current={s.novelMode}
                  onSelect={v => s.set("novelMode", v)}
                />
              </Row>
              <Row label="Theme">
                <Toggle<Theme>
                  options={[
                    { v: "dark",  label: "Dark",  Icon: Moon   },
                    { v: "sepia", label: "Sepia", Icon: Coffee },
                    { v: "light", label: "Light", Icon: Sun    },
                  ]}
                  current={s.novelTheme}
                  onSelect={v => s.set("novelTheme", v)}
                />
              </Row>
              <Row label="Font">
                <Toggle<FontFamily>
                  options={[
                    { v: "serif", label: "Serif", Icon: Type                    },
                    { v: "sans",  label: "Sans",  Icon: AlignVerticalSpaceAround },
                  ]}
                  current={s.novelFont}
                  onSelect={v => s.set("novelFont", v)}
                />
              </Row>
              <Row label="Size">
                <Slider<FontSize>
                  options={["xs", "sm", "base", "lg", "xl"]}
                  current={s.novelSize}
                  onSelect={v => s.set("novelSize", v)}
                />
              </Row>
              <Row label="Spacing">
                <Slider<LineSpacing>
                  options={["tight", "normal", "loose"]}
                  current={s.novelSpacing}
                  onSelect={v => s.set("novelSpacing", v)}
                />
              </Row>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs uppercase tracking-wider text-ink-400 w-20 flex-shrink-0">{label}</span>
      <div className="flex-1 flex justify-end">{children}</div>
    </div>
  );
}

interface ToggleOption<T extends string> {
  v: T;
  label: string;
  Icon: React.ComponentType<{ size?: number }>;
}

function Toggle<T extends string>({
  options, current, onSelect,
}: {
  options: ToggleOption<T>[];
  current: T;
  onSelect: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 bg-ink-800/60 rounded-md p-0.5">
      {options.map(({ v, label, Icon }) => (
        <button
          key={v}
          onClick={() => onSelect(v)}
          title={label}
          className={`px-2 py-1 rounded flex items-center gap-1 transition-colors ${
            current === v
              ? "bg-accent text-white"
              : "text-ink-300 hover:text-ink-100"
          }`}
        >
          <Icon size={13} />
          <span className="text-xs hidden md:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}

function Slider<T extends string>({
  options, current, onSelect,
}: {
  options: T[];
  current: T;
  onSelect: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-1 bg-ink-800/60 rounded-md p-0.5">
      {options.map(o => (
        <button
          key={o}
          onClick={() => onSelect(o)}
          className={`px-2 py-1 rounded text-xs capitalize transition-colors ${
            current === o
              ? "bg-accent text-white"
              : "text-ink-300 hover:text-ink-100"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
