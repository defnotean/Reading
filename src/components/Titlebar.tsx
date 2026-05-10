import { BookOpen, Minus, Square, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";

const win = getCurrentWindow();

export function Titlebar() {
  return (
    <div
      className="h-9 flex items-center select-none flex-shrink-0 relative z-50"
      style={{
        background: "rgba(15, 15, 20, 0.85)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Left: app icon + title */}
      <div className="flex items-center gap-2 px-3 flex-shrink-0">
        <BookOpen size={14} className="text-accent opacity-90" />
        <span className="text-xs font-semibold tracking-wide text-ink-300">
          Reading
        </span>
      </div>

      {/* Middle: drag region */}
      <div
        className="flex-1 h-full"
        data-tauri-drag-region
      />

      {/* Right: window controls */}
      <div className="flex items-center flex-shrink-0">
        <button
          onClick={() => void win.minimize()}
          aria-label="Minimize"
          className="w-8 h-9 flex items-center justify-center text-ink-400 hover:text-ink-100 hover:bg-ink-700/60 transition-colors focus:outline-none"
        >
          <Minus size={12} />
        </button>
        <button
          onClick={() => void win.toggleMaximize()}
          aria-label="Maximize"
          className="w-8 h-9 flex items-center justify-center text-ink-400 hover:text-ink-100 hover:bg-ink-700/60 transition-colors focus:outline-none"
        >
          <Square size={11} />
        </button>
        <button
          onClick={() => void win.close()}
          aria-label="Close"
          className="w-8 h-9 flex items-center justify-center text-ink-400 hover:text-white hover:bg-red-500/80 transition-colors focus:outline-none"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
