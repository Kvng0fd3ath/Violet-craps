import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, RefreshCw } from "lucide-react";

/** Slides in when a newer build is live on the server. */
export function UpdateBar({ show, onApply }: { show: boolean; onApply: () => void }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.button
          type="button"
          onClick={onApply}
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          className="fixed inset-x-0 top-0 z-[70] mx-auto flex w-full max-w-lg items-center justify-between gap-3 border-b border-gold-400/40 bg-gradient-to-r from-felt-800 to-felt-700 px-4 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
        >
          <span className="flex items-center gap-2 text-left">
            <Sparkles size={15} className="flex-none text-gold-300" />
            <span>
              <span className="block text-[12px] font-black leading-4 text-white">
                New version ready
              </span>
              <span className="block text-[9.5px] font-semibold text-purple-200/70">
                Fresh features are waiting at the table
              </span>
            </span>
          </span>
          <span className="btn-press flex flex-none items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-purple-950">
            <RefreshCw size={12} strokeWidth={3} />
            Update
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
