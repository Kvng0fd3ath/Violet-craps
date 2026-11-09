import { motion, AnimatePresence } from "framer-motion";
import { Info, TriangleAlert } from "lucide-react";
import { cn } from "../utils/cn";
import type { Toast } from "../hooks/useCraps";

export function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    /*
     * Sits just below the header, not over it. This used to start at top-14,
     * which lands the stack on the header's own first line: the pill's
     * backdrop blur then smeared "VIOLET FELT" and the balance readout. The
     * pill is also fully opaque now, so it never needs to sample what is
     * behind it.
     */
    <div className="pointer-events-none fixed left-1/2 top-[calc(env(safe-area-inset-top,0px)+4.5rem)] z-50 flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-1.5 px-4">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -14, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3.5 py-2 text-[12px] font-semibold shadow-xl",
              t.kind === "warn"
                ? "border-red-400/60 bg-red-950 text-red-200"
                : "border-gold-400/50 bg-felt-950 text-gold-300"
            )}
          >
            {t.kind === "warn" ? <TriangleAlert size={13} /> : <Info size={13} />}
            <span className="leading-4">{t.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
