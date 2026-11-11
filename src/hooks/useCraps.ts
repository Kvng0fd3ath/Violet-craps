import { useEffect, useMemo, useReducer } from "react";
import {
  Bets,
  PointNumber,
  HardNumber,
  PendingWin,
  Tone,
  cloneBets,
  emptyBets,
  resolveRoll,
  totalOnLayout,
  MAX_ODDS_MULT,
  fmt,
} from "../game/craps";

export type Mode = "virtual" | "manual";
export type BetSpot =
  | "pass"
  | "odds"
  | "dont"
  | "field"
  | "anySeven"
  | "anyCraps"
  | `place-${PointNumber}`
  | `hard-${HardNumber}`;

export interface Toast {
  id: number;
  text: string;
  kind: "info" | "warn";
}

interface Snapshot {
  bets: Bets;
  balance: number;
}

export interface Tournament {
  active: boolean;
  buyIn: number;
  startedBy: string;
  stamp: number;
}

export interface GameState {
  balance: number;
  rebuys: number;
  baseline: number;
  tournament: Tournament;
  bets: Bets;
  point: PointNumber | null;
  pointDecision: PointNumber | null;
  pending: PendingWin[];
  lastRoll: [number, number] | null;
  rollId: number;
  rollCount: number;
  headline: string;
  detail: string;
  tone: Tone;
  winKeys: string[];
  mode: Mode;
  chip: number;
  rakeMode: boolean;
  placeOnComeOut: boolean;
  soundOn: boolean;
  history: Snapshot[];
  toasts: Toast[];
  flashBreak: boolean;
}

type Action =
  | { type: "BET"; spot: BetSpot }
  | { type: "POINT_BET_DECISION"; to: PointNumber | "pocket" | "keep" }
  | { type: "ROLL"; d1: number; d2: number; syncPoint?: PointNumber | null; shooter?: string }
  | { type: "PRESS" }
  | { type: "PINCH"; to: PointNumber }
  | { type: "POCKET" }
  | { type: "UNDO" }
  | { type: "CLEAR" }
  | { type: "REBUY" }
  | { type: "SET_CHIP"; chip: number }
  | { type: "SET_MODE"; mode: Mode }
  | { type: "TOGGLE_RAKE" }
  | { type: "TOGGLE_COME_OUT" }
  | { type: "TOGGLE_SOUND" }
  | { type: "DISMISS_TOAST"; id: number }
  | { type: "RESET_SESSION" }
  | { type: "START_TOURNAMENT"; buyIn: number; startedBy: string; stamp: number; mode: Mode }
  | { type: "END_TOURNAMENT" };

let toastId = 1;
const pushToast = (toasts: Toast[], text: string, kind: "info" | "warn" = "info"): Toast[] =>
  [...toasts.slice(-2), { id: toastId++, text, kind }];

export const CHIPS = [1, 5, 25, 100, 500, 1000, 5000];

/* ------------------------------ per-device persistence ------------------------------ */

const STORAGE_KEY = "violet-felt-session";

function loadState(): Partial<GameState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveState(state: GameState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* private mode / quota exceeded — session lives in memory only */
  }
}

/** Merge saved data over defaults so a partial or old save never breaks the shape. */
function hydrateState(): GameState {
  const base = initialState();
  const loaded = loadState();
  if (!loaded) return base;

  const savedBets = (loaded as { bets?: Partial<Bets> }).bets ?? {};
  return {
    ...base,
    ...loaded,
    balance: typeof loaded.balance === "number" ? loaded.balance : base.balance,
    rebuys: typeof loaded.rebuys === "number" ? loaded.rebuys : base.rebuys,
    bets: {
      ...base.bets,
      ...savedBets,
      place: { ...base.bets.place, ...(savedBets.place ?? {}) },
      hard: { ...base.bets.hard, ...(savedBets.hard ?? {}) },
    },
    pointDecision: loaded.pointDecision === loaded.point && loaded.point != null && (savedBets.place?.[loaded.point] ?? 0) > 0 ? loaded.point : null,
    pending: Array.isArray(loaded.pending) ? loaded.pending : [],
    history: [],
    toasts: [],
  };
}

export const TOURNAMENT_BUYINS = [500, 1000, 2500, 5000, 10000, 15000, 20000, 25000];

