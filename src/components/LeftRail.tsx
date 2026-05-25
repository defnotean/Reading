import { NavLink } from "react-router-dom";
import { Library, Compass, Settings } from "lucide-react";
import { motion } from "framer-motion";
import clsx from "clsx";

const items = [
  { to: "/",         label: "Browse",   Icon: Compass  },
  { to: "/library",  label: "Library",  Icon: Library  },
  { to: "/settings", label: "Settings", Icon: Settings },
] as const;

export function LeftRail() {
  return (
    <motion.nav
      aria-label="Desktop primary"
      initial={{ x: -8, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 24 }}
      className="hidden md:flex w-20 h-full glass border-r border-ink-700/60 flex-col py-3 gap-1 flex-shrink-0"
    >
      {items.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          aria-label={label}
          title={label}
          className={({ isActive }) =>
            clsx(
              "group relative mx-2 min-h-16 px-1 py-2.5 rounded-lg flex flex-col items-center justify-center gap-1 focus-ring transition-colors",
              "text-ink-300 hover:text-ink-100 hover:bg-ink-700/60",
              isActive && "bg-accent/20 text-accent-soft shadow-[inset_0_0_0_1px_rgba(124,92,255,0.28)]"
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={clsx(
                  "absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-accent transition-opacity",
                  isActive ? "opacity-100" : "opacity-0"
                )}
              />
              <Icon size={22} strokeWidth={2} aria-hidden="true" className="transition-transform group-hover:scale-105" />
              <span className="text-[10px] font-medium tracking-wide">
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </motion.nav>
  );
}
