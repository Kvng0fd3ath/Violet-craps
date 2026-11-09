import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Volume2,
  VolumeX,
  ChevronsUp,
  Split,
  Wallet,
  ToggleLeft,
  ToggleRight,
  Eraser,
  Mic,
  MicOff,
  Video,
  VideoOff,
} from "lucide-react";
import { cn } from "../utils/cn";
import { InstallCard } from "./InstallCard";
import type { InstallState } from "../net/useAppUpdate";

const PAYOUTS: { bet: string; pays: string; note: string }[] = [
  { bet: "Pass Line / Don't Pass", pays: "1:1", note: "even money · don't pushes on 12" },
  { bet: "Odds behind the line", pays: "2:1 · 3:2 · 6:5", note: "4/10 · 5/9 · 6/8 — true odds, up to 5×" },
  { bet: "Place 4 or 10", pays: "9:5", note: "off on come-out unless working" },
  { bet: "Place 5 or 9", pays: "7:5", note: "off on come-out unless working" },
  { bet: "Place 6 or 8", pays: "7:6", note: "off on come-out unless working" },
  { bet: "Field", pays: "1:1", note: "2 pays double · 12 pays triple" },
  { bet: "Hard 4 / Hard 10", pays: "7:1", note: "always working — 7 or easy kills it" },
  { bet: "Hard 6 / Hard 8", pays: "9:1", note: "always working — 7 or easy kills it" },
  { bet: "Any Seven", pays: "4:1", note: "one roll only" },
  { bet: "Any Craps", pays: "7:1", note: "2 · 3 · 12 — one roll only" },
];

function Row({ icon: Icon, title, body, tone }: { icon: typeof ChevronsUp; title: string; body: string; tone: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className={cn("mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-lg", tone)}>
        <Icon size={16} strokeWidth={2.5} />
      </div>
      <div>
        <div className="font-num text-sm tracking-widest text-white">{title}</div>
        <div className="text-[11px] leading-4 text-purple-200/75">{body}</div>
      </div>
    </div>
  );
}