export const initialState = (): GameState => ({
  balance: 1000,
  rebuys: 0,
  baseline: 1000,
  tournament: { active: false, buyIn: 0, startedBy: "", stamp: 0 },
  bets: emptyBets(),
  point: null,
  pointDecision: null,
  pending: [],
  lastRoll: null,
  rollId: 0,
  rollCount: 0,
  headline: "Shooter coming out",
  detail: "Drop chips on the felt, then roll the bones.",
  tone: "neutral",
  winKeys: [],
  mode: "manual",
  chip: 25,
  rakeMode: false,
  placeOnComeOut: false,
  soundOn: true,
  history: [],
  toasts: [],
  flashBreak: false,
});

/** Read the amount sitting on a spot. */
function spotAmount(bets: Bets, spot: BetSpot): number {
  if (spot.startsWith("place-")) return bets.place[Number(spot.slice(6)) as PointNumber];
  if (spot.startsWith("hard-")) return bets.hard[Number(spot.slice(5)) as HardNumber];
  switch (spot) {
    case "pass":
      return bets.passLine;
    case "odds":
      return bets.passOdds;
    case "dont":
      return bets.dontPass;
    case "field":
      return bets.field;
    case "anySeven":
      return bets.anySeven;
    default:
      return bets.anyCraps;
  }
}

function setSpot(bets: Bets, spot: BetSpot, amount: number) {
  if (spot.startsWith("place-")) {
    bets.place[Number(spot.slice(6)) as PointNumber] = amount;
  } else if (spot.startsWith("hard-")) {
    bets.hard[Number(spot.slice(5)) as HardNumber] = amount;
  } else {
    switch (spot) {
      case "pass":
        bets.passLine = amount;
        break;
      case "odds":
        bets.passOdds = amount;
        break;
      case "dont":
        bets.dontPass = amount;
        break;
      case "field":
        bets.field = amount;
        break;
      case "anySeven":
        bets.anySeven = amount;
        break;
      default:
        bets.anyCraps = amount;
    }
  }
}

