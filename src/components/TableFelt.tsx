import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../utils/cn";
import {
  Bets,
  PointNumber,
  POINT_NUMBERS,
  HARD_NUMBERS,
  placeOddsLabel,
  trueOddsLabel,
  MAX_ODDS_MULT,
  fmt,
} from "../game/craps";
import { BetSpot } from "../hooks/useCraps";
import { ChipStack, GhostChip } from "./ChipIcon";
import { DicePair, MiniDie } from "./Dice";

function Puck({ on }: { on: boolean }) {
  return (
    <motion.div
      layoutId="table-puck"
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className={cn(
        "z-10 grid h-7 w-7 place-items-center rounded-full border-2 text-[9px] font-black tracking-widest shadow-[0_3px_8px_rgba(0,0,0,0.5)]",
        on
          ? "border-gold-400 bg-zinc-900 text-gold-300"
          : "border-zinc-300 bg-gradient-to-b from-white to-zinc-200 text-zinc-500"
      )}
    >
      {on ? "ON" : "OFF"}
    </motion.div>
  );
}

function StackOrGhost({ amount, flash, ghost }: { amount: number; flash?: boolean; ghost?: string }) {
  return amount > 0 ? (
    <ChipStack amount={amount} flash={flash} />
  ) : (
    <div className="opacity-60">
      <GhostChip label={ghost} />
    </div>
  );
}

/* ---------------------------- row: betting spot shell ---------------------------- */
function Spot({
  onTap,
  flash,
  className,
  children,
  label,
}: {
  onTap: () => void;
  flash?: boolean;
  className?: string;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onTap}
      className={cn(
        "spot relative border border-white/15 bg-white/[0.045] backdrop-blur-[1px]",
        flash && "win-flash border-gold-400/70",
        className
      )}
    >
      {children}
    </button>
  );
}

