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
    <motion.aside
      initial={{ x: -8, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 24 }}
      className="w-20 h-full glass border-r border-ink-700/60 flex flex-col py-3 gap-1 flex-shrink-0"
    >
      {items.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          aria-label={label}
          className={({ isActive }) =>
            clsx(
              "mx-2 px-1 py-2.5 rounded-lg flex flex-col items-center gap-1 focus-ring transition-colors",
              "text-ink-300 hover:text-ink-100 hover:bg-ink-700/60",
              isActive && "bg-accent/20 text-accent-soft"
            )
          }
        >
          <Icon size={22} strokeWidth={2} />
          <span className="text-[10px] font-medium tracking-wide">
            {label}
          </span>
        </NavLink>
      ))}
    </motion.aside>
  );
}