function addToBet(bets: Bets, key: string, amount: number) {
  setSpot(bets, key as BetSpot, spotAmount(bets, key as BetSpot) + amount);
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "BET": {
      const { spot } = action;
      const amt = state.chip;
      const removing = state.rakeMode;

      // contract-bet protection
      if (spot === "pass" && state.point !== null) {
        return {
          ...state,
          toasts: pushToast(state.toasts, "Pass line is a contract bet — it's locked", "warn"),
        };
      }
      if (spot === "dont" && !removing && state.point !== null) {
        return {
          ...state,
          toasts: pushToast(state.toasts, "Don't come bets open; the Don't Pass bar closed after come-out", "warn"),
        };
      }
      if (spot === "odds") {
        if (state.point === null || state.bets.passLine === 0) {
          return {
            ...state,
            toasts: pushToast(state.toasts, "Odds need a pass bet with a point established", "warn"),
          };
        }
        const max = state.bets.passLine * MAX_ODDS_MULT;
        if (!removing && state.bets.passOdds + amt > max) {
          return {
            ...state,
            toasts: pushToast(state.toasts, `Table max: ${MAX_ODDS_MULT}× odds (${fmt(max)})`, "warn"),
          };
        }
      }

      if (removing) {
        if (state.pending.some((p) => p.key === spot)) {
          return {
            ...state,
            toasts: pushToast(state.toasts, "Dealer holds your win — press, pinch or pocket first", "warn"),
          };
        }
        const have = spotAmount(state.bets, spot);
        if (have === 0) return state;
        const take = Math.min(amt, have);
        const bets = cloneBets(state.bets);
        setSpot(bets, spot, have - take);
        return {
          ...state,
          bets,
          balance: state.balance + take,
          history: [...state.history.slice(-29), { bets: state.bets, balance: state.balance }],
        };
      }

      if (state.balance < amt) {
        return {
          ...state,
          toasts: pushToast(state.toasts, "Rack's light — pick a smaller chip or rebuy", "warn"),
        };
      }
      const bets = cloneBets(state.bets);
      setSpot(bets, spot, spotAmount(bets, spot) + amt);
      return {
        ...state,
        bets,
        balance: state.balance - amt,
        history: [...state.history.slice(-29), { bets: state.bets, balance: state.balance }],
      };
    }

    case "ROLL": {
      // unresolved decisions auto-pocket ("same bet") as the dice go out
      const autoPocket = state.pending.reduce((s, p) => s + p.amount, 0);
      const res = resolveRoll(
        state.bets,
        state.point,
        action.d1,
        action.d2,
        state.placeOnComeOut
      );
      const pendingTotal = res.pending.reduce((s, p) => s + p.amount, 0);
      // a networked shooter's point is authoritative so every rack stays in sync
      const nextPoint = action.syncPoint !== undefined ? action.syncPoint : res.point;
      const who = action.shooter ? `${action.shooter} rolls` : "";
      const body =
        res.details.length > 0
          ? res.details.join("  ·  ")
          : pendingTotal === 0
            ? res.sevenOut
              ? "Everything comes down. New shooter."
              : "Nothing doing."
            : "";
      return {
        ...state,
        bets: res.bets,
        point: nextPoint,
        pointDecision: state.point === null && nextPoint !== null && res.bets.place[nextPoint] > 0 ? nextPoint : null,
        balance: state.balance + autoPocket + res.credit,
        pending: res.pending,
        lastRoll: [action.d1, action.d2],
        rollId: state.rollId + 1,
        rollCount: state.rollCount + 1,
        headline: res.headline,
        detail: who && body ? `${who}  ·  ${body}` : who || body,
        tone: res.tone,
        winKeys: res.winKeys,
        history: [],
        flashBreak: res.sevenOut,
        toasts:
          autoPocket > 0
            ? pushToast(state.toasts, `Same bet — ${fmt(autoPocket)} pocketed for you`)
            : state.toasts,
      };
    }

    case "POINT_BET_DECISION": {
      const from = state.pointDecision;
      if (from === null || state.point !== from) return { ...state, pointDecision: null };
      const amount = state.bets.place[from];
      if (action.to === "keep" || amount <= 0) return { ...state, pointDecision: null };
      if (action.to !== "pocket" && (action.to === from || ![4, 5, 6, 8, 9, 10].includes(action.to))) return state;
      const bets = cloneBets(state.bets);
      bets.place[from] = 0;
      if (action.to !== "pocket") bets.place[action.to] += amount;
      return {
        ...state,
        bets,
        balance: state.balance + (action.to === "pocket" ? amount : 0),
        pointDecision: null,
        history: [],
        toasts: pushToast(state.toasts, action.to === "pocket" ? `${fmt(amount)} returned to your rack` : `${fmt(amount)} moved from ${from} to ${action.to}`),
      };
    }

    case "PRESS": {
      if (state.pending.length === 0) return state;
      const bets = cloneBets(state.bets);
      for (const p of state.pending) addToBet(bets, p.key, p.amount);
      const total = state.pending.reduce((s, p) => s + p.amount, 0);
      return {
        ...state,
        bets,
        pending: [],
        toasts: pushToast(state.toasts, `Pressed! ${fmt(total)} rides on the layout`),
      };
    }

    case "PINCH": {
      // half the pool presses onto a picked number, half drops to the rack
      if (state.pending.length === 0) return state;
      const pool = state.pending.reduce((s, p) => s + p.amount, 0);
      const rides = Math.floor(pool / 2);
      const rack = pool - rides;
      const bets = cloneBets(state.bets);
      if (rides > 0) bets.place[action.to] += rides;
      return {
        ...state,
        bets,
        balance: state.balance + rack,
        pending: [],
        toasts: pushToast(
          state.toasts,
          rides > 0
            ? `Pinched — ${fmt(rides)} rides the ${action.to}, ${fmt(rack)} to the rack`
            : `${fmt(rack)} to the rack`
        ),
      };
    }

    case "POCKET": {
      if (state.pending.length === 0) return state;
      const total = state.pending.reduce((s, p) => s + p.amount, 0);
      return {
        ...state,
        balance: state.balance + total,
        pending: [],
        toasts: pushToast(state.toasts, `${fmt(total)} pocketed — same bet`),
      };
    }

    case "UNDO": {
      const snap = state.history[state.history.length - 1];
      if (!snap) return state;
      return {
        ...state,
        bets: snap.bets,
        balance: snap.balance,
        history: state.history.slice(0, -1),
      };
    }

    case "CLEAR": {
      const snapshot: Snapshot = { bets: state.bets, balance: state.balance };
      const bets = cloneBets(state.bets);
      let back = 0;
      // pass line is contract while a point is on
      back += bets.dontPass + bets.field + bets.anySeven + bets.anyCraps + bets.passOdds;
      bets.dontPass = 0;
      bets.field = 0;
      bets.anySeven = 0;
      bets.anyCraps = 0;
      bets.passOdds = 0;
      for (const k of Object.keys(bets.place) as unknown as PointNumber[]) {
        back += bets.place[k];
        bets.place[k] = 0;
      }
      for (const k of Object.keys(bets.hard) as unknown as HardNumber[]) {
        back += bets.hard[k];
        bets.hard[k] = 0;
      }
      if (state.point === null) {
        back += bets.passLine;
        bets.passLine = 0;
      }
      // clearing the layout settles any held winnings straight to the rack
      const held = state.pending.reduce((s, p) => s + p.amount, 0);
      if (back === 0 && held === 0) return state;
      return {
        ...state,
        bets,
        pending: [],
        balance: state.balance + back + held,
        history: back === 0 ? state.history : [...state.history.slice(-29), snapshot],
        toasts: pushToast(
          state.toasts,
          held > 0 ? `${fmt(back + held)} raked back (wins pocketed)` : `${fmt(back)} raked back`
        ),
      };
    }

    case "REBUY":
      // tournament chips are finite — no reaching into your pocket mid-match
      if (state.tournament.active) {
        return {
          ...state,
          toasts: pushToast(state.toasts, "Tournament play — no rebuys. Play your stack.", "warn"),
        };
      }
      return {
        ...state,
        balance: state.balance + 1000,
        rebuys: state.rebuys + 1,
        baseline: state.baseline + 1000,
      };

    case "START_TOURNAMENT":
      // everyone resets to an identical stack; the felt is swept clean
      return {
        ...initialState(),
        soundOn: state.soundOn,
        placeOnComeOut: state.placeOnComeOut,
        mode: action.mode,
        chip: state.chip,
        balance: action.buyIn,
        baseline: action.buyIn,
        tournament: {
          active: true,
          buyIn: action.buyIn,
          startedBy: action.startedBy,
          stamp: action.stamp,
        },
        headline: "Tournament — shooter coming out",
        detail: `${fmt(action.buyIn)} stack · no rebuys · good luck`,
        toasts: pushToast(state.toasts, `Tournament started — ${fmt(action.buyIn)} per player`),
      };

    case "END_TOURNAMENT":
      return {
        ...state,
        tournament: { active: false, buyIn: 0, startedBy: "", stamp: 0 },
        toasts: pushToast(state.toasts, "Tournament over — cash game resumed"),
      };

    case "RESET_SESSION":
      return state.tournament.active ? state : initialState();

    case "SET_CHIP":
      return { ...state, chip: action.chip, rakeMode: false };
    case "SET_MODE":
      return state.tournament.active ? state : { ...state, mode: action.mode };
    case "TOGGLE_RAKE":
      return { ...state, rakeMode: !state.rakeMode };
    case "TOGGLE_COME_OUT":
      return {
        ...state,
        placeOnComeOut: !state.placeOnComeOut,
        toasts: pushToast(
          state.toasts,
          state.placeOnComeOut ? "Place bets OFF on come-out now" : "Place bets now WORKING on come-out"
        ),
      };
    case "TOGGLE_SOUND":
      return { ...state, soundOn: !state.soundOn };
    case "DISMISS_TOAST":
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) };
    default:
      return state;
  }
}

export function useCraps() {
  const [state, dispatch] = useReducer(reducer, undefined, hydrateState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const derived = useMemo(() => {
    const onLayout = totalOnLayout(state.bets);
    const pendingTotal = state.pending.reduce((s, p) => s + p.amount, 0);
    const exposure = onLayout + state.balance;
    const tapped = state.balance < CHIPS[0] && onLayout === 0 && pendingTotal === 0;
    return {
      onLayout,
      pendingTotal,
      stack: exposure,
      session: exposure - state.baseline,
      broke: tapped && !state.tournament.active,
      busted: tapped && state.tournament.active,
    };
  }, [state.balance, state.bets, state.pending, state.baseline, state.tournament.active]);

  return { state, dispatch, ...derived };
}

export type Craps = ReturnType<typeof useCraps>;
