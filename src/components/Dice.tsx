import { useEffect, useRef, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { cn } from "../utils/cn";

/* Face set: proper die — opposites sum to 7. */
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/* value -> [rotateX, rotateY] that brings that face to the front */
const SHOW: Record<number, [number, number]> = {
  1: [0, 0],
  6: [0, 180],
  3: [0, -90],
  4: [0, 90],
  5: [-90, 0],
  2: [90, 0],
};

const FACE_TRANSFORMS: { v: number; t: (h: number) => string }[] = [
  { v: 1, t: (h) => `translateZ(${h}px)` },
  { v: 6, t: (h) => `rotateY(180deg) translateZ(${h}px)` },
  { v: 3, t: (h) => `rotateY(90deg) translateZ(${h}px)` },
  { v: 4, t: (h) => `rotateY(-90deg) translateZ(${h}px)` },
  { v: 5, t: (h) => `rotateX(90deg) translateZ(${h}px)` },
  { v: 2, t: (h) => `rotateX(-90deg) translateZ(${h}px)` },
];

/** Spin forward at least two full turns, landing on the target angle. */
function nextAngle(prev: number, target: number): number {
  const mod = ((prev % 360) + 360) % 360;
  const t = ((target % 360) + 360) % 360;
  let d = t - mod;
  if (d <= 0) d += 360;
  const extra = Math.random() < 0.5 ? 0 : 360;
  return prev + 720 + extra + d;
}

export function Die3D({ value, size = 68 }: { value: number; size?: number }) {
  const half = size / 2;
  const [rot, setRot] = useState<[number, number]>(() => SHOW[value]);

  useEffect(() => {
    const [tx, ty] = SHOW[value];
    setRot(([px, py]) => [nextAngle(px, tx), nextAngle(py, ty)]);
  }, [value]);

  return (
    <div className="die-scene" style={{ width: size, height: size }}>
      <div
        className="die-cube"
        style={{ transform: `rotateX(${rot[0]}deg) rotateY(${rot[1]}deg)` }}
      >
        {FACE_TRANSFORMS.map((f) => (
          <div key={f.v} className="die-face" style={{ transform: f.t(half) }}>
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className={cn("pip", !PIPS[f.v].includes(i) && "empty")} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The pair of dice being tossed down the tub.
 * Restarts its slide animation on every rollId change without remounting the cubes.
 */
export function DicePair({ roll, rollId, size = 68 }: { roll: [number, number] | null; rollId: number; size?: number }) {
  const c1 = useAnimation();
  const c2 = useAnimation();
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    c1.start({
      x: [150, -10, 0],
      y: [-64, 8, 0],
      rotate: [18, -8, 0],
      transition: { duration: 1.15, times: [0, 0.7, 1], ease: "easeOut" },
    });
    c2.start({
      x: [190, 12, 0],
      y: [-40, -6, 0],
      rotate: [-22, 10, 0],
      transition: { duration: 1.2, times: [0, 0.72, 1], ease: "easeOut", delay: 0.05 },
    });
  }, [rollId, c1, c2]);

  const [d1, d2] = roll ?? [3, 4];

  return (
    <div className="relative flex items-end gap-7" style={{ height: size + 26 }}>
      <motion.div animate={c1} initial={false} className="relative">
        <Die3D value={d1} size={size} />
        <div
          className="absolute -bottom-3 left-1/2 h-3 -translate-x-1/2 rounded-full bg-black/55 blur-[6px]"
          style={{ width: size * 0.85 }}
        />
      </motion.div>
      <motion.div animate={c2} initial={false} className="relative mb-3">
        <Die3D value={d2} size={size} />
        <div
          className="absolute -bottom-3 left-1/2 h-3 -translate-x-1/2 rounded-full bg-black/55 blur-[6px]"
          style={{ width: size * 0.85 }}
        />
      </motion.div>
    </div>
  );
}

/** Flat mini die for keypad / status readouts — bold pips built for small sizes. */
export function MiniDie({ value, size = 28, className }: { value: number; size?: number; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-3 grid-rows-3 rounded-[22%] bg-gradient-to-b from-white to-violet-100 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(76,29,149,0.25),0_2px_4px_rgba(0,0,0,0.4)]",
        className
      )}
      style={{ width: size, height: size, padding: size * 0.09 }}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={cn("pip pip-xl", !PIPS[value].includes(i) && "empty")} />
      ))}
    </div>
  );
}
