import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dices,
  Hand,
  Minus,
  Undo2,
  Eraser,
  ChevronsUp,
  Wallet,
  Split,
} from "lucide-react";
import { cn } from "../utils/cn";
import { PendingWin, PointNumber, POINT_NUMBERS, placeOddsLabel, fmt } from "../game/craps";
import { CHIPS, Mode } from "../hooks/useCraps";
import { Chip } from "./ChipIcon";
import { MiniDie } from "./Dice";

function DecisionButton({
  icon: Icon,
  title,
  caption,
  onClick,
  tone,
}: {
  icon: typeof ChevronsUp;
  title: string;
  caption: string;
  onClick: () => void;
  tone: "gold" | "ghost" | "green";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-2 transition-transform active:scale-95",
        tone === "gold" && "btn-press text-purple-950",
        tone === "ghost" && "border border-white/25 bg-white/10 text-white",
        tone === "green" && "bg-emerald-400 text-emerald-950 shadow-[0_4px_14px_rgba(52,211,153,0.35)]"
      )}
    >
      <span className="flex items-center gap-1.5">
        <Icon size={16} strokeWidth={2.6} />
        <span className="font-num text-base leading-4 tracking-widest">{title}</span>
      </span>
      <span className={cn("text-[8.5px] font-bold uppercase tracking-wide", tone === "ghost" ? "text-white/60" : "opacity-70")}>
        {caption}
      </span>
    </button>
  );
}

/** Entry slot for the keypad — shows which die is next up. */
function KeySlot({ value, label, active }: { value: number; label: string; active: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-lg border px-1.5 py-1 transition-all",
        active
          ? "border-gold-400 bg-gold-400/10 shadow-[0_0_12px_rgba(245,196,81,0.3)]"
          : "border-white/10 bg-white/[0.03]"
      )}
    >
      <MiniDie value={value} size={30} />
      <span
        className={cn(
          "mt-0.5 text-[7px] font-black uppercase tracking-[0.25em]",
          active ? "text-gold-300" : "text-purple-200/50"
        )}
      >
        {label}
      </span>
    </div>
  );
}