export function TableFelt({
  bets,
  point,
  roll,
  rollId,
  winKeys,
  headline,
  detail,
  tone,
  placeOnComeOut,
  onSpot,
}: {
  bets: Bets;
  point: PointNumber | null;
  roll: [number, number] | null;
  rollId: number;
  winKeys: string[];
  headline: string;
  detail: string;
  tone: "neutral" | "win" | "lose" | "point";
  placeOnComeOut: boolean;
  onSpot: (spot: BetSpot) => void;
}) {
  const flash = (k: string) => winKeys.includes(k);
  const placeWorking = point !== null || placeOnComeOut;

  return (
    <div className="relative">
      {/* ---------------- dice tray ---------------- */}
      <div className="relative flex items-center justify-between px-2 pt-1">
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2">
          <div className="h-[150px] w-[300px] rounded-[100%] border border-gold-400/20 bg-black/25 shadow-[inset_0_12px_32px_rgba(0,0,0,0.65)]" />
        </div>
        <div className="w-10" />
        <DicePair roll={roll} rollId={rollId} />
        <div className="flex w-10 flex-col items-center gap-1">
          {point === null && <Puck on={false} />}
        </div>
      </div>

      {/* dealer call */}
      <div className="mt-1 px-4 text-center">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={rollId + headline}
            initial={{ opacity: 0, y: 8, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            className={cn(
              "font-num text-[26px] leading-7 tracking-wide",
              tone === "win" && "gold-text",
              tone === "lose" && "text-red-300",
              tone === "point" && "text-white",
              tone === "neutral" && "text-purple-100"
            )}
          >
            {headline}
          </motion.div>
        </AnimatePresence>
        <div className="ticker-mask mt-0.5 overflow-hidden">
          {detail.length > 42 ? (
            <motion.div
              key={rollId + detail}
              className="inline-block whitespace-nowrap text-[11px] font-medium text-purple-200/75"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: Math.max(7, detail.length * 0.22), repeat: Infinity, ease: "linear" }}
            >
              {detail}&nbsp;&nbsp;·&nbsp;&nbsp;{detail}&nbsp;&nbsp;·&nbsp;&nbsp;
            </motion.div>
          ) : (
            <div key={rollId + detail} className="truncate text-[11px] font-medium text-purple-200/75">
              {detail}
            </div>
          )}
        </div>
      </div>

      {/* ---------------- number boxes ---------------- */}
      <div className="mt-3 grid grid-cols-6 gap-1 px-2">
        {POINT_NUMBERS.map((n) => (
          <div key={n} className="flex flex-col items-center">
            <div className="flex h-8 items-center justify-center">
              {point === n && <Puck on />}
            </div>
            <Spot
              label={`Place ${n}`}
              onTap={() => onSpot(`place-${n}`)}
              flash={flash(`place-${n}`)}
              className={cn(
                "flex h-[92px] w-full flex-col items-center justify-between rounded-lg pb-1.5 pt-1",
                point === n && "border-gold-400/60 bg-gold-400/[0.06]"
              )}
            >
              <span className="font-num text-[30px] leading-8 text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.45)]">
                {n}
              </span>
              <StackOrGhost amount={bets.place[n]} flash={flash(`place-${n}`)} />
              <span className="text-[8px] font-bold tracking-wide text-purple-200/70">
                {placeOddsLabel(n)}
                {!placeWorking && <span className="text-white/35"> · OFF</span>}
              </span>
            </Spot>
          </div>
        ))}
      </div>
      <div className="mx-2 mt-1 rounded-b-lg border-x border-b border-white/10 px-3 pb-1 text-center text-[9px] font-semibold uppercase tracking-[0.2em] text-purple-200/50">
        Place bets — {placeWorking ? "working" : "off on the come-out"}
      </div>

      {/* ---------------- center props ---------------- */}
      <div className="mt-2 px-2">
        <div className="rounded-xl border border-white/15 bg-black/15 p-2">
          <div className="grid grid-cols-4 gap-1">
            {HARD_NUMBERS.map((n) => (
              <Spot
                key={n}
                label={`Hard ${n}`}
                onTap={() => onSpot(`hard-${n}`)}
                flash={flash(`hard-${n}`)}
                className="flex h-[76px] flex-col items-center justify-between rounded-lg py-1.5"
              >
                <div className="flex items-center gap-1">
                  <MiniDie value={n / 2} size={18} />
                  <MiniDie value={n / 2} size={18} />
                </div>
                <StackOrGhost amount={bets.hard[n]} flash={flash(`hard-${n}`)} />
                <span className="text-[8px] font-bold tracking-wide text-purple-200/70">
                  HARD {n} · {n === 6 || n === 8 ? "9:1" : "7:1"}
                </span>
              </Spot>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-2 gap-1">
            <Spot
              label="Any Seven"
              onTap={() => onSpot("anySeven")}
              flash={flash("anySeven")}
              className="flex h-[62px] items-center justify-between rounded-lg px-3"
            >
              <div className="text-left">
                <div className="font-num text-lg leading-5 text-white">ANY SEVEN</div>
                <div className="text-[9px] font-bold text-purple-200/70">pays 4:1 · one roll</div>
              </div>
              <StackOrGhost amount={bets.anySeven} flash={flash("anySeven")} />
            </Spot>
            <Spot
              label="Any Craps"
              onTap={() => onSpot("anyCraps")}
              flash={flash("anyCraps")}
              className="flex h-[62px] items-center justify-between rounded-lg px-3"
            >
              <div className="text-left">
                <div className="font-num text-lg leading-5 text-white">ANY CRAPS</div>
                <div className="text-[9px] font-bold text-purple-200/70">2·3·12 pays 7:1</div>
              </div>
              <StackOrGhost amount={bets.anyCraps} flash={flash("anyCraps")} />
            </Spot>
          </div>
        </div>
      </div>

      {/* ---------------- field ---------------- */}
      <div className="mt-2 px-2">
        <Spot
          label="Field"
          onTap={() => onSpot("field")}
          flash={flash("field")}
          className="flex h-[74px] w-full items-center justify-between rounded-xl px-4"
        >
          <div className="text-left">
            <div className="font-num text-2xl leading-6 tracking-wider text-white">FIELD</div>
            <div className="text-[9px] font-semibold text-purple-200/70">
              2 pays double · 12 pays triple
            </div>
          </div>
          <div className="font-num text-xl tracking-[0.3em] text-purple-100/85">2 3 4 · 9 10 11 · 12</div>
          <StackOrGhost amount={bets.field} flash={flash("field")} />
        </Spot>
      </div>

      {/* ---------------- don't pass ---------------- */}
      <div className="mt-2 px-2">
        <Spot
          label="Don't pass"
          onTap={() => onSpot("dont")}
          flash={flash("dontPass")}
          className="flex h-[52px] w-full items-center justify-between rounded-xl px-4"
        >
          <div className="text-left">
            <div className="font-num text-base leading-4 tracking-wider text-purple-100/90">
              DON'T PASS BAR
            </div>
            <div className="text-[8px] font-semibold text-purple-200/60">even money · 12 pushes</div>
          </div>
          <StackOrGhost amount={bets.dontPass} flash={flash("dontPass")} />
        </Spot>
      </div>

      {/* ---------------- odds ---------------- */}
      <AnimatePresence initial={false}>
        {point !== null && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden px-2"
          >
            <Spot
              label="Pass line odds"
              onTap={() => onSpot("odds")}
              flash={flash("odds")}
              className="mt-2 flex h-[58px] w-full items-center justify-between rounded-xl border-dashed border-gold-400/40 bg-gold-400/[0.05] px-4"
            >
              <div className="text-left">
                <div className="font-num text-base leading-4 tracking-wider text-gold-300">
                  ODDS BEHIND THE LINE
                </div>
                <div className="text-[8px] font-semibold text-purple-200/70">
                  true odds {trueOddsLabel(point)} on the {point} · up to {MAX_ODDS_MULT}× your line
                </div>
              </div>
              <StackOrGhost
                amount={bets.passOdds}
                flash={flash("odds")}
                ghost={bets.passOdds === 0 ? `${MAX_ODDS_MULT}×` : undefined}
              />
            </Spot>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- pass line ---------------- */}
      <div className="px-2 pb-3 pt-2">
        <Spot
          label="Pass line"
          onTap={() => onSpot("pass")}
          flash={flash("pass")}
          className={cn(
            "relative flex h-[64px] w-full items-center justify-between rounded-2xl px-5",
            "border-gold-400/40 bg-gradient-to-b from-white/[0.07] to-white/[0.02]"
          )}
        >
          <div className="pointer-events-none absolute -top-px left-6 right-6 h-1 rounded-b-full bg-gradient-to-r from-transparent via-gold-400/70 to-transparent" />
          <div className="text-left">
            <div className="font-num text-xl leading-5 tracking-[0.18em] gold-text">PASS LINE</div>
            <div className="text-[9px] font-semibold text-purple-200/60">
              even money{point !== null ? " · contract — locked" : ""}
            </div>
          </div>
          <div className="pr-1">
            <StackOrGhost amount={bets.passLine} flash={flash("pass")} />
          </div>
        </Spot>
      </div>

      {/* rail strip */}
      <div className="mx-6 mb-2 flex items-center justify-between rounded-full border border-white/10 bg-black/25 px-4 py-1.5">
        <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-purple-200/60">
          Violet Felt Casino
        </span>
        <span className="text-[9px] font-semibold text-gold-400/80">{fmt(maxExposure(bets))} in action</span>
      </div>
    </div>
  );
}

function maxExposure(b: Bets) {
  return (
    b.passLine +
    b.passOdds +
    b.dontPass +
    b.field +
    b.anySeven +
    b.anyCraps +
    POINT_NUMBERS.reduce((s, n) => s + b.place[n], 0) +
    HARD_NUMBERS.reduce((s, n) => s + b.hard[n], 0)
  );
}
