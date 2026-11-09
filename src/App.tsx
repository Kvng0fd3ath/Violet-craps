import { useCallback, useEffect, useRef, useState } from "react";
import { Dices, Coins, Volume2, VolumeX, Info, Plus, Users, Trophy } from "lucide-react";
import { cn } from "./utils/cn";
import { useCraps, BetSpot, type Mode } from "./hooks/useCraps";
import { fmt, POINT_NUMBERS, type PointNumber } from "./game/craps";
import { initAudio, playRattle, playOutcome, playChip, vibrate } from "./game/audio";
import { TableFelt } from "./components/TableFelt";
import { RollBar } from "./components/RollBar";
import { HelpSheet } from "./components/HelpSheet";
import { Toasts } from "./components/Toasts";
import { VideoStrip } from "./components/VideoStrip";
import { LobbySheet } from "./components/LobbySheet";
import { useRoom, type RollMsg, type TourneyMsg } from "./net/useRoom";
import { useAppUpdate } from "./net/useAppUpdate";
import { UpdateBar } from "./components/UpdateBar";

const ROLL_MS = 1450;

export default function App() {
  const game = useCraps();
  const { state, dispatch, onLayout, pendingTotal, session, broke, busted, stack } = game;
  const [rolling, setRolling] = useState(false);
  const [manual, setManual] = useState<[number, number]>([4, 3]);
  const [manualSlot, setManualSlot] = useState<0 | 1>(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const [lobbyOpen, setLobbyOpen] = useState(false);
  const [shooterIdx, setShooterIdx] = useState(0);
  const rollTimer = useRef<number | undefined>(undefined);

  /* ------------------------------ multiplayer ------------------------------ */

  // a remote shooter's dice land on everyone's felt; their point is authoritative
  const handleRemoteRoll = useCallback(
    (msg: RollMsg) => {
      initAudio();
      if (state.soundOn) playRattle();
      vibrate([0, 20, 60, 20]);
      setRolling(true);
      dispatch({
        type: "ROLL",
        d1: msg.d1,
        d2: msg.d2,
        syncPoint: (msg.point as PointNumber | null) ?? null,
        shooter: msg.name,
      });
      if (msg.sevenOut) setShooterIdx((i) => i + 1);
      rollTimer.current = window.setTimeout(() => setRolling(false), ROLL_MS);
    },
    [dispatch, state.soundOn]
  );

  // a peer started a tournament — reset to the agreed stack and lock rebuys
  const handleTournamentStart = useCallback(
    (msg: TourneyMsg) => {
      dispatch({
        type: "START_TOURNAMENT",
        buyIn: msg.buyIn,
        startedBy: msg.startedBy,
        stamp: msg.stamp,
        mode: msg.mode === "manual" ? "manual" : "virtual",
      });
      vibrate([0, 30, 60, 30]);
    },
    [dispatch]
  );

  const room = useRoom(handleRemoteRoll, handleTournamentStart);

  const startTournament = (buyIn: number, mode: Mode) => {
    const msg = room.startTournament(buyIn, mode);
    dispatch({
      type: "START_TOURNAMENT",
      buyIn,
      startedBy: msg.startedBy || "You",
      stamp: msg.stamp,
      mode,
    });
  };

  const endTournament = () => {
    room.clearTournament();
    dispatch({ type: "END_TOURNAMENT" });
  };

  /* safe to auto-refresh only when there's nothing at stake */
  const tableIdle =
    !rolling && onLayout === 0 && pendingTotal === 0 && state.point === null && !room.inRoom;
  const { updateReady, applyUpdate, checkNow, checking, install } = useAppUpdate(tableIdle);
  const shooter = room.roster.length > 0 ? room.roster[shooterIdx % room.roster.length] : null;
  const isShooter = !room.inRoom || shooter?.id === room.selfId;

  /* ------------------------------ actions ------------------------------ */

  const handleSpot = (spot: BetSpot) => {
    if (rolling) return;
    initAudio();
    if (state.soundOn) playChip();
    vibrate(8);
    dispatch({ type: "BET", spot });
  };

  const handleRoll = () => {
    if (rolling || !isShooter || state.pointDecision !== null) return;
    initAudio();
    const d1 = state.mode === "virtual" ? 1 + Math.floor(Math.random() * 6) : manual[0];
    const d2 = state.mode === "virtual" ? 1 + Math.floor(Math.random() * 6) : manual[1];
    if (state.soundOn) playRattle();
    vibrate([0, 25, 70, 25]);
    setRolling(true);

    // work out the point the same way the engine will, so peers stay locked together
    const total = d1 + d2;
    let nextPoint = state.point;
    if (state.point === null) {
      nextPoint = [4, 5, 6, 8, 9, 10].includes(total) ? (total as PointNumber) : null;
    } else if (total === state.point || total === 7) {
      nextPoint = null;
    }

    const sevenOut = total === 7 && state.point !== null;
    dispatch({ type: "ROLL", d1, d2 });
    if (room.inRoom) room.broadcastRoll(d1, d2, nextPoint, sevenOut);
    // seven-out passes the dice to the next player at the rail
    if (sevenOut) setShooterIdx((i) => i + 1);
    if (state.mode === "manual") setManualSlot(0);
    rollTimer.current = window.setTimeout(() => setRolling(false), ROLL_MS);
  };

  /* keypad entry: a tap fills slot A, the cursor hops to B, then wraps */
  const handleKeypad = (v: number) => {
    vibrate(6);
    setManual((prev) => (manualSlot === 0 ? [v, prev[1]] : [prev[0], v]));
    setManualSlot(manualSlot === 0 ? 1 : 0);
  };

  /* ------------------------- sound / haptic outcomes ------------------------- */
  const soundRef = useRef(state.soundOn);
  soundRef.current = state.soundOn;

  useEffect(() => {
    if (state.rollId === 0) return;
    const t = window.setTimeout(() => {
      if (!soundRef.current) return;
      if (state.tone === "win" || state.tone === "lose" || state.tone === "point") {
        playOutcome(state.tone);
      }
      if (state.tone === "lose") vibrate([0, 60, 90, 60]);
      if (state.tone === "win") vibrate([0, 30, 50, 90]);
    }, ROLL_MS - 320);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.rollId]);

  /* ------------------------------ toast expiry ------------------------------ */
  useEffect(() => {
    if (state.toasts.length === 0) return;
    const t = window.setTimeout(
      () => dispatch({ type: "DISMISS_TOAST", id: state.toasts[0].id }),
      2600
    );
    return () => window.clearTimeout(t);
  }, [state.toasts, dispatch]);

  useEffect(() => () => window.clearTimeout(rollTimer.current), []);

  /* keep the table's standings board up to date with our stack */
  useEffect(() => {
    if (room.inRoom) room.reportChips(stack);
  }, [stack, room]);

  /* ------------------------------ render ------------------------------ */

  const sessionLabel = `${session > 0 ? "+$" : "-$"}${Math.abs(session).toLocaleString("en-US")}`;

  return (
    <div className="relative min-h-dvh">
      {/* fixed purple felt backdrop */}
      <div className="fixed inset-0 felt" />
      <div className="felt-grain fixed inset-0" />
      <div className="felt-vignette fixed inset-0" />
      {/* table side rails (desktop garnish) */}
      <div className="pointer-events-none fixed inset-y-0 left-0 hidden w-10 border-r border-gold-400/15 bg-gradient-to-r from-black/40 to-transparent md:block" />
      <div className="pointer-events-none fixed inset-y-0 right-0 hidden w-10 border-l border-gold-400/15 bg-gradient-to-l from-black/40 to-transparent md:block" />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-lg flex-col">
        {/* ------------------------------ header ------------------------------ */}
        <header className="safe-top sticky top-0 z-30 border-b border-gold-400/15 bg-felt-950/80 backdrop-blur-md">
          <div className="flex items-center justify-between gap-2 px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-xl btn-press text-purple-950">
                <Dices size={19} strokeWidth={2.5} />
              </div>
              <div>
                <div className="gold-text font-display text-[15px] font-black leading-4 tracking-[0.18em]">
                  VIOLET FELT
                </div>
                <div className="text-[8px] font-bold uppercase tracking-[0.35em] text-purple-200/60">
                  mobile craps
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="mr-1 text-right">
                <div className="flex items-center justify-end gap-1">
                  <Coins size={12} className="text-gold-400" />
                  <span className="font-num text-xl leading-5 tracking-wide text-white">
                    {fmt(state.balance)}
                  </span>
                </div>
                <div className="text-[8.5px] font-semibold text-purple-200/60">
                  {fmt(onLayout)} on felt
                  {session !== 0 && (
                    <span className={cn("ml-1 font-bold", session > 0 ? "text-emerald-400" : "text-red-400")}>
                      {sessionLabel}
                    </span>
                  )}
                </div>
              </div>
              {state.tournament.active ? (
                <div
                  aria-label="Tournament play — rebuys locked"
                  className="grid h-9 w-9 place-items-center rounded-full bg-gold-400/15 text-gold-300"
                >
                  <Trophy size={16} />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => dispatch({ type: "REBUY" })}
                  aria-label="Rebuy $1,000"
                  className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-gold-300 transition active:scale-90"
                >
                  <Plus size={17} />
                </button>
              )}
              <button
                type="button"
                onClick={() => dispatch({ type: "TOGGLE_SOUND" })}
                aria-label="Toggle sound"
                className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white/80 transition active:scale-90"
              >
                {state.soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}
              </button>
              <button
                type="button"
                onClick={() => setLobbyOpen(true)}
                aria-label="Lobby and friends"
                className={cn(
                  "relative grid h-9 w-9 place-items-center rounded-full transition active:scale-90",
                  room.inRoom ? "bg-emerald-400/20 text-emerald-300" : "bg-white/10 text-white/80"
                )}
              >
                <Users size={17} />
                {room.inRoom && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-emerald-400 px-1 text-[9px] font-black text-emerald-950">
                    {room.roster.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                aria-label="Rules and odds"
                className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white/80 transition active:scale-90"
              >
                <Info size={17} />
              </button>
            </div>
          </div>
        </header>

        {/* ------------------------------ friends on cam ------------------------------ */}
        <VideoStrip
          show={room.inRoom}
          peers={room.peerList}
          selfStream={room.selfStream}
          selfName={room.name}
          micOn={room.micOn}
          camOn={room.camOn}
          onToggleMic={room.toggleMic}
          onToggleCam={room.toggleCam}
          shooterId={shooter?.id ?? null}
          selfId={room.selfId}
          onOpenLobby={() => setLobbyOpen(true)}
        />

        {/* ------------------------------ the felt ------------------------------ */}
        <main className="flex-1">
          <TableFelt
            bets={state.bets}
            point={state.point}
            roll={state.lastRoll}
            rollId={state.rollId}
            winKeys={state.winKeys}
            headline={state.headline}
            detail={state.detail}
            tone={state.tone}
            placeOnComeOut={state.placeOnComeOut}
            onSpot={handleSpot}
          />
        </main>

        {/* ------------------------------ sticky roll bar ------------------------------ */}
        <RollBar
          mode={state.mode}
          modeLocked={state.tournament.active}
          onMode={(m) => dispatch({ type: "SET_MODE", mode: m })}
          chip={state.chip}
          onChip={(c) => dispatch({ type: "SET_CHIP", chip: c })}
          rakeMode={state.rakeMode}
          onRake={() => dispatch({ type: "TOGGLE_RAKE" })}
          canUndo={state.history.length > 0}
          onUndo={() => dispatch({ type: "UNDO" })}
          onClear={() => dispatch({ type: "CLEAR" })}
          pending={state.pending}
          pendingTotal={pendingTotal}
          onPress={() => {
            vibrate([0, 20, 40]);
            dispatch({ type: "PRESS" });
          }}
          onPinch={(to) => {
            vibrate([0, 20, 40]);
            dispatch({ type: "PINCH", to });
          }}
          onPocket={() => {
            vibrate(20);
            dispatch({ type: "POCKET" });
          }}
          rolling={rolling}
          onRoll={handleRoll}
          lastRoll={state.lastRoll}
          point={state.point}
          manual={manual}
          manualSlot={manualSlot}
          onKeypad={handleKeypad}
          inRoom={room.inRoom}
          isShooter={isShooter}
          shooterName={shooter?.isSelf ? "You" : (shooter?.name ?? null)}
        />
      </div>

      <UpdateBar show={updateReady} onApply={applyUpdate} />
      <Toasts toasts={state.toasts} />
      <HelpSheet
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        soundOn={state.soundOn}
        onToggleSound={() => dispatch({ type: "TOGGLE_SOUND" })}
        placeOnComeOut={state.placeOnComeOut}
        onToggleComeOut={() => dispatch({ type: "TOGGLE_COME_OUT" })}
        onReset={() => dispatch({ type: "RESET_SESSION" })}
        inRoom={room.inRoom}
        micOn={room.micOn}
        camOn={room.camOn}
        onToggleMic={room.toggleMic}
        onToggleCam={room.toggleCam}
        install={install}
        onCheckUpdate={checkNow}
        checking={checking}
        updateReady={updateReady}
        onApplyUpdate={applyUpdate}
      />
      <LobbySheet
        open={lobbyOpen}
        onClose={() => setLobbyOpen(false)}
        room={room}
        shooterId={shooter?.id ?? null}
        tournament={state.tournament}
        currentMode={state.mode}
        onStartTournament={startTournament}
        onEndTournament={endTournament}
      />

      {state.pointDecision !== null && !rolling && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/80 px-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="point-bet-title">
          <div className="w-full max-w-xs rounded-3xl border border-gold-400/40 bg-felt-950 p-5 text-center shadow-2xl">
            <h3 id="point-bet-title" className="gold-text font-display text-lg font-bold">Point is {state.pointDecision}</h3>
            <p className="mt-2 text-sm text-purple-100">Your {fmt(state.bets.place[state.pointDecision])} place bet is on the point. Move it to another number or pocket it?</p>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {POINT_NUMBERS.filter((n) => n !== state.pointDecision).map((n) => (
                <button key={n} type="button" onClick={() => dispatch({ type: "POINT_BET_DECISION", to: n })} className="rounded-xl border border-gold-400/40 bg-gold-400/10 py-3 font-num text-xl text-gold-300" aria-label={`Move bet to ${n}`}>{n}</button>
              ))}
            </div>
            <button type="button" onClick={() => dispatch({ type: "POINT_BET_DECISION", to: "pocket" })} className="btn-press mt-3 w-full rounded-xl py-3 font-bold text-purple-950">Pocket bet</button>
            <button type="button" onClick={() => dispatch({ type: "POINT_BET_DECISION", to: "keep" })} className="mt-2 w-full rounded-xl border border-white/20 py-2 text-sm text-white/80">Keep bet on {state.pointDecision}</button>
          </div>
        </div>
      )}

      {/* ------------------------------ busted out of the tournament ------------------------------ */}
      {busted && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/80 px-6 backdrop-blur-sm">
          <div className="call-pop w-full max-w-xs rounded-3xl border border-red-400/40 bg-felt-950 p-6 text-center shadow-2xl">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-red-500/20 text-red-300">
              <Trophy size={26} strokeWidth={2.5} />
            </div>
            <h3 className="font-display text-lg font-black tracking-widest text-red-300">
              BUSTED OUT
            </h3>
            <p className="mt-1 text-[12px] leading-5 text-purple-200/75">
              Your tournament stack is gone — no rebuys in tournament play. Rail the table and watch
              it play out.
            </p>
            {room.inRoom && (
              <p className="mt-2 text-[11px] font-semibold text-gold-300">
                {room.roster.filter((p) => p.chips > 0).length} still alive
              </p>
            )}
            <button
              type="button"
              onClick={endTournament}
              className="mt-4 w-full rounded-2xl border border-white/20 bg-white/5 py-3 text-sm font-bold text-white/80 transition active:scale-95"
            >
              End tournament
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------ broke ------------------------------ */}
      {broke && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/75 px-6 backdrop-blur-sm">
          <div className="call-pop w-full max-w-xs rounded-3xl border border-gold-400/40 bg-felt-950 p-6 text-center shadow-2xl">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl btn-press text-purple-950">
              <Dices size={26} strokeWidth={2.5} />
            </div>
            <h3 className="gold-text font-display text-lg font-black tracking-widest">RACK'S EMPTY</h3>
            <p className="mt-1 text-[12px] leading-5 text-purple-200/75">
              The felt took it all. The cage will front you another grand.
            </p>
            <button
              type="button"
              onClick={() => dispatch({ type: "REBUY" })}
              className="btn-press mt-4 w-full rounded-2xl py-3 font-num text-xl tracking-[0.25em] text-purple-950 transition-transform active:scale-95"
            >
              REBUY $1,000
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
