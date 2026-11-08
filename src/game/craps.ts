/* ------------------------------------------------------------------
   Craps engine — real casino odds.
   Pass 1:1 · Odds behind the line (true odds) 2:1 / 3:2 / 6:5
   Place 4,10 → 9:5 · 5,9 → 7:5 · 6,8 → 7:6
   Field 1:1 (2 pays double, 12 pays triple) · Any 7 → 4:1
   Any Craps → 7:1 · Hard 4/10 → 7:1 · Hard 6/8 → 9:1
------------------------------------------------------------------- */

export type PointNumber = 4 | 5 | 6 | 8 | 9 | 10;
export const POINT_NUMBERS: PointNumber[] = [4, 5, 6, 8, 9, 10];
export const HARD_NUMBERS = [4, 6, 8, 10] as const;
export type HardNumber = (typeof HARD_NUMBERS)[number];

export interface Bets {
  passLine: number;
  passOdds: number;
  dontPass: number;
  field: number;
  anySeven: number;
  anyCraps: number;
  place: Record<PointNumber, number>;
  hard: Record<HardNumber, number>;
}

export const emptyBets = (): Bets => ({
  passLine: 0,
  passOdds: 0,
  dontPass: 0,
  field: 0,
  anySeven: 0,
  anyCraps: 0,
  place: { 4: 0, 5: 0, 6: 0, 8: 0, 9: 0, 10: 0 },
  hard: { 4: 0, 6: 0, 8: 0, 10: 0 },
});

export const cloneBets = (b: Bets): Bets => ({
  ...b,
  place: { ...b.place },
  hard: { ...b.hard },
});

export interface PendingWin {
  key: string; // "place-6" | "hard-8"
  label: string;
  amount: number;
}

/* ------------------------------ payouts ------------------------------ */

const PLACE_PAYS: Record<PointNumber, [number, number]> = {
  4: [9, 5],
  5: [7, 5],
  6: [7, 6],
  8: [7, 6],
  9: [7, 5],
  10: [9, 5],
};
const ODDS_PAYS: Record<PointNumber, [number, number]> = {
  4: [2, 1],
  5: [3, 2],
  6: [6, 5],
  8: [6, 5],
  9: [3, 2],
  10: [2, 1],
};
const HARD_PAYS: Record<HardNumber, number> = { 4: 7, 6: 9, 8: 9, 10: 7 };
const FIELD_NUMBERS = [2, 3, 4, 9, 10, 11, 12];
const CRAPS = [2, 3, 12];

export const placePayout = (n: PointNumber, amt: number) => {
  const [w, f] = PLACE_PAYS[n];
  return Math.max(1, Math.round((amt * w) / f));
};
export const oddsPayout = (n: PointNumber, amt: number) => {
  const [w, f] = ODDS_PAYS[n];
  return Math.max(1, Math.round((amt * w) / f));
};
export const placeOddsLabel = (n: PointNumber) => `${PLACE_PAYS[n][0]}:${PLACE_PAYS[n][1]}`;
export const trueOddsLabel = (n: PointNumber) => `${ODDS_PAYS[n][0]}:${ODDS_PAYS[n][1]}`;

export const MAX_ODDS_MULT = 5;

/* ------------------------------ dealer calls ------------------------------ */

export function diceCall(total: number, hard: boolean, point: PointNumber | null): string {
  switch (total) {
    case 2:
      return "Two — aces, craps two";
    case 3:
      return "Three — ace-deuce";
    case 4:
      return hard ? "Little Joe — hard four" : "Four, easy four";
    case 5:
      return "Fever five";
    case 6:
      return hard ? "Six — the hard way" : "Six, easy six";
    case 7:
      return point === null ? "Winner — seven!" : "Seven out — line away";
    case 8:
      return hard ? "Eight — hard eight" : "Eight, easy eight";
    case 9:
      return "Nina — nine";
    case 10:
      return hard ? "Ten — hard ten" : "Ten, the big one";
    case 11:
      return "Yo-leven!";
    case 12:
      return "Twelve — boxcars";
    default:
      return `${total}`;
  }
}

/* ------------------------------ resolution ------------------------------ */

export type Tone = "neutral" | "win" | "lose" | "point";

export interface Resolution {
  bets: Bets;
  point: PointNumber | null;
  credit: number; // money straight to the rack
  pending: PendingWin[]; // winnings the dealer holds for a press/pinch/pocket decision
  details: string[];
  headline: string;
  tone: Tone;
  sevenOut: boolean;
  madePoint: boolean;
  winKeys: string[]; // layout keys that just paid (for win-flash)
}

