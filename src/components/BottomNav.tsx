import { NavLink } from "react-router-dom";
import { Compass, Library, Settings } from "lucide-react";
import clsx from "clsx";

const items = [
  { to: "/", label: "Browse", Icon: Compass },
  { to: "/library", label: "Library", Icon: Library },
  { to: "/settings", label: "Settings", Icon: Settings },
] as const;

interface BottomNavProps {
  forceVisible?: boolean;
}

export function BottomNav({ forceVisible = false }: BottomNavProps) {
  return (
    <nav
      aria-label="Mobile primary"
      className={clsx(
        "fixed inset-x-0 bottom-0 z-50 border-t border-ink-700/70 bg-ink-950/95 backdrop-blur-xl px-2 pt-1 pb-[calc(0.5rem+env(safe-area-inset-bottom))]",
        !forceVisible && "md:hidden"
      )}
    >
      <div className="grid grid-cols-3 gap-1">
        {items.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            aria-label={label}
            className={({ isActive }) =>
              clsx(
                "min-h-14 rounded-lg flex flex-col items-center justify-center gap-1 focus-ring transition-colors touch-manipulation",
                "text-ink-300 active:bg-ink-700/70",
                isActive && "text-accent-soft bg-accent/15"
              )
            }
          >
            <Icon size={22} strokeWidth={2} aria-hidden="true" />
            <span className="text-[11px] font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