export function RollBar({
  mode,
  modeLocked,
  onMode,
  chip,
  onChip,
  rakeMode,
  onRake,
  canUndo,
  onUndo,
  onClear,
  pending,
  pendingTotal,
  onPress,
  onPinch,
  onPocket,
  rolling,
  onRoll,
  lastRoll,
  point,
  manual,
  manualSlot,
  onKeypad,
  inRoom = false,
  isShooter = true,
  shooterName,
}: {
  mode: Mode;
  modeLocked: boolean;
  onMode: (m: Mode) => void;
  chip: number;
  onChip: (c: number) => void;
  rakeMode: boolean;
  onRake: () => void;
  canUndo: boolean;
  onUndo: () => void;
  onClear: () => void;
  pending: PendingWin[];
  pendingTotal: number;
  onPress: () => void;
  onPinch: (to: PointNumber) => void;
  onPocket: () => void;
  rolling: boolean;
  onRoll: () => void;
  lastRoll: [number, number] | null;
  point: PointNumber | null;
  manual: [number, number];
  manualSlot: 0 | 1;
  onKeypad: (v: number) => void;
  inRoom?: boolean;
  isShooter?: boolean;
  shooterName?: string | null;
}) {
  const total = manual[0] + manual[1];
  const hard = manual[0] === manual[1];

  /* pinch = pick-a-number panel */
  const [pinchOpen, setPinchOpen] = useState(false);
  useEffect(() => {
    if (pendingTotal === 0) setPinchOpen(false);
  }, [pendingTotal]);
  const pinchRides = Math.floor(pendingTotal / 2);
  const pinchRack = pendingTotal - pinchRides;

  return (
    <div className="roll-controls sticky bottom-0 z-40 mt-2">
      <div className="safe-bottom rounded-t-[26px] border-t border-gold-400/30 bg-felt-950/92 shadow-[0_-18px_44px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        {/* ---------- press / pinch / pocket decisions ---------- */}
        <AnimatePresence initial={false}>
          {pendingTotal > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="px-3 pt-3">
                <div className="rounded-2xl border border-gold-400/40 bg-gradient-to-b from-gold-400/15 to-transparent p-2.5">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.22em] text-gold-300">
                      Dealer holds {fmt(pendingTotal)}
                    </span>
                    <span className="text-[9px] font-semibold text-purple-200/60">
                      {pending.map((p) => `${p.label} ${fmt(p.amount)}`).join(" + ")}
                    </span>
                  </div>
                  {/* pick-a-number panel — pops right above the pinch button */}
                  <AnimatePresence initial={false}>
                    {pinchOpen && (
                      <motion.div
                        key="pinch-picker"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                      >
                        <div className="mb-2 rounded-xl border border-white/20 bg-black/30 p-2">
                          <div className="mb-1.5 flex items-center justify-between px-0.5">
                            <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/85">
                              Press half to…
                            </span>
                            <span className="text-[9px] font-bold text-gold-300">
                              {fmt(pinchRides)} rides · {fmt(pinchRack)} racked
                            </span>
                          </div>
                          <div className="grid grid-cols-6 gap-1">
                            {POINT_NUMBERS.map((n) => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => onPinch(n)}
                                aria-label={`Pinch to the ${n}`}
                                className="spot flex flex-col items-center rounded-lg border border-white/15 bg-white/[0.06] py-1.5"
                              >
                                <span className="font-num text-xl leading-5 text-white">{n}</span>
                                <span className="text-[7px] font-bold text-purple-200/60">
                                  {placeOddsLabel(n)}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-2">
                    <DecisionButton icon={ChevronsUp} title="PRESS IT" caption="all winnings ride" onClick={onPress} tone="gold" />
                    <DecisionButton
                      icon={Split}
                      title="PINCH"
                      caption={pinchOpen ? "pick a number ↑" : "press half to any number"}
                      onClick={() => setPinchOpen((o) => !o)}
                      tone="ghost"
                    />
                    <DecisionButton icon={Wallet} title="POCKET" caption="rack it all, same bet" onClick={onPocket} tone="green" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------- chips + tools ---------- */}
        <div className="chip-toolbar flex items-center gap-2 overflow-x-auto px-3 pt-2.5">
          {/* mode toggle */}
          <div className="flex flex-none rounded-full border border-white/15 bg-black/30 p-0.5">
            {(
              [
                { m: "virtual", Icon: Dices, label: "Virtual" },
                { m: "manual", Icon: Hand, label: "Manual" },
              ] as const
            ).map(({ m, Icon, label }) => (
              <button
                key={m}
                type="button"
                onClick={() => onMode(m)}
                disabled={modeLocked}
                title={modeLocked ? "Roll mode is locked during the tournament" : undefined}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-colors",
                  mode === m ? "bg-gold-400 text-purple-950" : "text-white/60",
                  modeLocked && "opacity-60"
                )}
              >
                <Icon size={12} strokeWidth={2.5} />
                {label}
              </button>
            ))}
          </div>

          <div className="h-8 w-px flex-none bg-white/10" />

          {CHIPS.map((c) => (
            <Chip key={c} value={c} size={38} active={!rakeMode && chip === c} onClick={() => onChip(c)} />
          ))}

          <div className="h-8 w-px flex-none bg-white/10" />

          <button
            type="button"
            onClick={onRake}
            aria-label="Take chips back"
            title="Take chips back"
            className={cn(
              "grid h-[38px] w-[38px] flex-none place-items-center rounded-full border transition-all active:scale-90",
              rakeMode
                ? "border-red-400 bg-red-400/20 text-red-300"
                : "border-dashed border-white/30 bg-white/5 text-white/60"
            )}
          >
            <Minus size={16} />
          </button>
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="Undo bet"
            title="Undo bet"
            className="grid h-[38px] w-[38px] flex-none place-items-center rounded-full bg-white/5 text-white/70 transition active:scale-90 disabled:opacity-30"
          >
            <Undo2 size={16} />
          </button>
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear bets"
            title="Clear bets"
            className="grid h-[38px] w-[38px] flex-none place-items-center rounded-full bg-white/5 text-white/70 transition active:scale-90"
          >
            <Eraser size={16} />
          </button>
        </div>

        {/* ---------- manual dice keypad ---------- */}
        <AnimatePresence initial={false}>
          {mode === "manual" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex items-stretch gap-3 px-3 pt-2.5">
                {/* entry slots */}
                <div className="flex w-[118px] flex-none flex-col items-center justify-center gap-1 rounded-xl bg-black/30 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <KeySlot value={manual[0]} label="A" active={manualSlot === 0} />
                    <KeySlot value={manual[1]} label="B" active={manualSlot === 1} />
                  </div>
                  <span className="font-num text-lg leading-4 text-white">
                    {total}
                    <span className="ml-1 text-[9px] font-bold uppercase text-purple-200/60">
                      {hard ? "hard" : "easy"}
                    </span>
                  </span>
                </div>

                {/* pip keypad */}
                <div className="grid flex-1 grid-cols-3 gap-1.5">
                  {[1, 2, 3, 4, 5, 6].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => onKeypad(v)}
                      aria-label={`Die face ${v}`}
                      className={cn(
                        "grid h-12 place-items-center rounded-xl border transition-all active:scale-95",
                        (manualSlot === 0 ? manual[0] : manual[1]) === v
                          ? "border-gold-400/60 bg-gold-400/15"
                          : "border-white/10 bg-white/[0.07] active:bg-gold-400/20"
                      )}
                    >
                      <MiniDie value={v} size={32} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="px-3 pt-1 text-center text-[9px] font-semibold text-purple-200/55">
                Select a face for die {manualSlot === 0 ? "A" : "B"} — cursor hops to the next die
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------- main row ---------- */}
        <div className="flex items-stretch gap-3 px-3 pb-1 pt-3">
          {/* last roll */}
          <div className="flex w-[86px] flex-none flex-col items-center justify-center rounded-xl bg-black/30 py-1.5">
            {lastRoll ? (
              <>
                <div className="flex gap-1">
                  <MiniDie value={lastRoll[0]} size={20} />
                  <MiniDie value={lastRoll[1]} size={20} />
                </div>
                <span className="mt-1 font-num text-xl leading-4 text-white">
                  {lastRoll[0] + lastRoll[1]}
                  <span className="ml-1 text-[9px] font-bold uppercase text-purple-200/60">
                    {lastRoll[0] === lastRoll[1] ? "hard" : "easy"}
                  </span>
                </span>
              </>
            ) : (
              <span className="text-[9px] font-bold uppercase tracking-widest text-purple-200/50">
                no roll yet
              </span>
            )}
          </div>

          {/* the roll button */}
          <button
            type="button"
            onClick={onRoll}
            disabled={rolling || (inRoom && !isShooter)}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-2xl py-4 transition-transform",
              inRoom && !isShooter
                ? "border border-white/15 bg-white/[0.06] text-white/60"
                : "btn-press text-purple-950",
              rolling && "opacity-90"
            )}
          >
            {inRoom && !isShooter ? (
              <div className="flex flex-col items-center leading-tight">
                <span className="font-num text-lg tracking-[0.18em]">
                  {shooterName ?? "SHOOTER"} HAS THE DICE
                </span>
                <span className="text-[8.5px] font-bold uppercase tracking-wide text-white/45">
                  your bets still ride — dice pass on a seven-out
                </span>
              </div>
            ) : rolling ? (
              <>
                <Dices size={22} className="animate-spin" strokeWidth={2.5} style={{ animationDuration: "0.9s" }} />
                <span className="font-num text-2xl tracking-[0.28em]">BONES OUT…</span>
              </>
            ) : (
              <>
                {mode === "virtual" ? <Dices size={22} strokeWidth={2.5} /> : <Hand size={22} strokeWidth={2.5} />}
                <span className="font-num text-2xl tracking-[0.28em]">{mode === "virtual" ? "ROLL" : "SET ROLL"}</span>
              </>
            )}
          </button>

          {/* point status */}
          <div className="flex w-[86px] flex-none flex-col items-center justify-center rounded-xl bg-black/30 py-1.5">
            <span
              className={cn(
                "grid h-6 w-6 place-items-center rounded-full border-2 text-[8px] font-black",
                point
                  ? "border-gold-400 bg-zinc-900 text-gold-300"
                  : "border-zinc-300 bg-zinc-100 text-zinc-500"
              )}
            >
              {point ? "ON" : "OFF"}
            </span>
            <span className="mt-1 font-num text-xl leading-4 text-white">
              {point ?? "—"}
              <span className="ml-1 text-[9px] font-bold uppercase text-purple-200/60">
                {point ? "point" : "come out"}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