export function resolveRoll(
  prev: Bets,
  point: PointNumber | null,
  d1: number,
  d2: number,
  placeOnComeOut: boolean
): Resolution {
  const bets = cloneBets(prev);
  const pending: PendingWin[] = [];
  const details: string[] = [];
  const winKeys: string[] = [];
  let credit = 0;
  let newPoint: PointNumber | null = point;
  let madePoint = false;
  let sevenOut = false;

  const t = d1 + d2;
  const hard = d1 === d2;

  /* ---------- one-roll props (bet stays up on a win, gone on a miss) ---------- */
  if (prev.anySeven > 0) {
    if (t === 7) {
      const pay = prev.anySeven * 4;
      credit += pay;
      winKeys.push("anySeven");
      details.push(`Any Seven pays $${pay} (4:1)`);
    } else {
      bets.anySeven = 0;
    }
  }
  if (prev.anyCraps > 0) {
    if (CRAPS.includes(t)) {
      const pay = prev.anyCraps * 7;
      credit += pay;
      winKeys.push("anyCraps");
      details.push(`Any Craps pays $${pay} (7:1)`);
    } else {
      bets.anyCraps = 0;
    }
  }
  if (prev.field > 0) {
    if (FIELD_NUMBERS.includes(t)) {
      const mult = t === 2 ? 2 : t === 12 ? 3 : 1;
      const pay = prev.field * mult;
      credit += pay;
      winKeys.push("field");
      details.push(
        mult > 1 ? `Field pays $${pay} (${mult === 3 ? "triple" : "double"})` : `Field pays $${pay}`
      );
    } else {
      bets.field = 0;
    }
  }

  /* ---------- hardways ---------- */
  for (const n of HARD_NUMBERS) {
    if (prev.hard[n] === 0) continue;
    if (t === 7) {
      bets.hard[n] = 0;
      details.push(`Hard ${n} is down`);
    } else if (t === n) {
      if (hard) {
        const pay = prev.hard[n] * HARD_PAYS[n];
        pending.push({ key: `hard-${n}`, label: `Hard ${n}`, amount: pay });
        winKeys.push(`hard-${n}`);
        details.push(`Hard ${n} pays $${pay} (${HARD_PAYS[n]}:1)`);
      } else {
        bets.hard[n] = 0;
        details.push(`Hard ${n} goes down easy`);
      }
    }
  }

  /* ---------- place bets (off on the come-out by default) ---------- */
  const placeWorking = point !== null || placeOnComeOut;
  if (placeWorking) {
    for (const n of POINT_NUMBERS) {
      if (prev.place[n] === 0) continue;
      if (t === 7) {
        bets.place[n] = 0;
      } else if (t === n) {
        const pay = placePayout(n, prev.place[n]);
        pending.push({ key: `place-${n}`, label: `Place ${n}`, amount: pay });
        winKeys.push(`place-${n}`);
        details.push(`Place ${n} pays $${pay} (${placeOddsLabel(n)})`);
      }
    }
  }

  /* ---------- pass line / don't pass ---------- */
  if (point === null) {
    // come-out roll
    if (t === 7 || t === 11) {
      if (prev.passLine > 0) {
        credit += prev.passLine;
        winKeys.push("pass");
        details.push(`Pass line pays $${prev.passLine} even`);
      }
      if (prev.dontPass > 0) {
        bets.dontPass = 0;
        details.push("Don't pass loses");
      }
    } else if (CRAPS.includes(t)) {
      if (prev.passLine > 0) {
        bets.passLine = 0;
        details.push("Pass line loses — craps");
      }
      if (prev.dontPass > 0) {
        if (t === 12) {
          details.push("Don't pass pushes on twelve");
        } else {
          credit += prev.dontPass;
          winKeys.push("dontPass");
          details.push(`Don't pass pays $${prev.dontPass}`);
        }
      }
    } else {
      newPoint = t as PointNumber;
      details.push(`The point is ${t}`);
    }
  } else {
    // point is ON
    if (t === point) {
      madePoint = true;
      newPoint = null;
      if (prev.passLine > 0) {
        credit += prev.passLine;
        winKeys.push("pass");
        details.push(`Pass line pays $${prev.passLine} even`);
      }
      if (prev.passOdds > 0) {
        const pay = oddsPayout(point, prev.passOdds);
        credit += prev.passOdds + pay;
        bets.passOdds = 0;
        winKeys.push("odds");
        details.push(`Odds come down — pay $${pay} (${trueOddsLabel(point)})`);
      }
      if (prev.dontPass > 0) {
        bets.dontPass = 0;
        details.push("Don't pass loses");
      }
    } else if (t === 7) {
      sevenOut = true;
      newPoint = null;
      if (prev.passLine > 0) bets.passLine = 0;
      if (prev.passOdds > 0) bets.passOdds = 0;
      if (prev.dontPass > 0) {
        credit += prev.dontPass;
        winKeys.push("dontPass");
        details.push(`Don't pass pays $${prev.dontPass}`);
      }
    }
  }

  let tone: Tone = "neutral";
  if (sevenOut) tone = "lose";
  else if (madePoint || (point === null && (t === 7 || t === 11))) tone = "win";
  else if (point === null && newPoint !== null) tone = "point";
  else if (point === null && CRAPS.includes(t) && prev.passLine > 0) tone = "lose";

  return {
    bets,
    point: newPoint,
    credit,
    pending,
    details,
    headline: diceCall(t, hard, point),
    tone,
    sevenOut,
    madePoint,
    winKeys,
  };
}

/* ------------------------------ helpers ------------------------------ */

export const totalOnLayout = (b: Bets): number =>
  b.passLine +
  b.passOdds +
  b.dontPass +
  b.field +
  b.anySeven +
  b.anyCraps +
  POINT_NUMBERS.reduce((s, n) => s + b.place[n], 0) +
  HARD_NUMBERS.reduce((s, n) => s + b.hard[n], 0);

export const fmt = (n: number) => "$" + n.toLocaleString("en-US");
