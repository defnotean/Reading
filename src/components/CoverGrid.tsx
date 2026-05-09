import { motion, type Variants } from "framer-motion";
import type { TitleSummary } from "../types";
import { CoverCard } from "./CoverCard";

const container: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.025 } },
};
const item: Variants = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 220, damping: 24 } },
};

export function CoverGrid({ items }: { items: TitleSummary[] }) {
  return (
    <motion.ul
      variants={container}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
    >
      {items.map(t => (
        <motion.li key={`${t.source}_${t.source_id}`} variants={item}>
          <CoverCard item={t} />
        </motion.li>
      ))}
    </motion.ul>
  );
}
