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
      className="w-16 hover:w-48 transition-[width] duration-200 ease-out h-full glass border-r border-ink-700/60 flex flex-col py-4 gap-1 group"
    >
      {items.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          aria-label={label}
          className={({ isActive }) =>
            clsx(
              "mx-2 px-3 py-2 rounded-lg flex items-center gap-3 focus-ring",
              "text-ink-300 hover:text-ink-100 hover:bg-ink-700/60",
              isActive && "bg-accent/20 text-ink-100"
            )
          }
        >
          <Icon size={20} />
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-sm">
            {label}
          </span>
        </NavLink>
      ))}
    </motion.aside>
  );
}
