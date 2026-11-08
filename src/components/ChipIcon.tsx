import { cn } from "../utils/cn";
import { fmt } from "../game/craps";

/** Chip colorways by denomination. */
export const CHIP_COLORS: Record<number, { bg: string; text: string }> = {
  1: { bg: "#f1f5f9", text: "#0f172a" },
  5: { bg: "#dc2626", text: "#ffffff" },
  25: { bg: "#059669", text: "#ffffff" },
  100: { bg: "#18181b", text: "#f5c451" },
  500: { bg: "#7c3aed", text: "#ffffff" },
  1000: { bg: "#d97706", text: "#ffffff" },
  5000: { bg: "#2563eb", text: "#ffffff" },
};

export function stackColor(amount: number) {
  if (amount >= 5000) return CHIP_COLORS[5000];
  if (amount >= 1000) return CHIP_COLORS[1000];
  if (amount >= 500) return CHIP_COLORS[500];
  if (amount >= 100) return CHIP_COLORS[100];
  if (amount >= 25) return CHIP_COLORS[25];
  if (amount >= 5) return CHIP_COLORS[5];
  return CHIP_COLORS[1];
}

export function Chip({
  value,
  size = 44,
  active,
  onClick,
  className,
}: {
  value: number;
  size?: number;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const c = CHIP_COLORS[value] ?? CHIP_COLORS[1];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`$${value} chip`}
      className={cn(
        "chip transition-transform duration-150",
        active && "-translate-y-1 ring-2 ring-gold-300 ring-offset-2 ring-offset-felt-900",
        className
      )}
      style={{ width: size, height: size, background: c.bg }}
    >
      <span
        className="chip-label font-num"
        style={{ color: c.text, fontSize: size * (value >= 100 ? 0.3 : 0.34) }}
      >
        {value >= 1000 ? `${value / 1000}k` : value}
      </span>
    </button>
  );
}

/** The little stack that sits on a betting spot, labelled with its total. */
export function ChipStack({
  amount,
  flash,
  size = 34,
}: {
  amount: number;
  flash?: boolean;
  size?: number;
}) {
  const c = stackColor(amount);
  const short = amount >= 10000 ? `${Math.round(amount / 1000)}k` : amount >= 1000 ? `${(amount / 1000).toFixed(1)}k` : `${amount}`;
  return (
    <div className={cn("chip-stack flex flex-col items-center", flash && "win-flash rounded-full")}>
      <div className="chip" style={{ width: size, height: size, background: c.bg }}>
        <span className="chip-label font-num" style={{ color: c.text, fontSize: size * 0.3 }}>
          {short}
        </span>
      </div>
      <span className="-mt-0.5 rounded-full bg-black/45 px-1.5 py-px text-[10px] font-bold leading-4 text-gold-300 backdrop-blur-sm">
        {fmt(amount)}
      </span>
    </div>
  );
}

/** Compact chip rows for empty spots — a ghost target. */
export function GhostChip({ size = 30, label }: { size?: number; label?: string }) {
  return (
    <div
      className="grid place-items-center rounded-full border-2 border-dashed border-white/25 text-white/40"
      style={{ width: size, height: size }}
    >
      {label && <span className="font-num text-xs">{label}</span>}
    </div>
  );
}