export function HelpSheet({
  open,
  onClose,
  soundOn,
  onToggleSound,
  placeOnComeOut,
  onToggleComeOut,
  onReset,
  inRoom,
  micOn,
  camOn,
  onToggleMic,
  onToggleCam,
  install,
  onCheckUpdate,
  checking,
  updateReady,
  onApplyUpdate,
}: {
  open: boolean;
  onClose: () => void;
  soundOn: boolean;
  onToggleSound: () => void;
  placeOnComeOut: boolean;
  onToggleComeOut: () => void;
  onReset?: () => void;
  inRoom?: boolean;
  micOn?: boolean;
  camOn?: boolean;
  onToggleMic?: () => void;
  onToggleCam?: () => void;
  install: InstallState;
  onCheckUpdate: () => void;
  checking: boolean;
  updateReady: boolean;
  onApplyUpdate: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[82dvh] w-full max-w-lg overflow-hidden rounded-t-[28px] border-t border-gold-400/30 bg-felt-950 shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 pb-1 pt-4">
              <h2 className="gold-text font-display text-lg font-bold tracking-widest">HOUSE RULES</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white active:scale-90"
              >
                <X size={18} />
              </button>
            </div>
            <div className="no-scrollbar max-h-[calc(82dvh-64px)] overflow-y-auto px-5 pb-8">
              {/* press / pinch / pocket */}
              <div className="rounded-2xl border border-gold-400/25 bg-gold-400/[0.06] p-3.5">
                <div className="mb-2.5 text-[10px] font-black uppercase tracking-[0.25em] text-gold-300">
                  When your place or hardway bet hits
                </div>
                <div className="space-y-2.5">
                  <Row
                    icon={ChevronsUp}
                    title="PRESS IT"
                    body="Every dollar of the payout rides onto the bet. Classic move — run it up."
                    tone="btn-press text-purple-950"
                  />
                  <Row
                    icon={Split}
                    title="PINCH"
                    body="Pick any number on the board — half the payout presses onto it, half drops into your rack."
                    tone="bg-white/10 text-white"
                  />
                  <Row
                    icon={Wallet}
                    title="POCKET"
                    body="Take the whole payout to the rack and keep the same bet. Do nothing and the next roll auto-pockets for you."
                    tone="bg-emerald-400 text-emerald-950"
                  />
                </div>
              </div>

              {/* lobby mic / camera */}
              {inRoom && (
                <div className="mt-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.25em] text-gold-300">
                    Table chat
                  </div>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={onToggleMic}
                      className={cn(
                        "flex items-center justify-between rounded-xl border px-3.5 py-3 transition active:scale-[0.98]",
                        micOn
                          ? "border-emerald-400/50 bg-emerald-400/15"
                          : "border-white/10 bg-white/[0.05]"
                      )}
                    >
                      <span className={cn("text-sm font-bold", micOn ? "text-emerald-300" : "text-white/70")}>
                        Microphone
                      </span>
                      {micOn ? (
                        <Mic size={18} className="text-emerald-400" />
                      ) : (
                        <MicOff size={18} className="text-white/40" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={onToggleCam}
                      className={cn(
                        "flex items-center justify-between rounded-xl border px-3.5 py-3 transition active:scale-[0.98]",
                        camOn
                          ? "border-emerald-400/50 bg-emerald-400/15"
                          : "border-white/10 bg-white/[0.05]"
                      )}
                    >
                      <span className={cn("text-sm font-bold", camOn ? "text-emerald-300" : "text-white/70")}>
                        Camera
                      </span>
                      {camOn ? (
                        <Video size={18} className="text-emerald-400" />
                      ) : (
                        <VideoOff size={18} className="text-white/40" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* settings */}
              <div className="mt-3 space-y-1.5">
                <button
                  type="button"
                  onClick={onToggleComeOut}
                  className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-3 text-left active:scale-[0.99]"
                >
                  <div>
                    <div className="text-sm font-bold text-white">Place bets on come-out</div>
                    <div className="text-[10px] text-purple-200/65">
                      {placeOnComeOut ? "Working on every roll — a come-out 7 takes them" : "Off on come-out rolls (house default)"}
                    </div>
                  </div>
                  {placeOnComeOut ? (
                    <ToggleRight size={28} className="text-gold-400" />
                  ) : (
                    <ToggleLeft size={28} className="text-white/40" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={onToggleSound}
                  className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-3 text-left active:scale-[0.99]"
                >
                  <div>
                    <div className="text-sm font-bold text-white">Table sounds &amp; dealer calls</div>
                    <div className="text-[10px] text-purple-200/65">Dealer voice depends on your device and browser.</div>
                  </div>
                  {soundOn ? <Volume2 size={22} className="text-gold-400" /> : <VolumeX size={22} className="text-white/40" />}
                </button>
              </div>

              {/* payouts */}
              <div className="mt-4 text-[10px] font-black uppercase tracking-[0.25em] text-gold-300">
                Real casino odds
              </div>
              <div className="mt-1.5 overflow-hidden rounded-2xl border border-white/10">
                {PAYOUTS.map((p, i) => (
                  <div
                    key={p.bet}
                    className={cn(
                      "flex items-center justify-between gap-3 px-3.5 py-2.5",
                      i % 2 === 0 ? "bg-white/[0.05]" : "bg-transparent"
                    )}
                  >
                    <div>
                      <div className="text-[13px] font-bold text-white">{p.bet}</div>
                      <div className="text-[10px] text-purple-200/60">{p.note}</div>
                    </div>
                    <div className="font-num text-lg tracking-wider text-gold-300">{p.pays}</div>
                  </div>
                ))}
              </div>
                <p className="mt-3 text-center text-[10px] text-purple-200/50">
                  Pass line is a contract bet: once a point is set it stays until it wins or sevens out.
                </p>
                <InstallCard
                  install={install}
                  onCheckUpdate={onCheckUpdate}
                  checking={checking}
                  updateReady={updateReady}
                  onApplyUpdate={onApplyUpdate}
                />

                {onReset && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={onReset}
                      className="w-full rounded-xl border border-red-400/30 bg-red-950/20 px-3.5 py-3 text-left active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2">
                        <Eraser size={16} className="text-red-400" />
                        <span className="text-sm font-bold text-red-300">Reset session</span>
                      </div>
                      <div className="text-[10px] text-red-300/60">
                        Clears rack, bets, and point — fresh $1,000
                      </div>
                    </button>
                  </div>
                )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
