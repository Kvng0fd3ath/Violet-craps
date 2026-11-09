import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Users,
  Shuffle,
  LogIn,
  LogOut,
  Copy,
  Check,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Dices,
  Trophy,
} from "lucide-react";
import { cn } from "../utils/cn";
import { randomRoomCode, type RoomApi } from "../net/useRoom";
import { TOURNAMENT_BUYINS, type Tournament, type Mode } from "../hooks/useCraps";
import { fmt } from "../game/craps";

export function LobbySheet({
  open,
  onClose,
  room,
  shooterId,
  tournament,
  currentMode,
  onStartTournament,
  onEndTournament,
}: {
  open: boolean;
  onClose: () => void;
  room: RoomApi;
  shooterId: string | null;
  tournament: Tournament;
  currentMode: Mode;
  onStartTournament: (buyIn: number, mode: Mode) => void;
  onEndTournament: () => void;
}) {
  const [codeInput, setCodeInput] = useState("");
  const [nameInput, setNameInput] = useState(room.name);
  const [copied, setCopied] = useState(false);
  const [buyIn, setBuyIn] = useState(5000);
  const [tournamentMode, setTournamentMode] = useState<Mode | null>(null);
  const selectedMode = tournamentMode ?? currentMode;
  const [confirmStart, setConfirmStart] = useState(false);

  const copyCode = async () => {
    if (!room.roomCode) return;
    try {
      await navigator.clipboard.writeText(room.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[86dvh] w-full max-w-lg overflow-hidden rounded-t-[28px] border-t border-gold-400/30 bg-felt-950 shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 pb-1 pt-4">
              <h2 className="gold-text font-display text-lg font-bold tracking-widest">
                THE LOBBY
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white active:scale-90"
              >
                <X size={18} />
              </button>
            </div>

            <div className="no-scrollbar max-h-[calc(86dvh-64px)] overflow-y-auto px-5 pb-8">
              {!room.inRoom ? (
                <>
                  <p className="text-[11px] leading-4 text-purple-200/70">
                    Share a table code with friends — everyone who enters the same code lands at this
                    felt. Dice rolls sync live, and you can turn on mic and camera to talk trash.
                  </p>

                  <label className="mt-4 block text-[9px] font-black uppercase tracking-[0.2em] text-gold-300">
                    Your name
                  </label>
                  <input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Shooter"
                    maxLength={14}
                    className="mt-1 w-full rounded-xl border border-white/15 bg-black/35 px-3.5 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/30 focus:border-gold-400/60"
                  />

                  <label className="mt-3 block text-[9px] font-black uppercase tracking-[0.2em] text-gold-300">
                    Table code
                  </label>
                  <div className="mt-1 flex gap-2">
                    <input
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                      placeholder="HARD-EIGHT-420"
                      className="flex-1 rounded-xl border border-white/15 bg-black/35 px-3.5 py-3 font-num text-lg tracking-widest text-white outline-none placeholder:text-white/25 focus:border-gold-400/60"
                    />
                    <button
                      type="button"
                      onClick={() => setCodeInput(randomRoomCode())}
                      aria-label="Random code"
                      className="grid w-12 flex-none place-items-center rounded-xl border border-white/15 bg-white/5 text-gold-300 active:scale-95"
                    >
                      <Shuffle size={18} />
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={!codeInput.trim()}
                    onClick={() => {
                      room.join(codeInput, nameInput);
                      onClose();
                    }}
                    className="btn-press mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-num text-xl tracking-[0.2em] text-purple-950 transition active:scale-95 disabled:opacity-40"
                  >
                    <LogIn size={18} strokeWidth={2.5} />
                    TAKE A SEAT
                  </button>

                  <p className="mt-3 text-center text-[10px] leading-4 text-purple-200/45">
                    Peer-to-peer over WebRTC — no server stores your game or video.
                  </p>
                </>
              ) : (
                <>
                  {/* table code */}
                  <div className="rounded-2xl border border-gold-400/30 bg-gold-400/[0.07] p-3.5">
                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-gold-300">
                      Table code — share it
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="font-num text-2xl tracking-widest text-white">
                        {room.roomCode}
                      </span>
                      <button
                        type="button"
                        onClick={copyCode}
                        className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-[11px] font-bold text-white active:scale-95"
                      >
                        {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>

                  {/* media controls */}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={room.toggleMic}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold transition active:scale-95",
                        room.micOn
                          ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-300"
                          : "border-white/15 bg-white/5 text-white/60"
                      )}
                    >
                      {room.micOn ? <Mic size={16} /> : <MicOff size={16} />}
                      Mic {room.micOn ? "on" : "off"}
                    </button>
                    <button
                      type="button"
                      onClick={room.toggleCam}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold transition active:scale-95",
                        room.camOn
                          ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-300"
                          : "border-white/15 bg-white/5 text-white/60"
                      )}
                    >
                      {room.camOn ? <Video size={16} /> : <VideoOff size={16} />}
                      Cam {room.camOn ? "on" : "off"}
                    </button>
                  </div>
                  {room.mediaState === "denied" && (
                    <p className="mt-2 text-center text-[10px] text-red-300/80">
                      Camera/mic blocked — enable permissions in your browser settings.
                    </p>
                  )}

                  {/* ---------------- tournament ---------------- */}
                  <div className="mt-3 rounded-2xl border border-white/15 bg-black/25 p-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Trophy size={14} className="text-gold-400" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gold-300">
                          Tournament
                        </span>
                      </div>
                      {tournament.active && (
                        <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-emerald-300">
                          live
                        </span>
                      )}
                    </div>

                    {tournament.active ? (
                      <>
                        <div className="mt-2 flex items-end justify-between">
                          <div>
                            <div className="font-num text-2xl leading-6 text-white">
                              {fmt(tournament.buyIn)}
                            </div>
                            <div className="text-[10px] text-purple-200/65">
                              starting stack · no rebuys · {currentMode} rolls locked
                            </div>
                          </div>
                          <div className="text-right text-[10px] text-purple-200/55">
                            started by
                            <br />
                            <span className="font-bold text-white">{tournament.startedBy}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={onEndTournament}
                          className="mt-3 w-full rounded-xl border border-white/20 bg-white/5 py-2.5 text-[12px] font-bold text-white/80 active:scale-[0.98]"
                        >
                          End tournament (back to cash game)
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="mt-1.5 text-[11px] leading-4 text-purple-200/70">
                          Everyone starts with the same stack and nobody can add chips mid-match.
                          Last rack standing takes it.
                        </p>
                        <div className="mt-2.5 text-[9px] font-black uppercase tracking-[0.2em] text-gold-300">
                          Starting chips
                        </div>
                        <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                          {TOURNAMENT_BUYINS.map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setBuyIn(amt)}
                              className={cn(
                                "flex flex-col items-center rounded-lg border py-2 transition active:scale-95",
                                buyIn === amt
                                  ? "border-gold-400 bg-gold-400/20 text-gold-200"
                                  : "border-white/12 bg-white/5 text-white/65"
                              )}
                            >
                              <span className="font-num text-base leading-5 tracking-wide">
                                {amt >= 1000 ? `${amt / 1000}K` : amt}
                              </span>
                              <span className="text-[7px] font-bold uppercase tracking-[0.15em] opacity-60">
                                chips
                              </span>
                            </button>
                          ))}
                        </div>

                        <div className="mt-3 text-[9px] font-black uppercase tracking-[0.2em] text-gold-300">Roll method · locked for the match</div>
                        <div className="mt-1.5 flex gap-2">
                          {(["virtual", "manual"] as const).map((mode) => (
                            <button key={mode} type="button" onClick={() => { setTournamentMode(mode); setConfirmStart(false); }} aria-pressed={selectedMode === mode} className={cn("flex-1 rounded-lg border py-2 text-sm font-bold capitalize", selectedMode === mode ? "border-gold-400 bg-gold-400/20 text-gold-200" : "border-white/15 bg-white/5 text-white/65")}>{mode}</button>
                          ))}
                        </div>

                        {!confirmStart ? (
                          <button
                            type="button"
                            onClick={() => setConfirmStart(true)}
                            className="btn-press mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-num text-lg tracking-[0.18em] text-purple-950 active:scale-95"
                          >
                            <Trophy size={16} strokeWidth={2.5} />
                            START TOURNAMENT
                          </button>
                        ) : (
                          <div className="mt-3 rounded-xl border border-gold-400/40 bg-gold-400/10 p-2.5">
                            <p className="text-center text-[11px] font-semibold leading-4 text-gold-200">
                              Reset every rack to {fmt(buyIn)}, lock rebuys and use {selectedMode} rolls for the match?
                            </p>
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => setConfirmStart(false)}
                                className="flex-1 rounded-lg border border-white/20 bg-white/5 py-2 text-[12px] font-bold text-white/70 active:scale-95"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onStartTournament(buyIn, selectedMode);
                                  setConfirmStart(false);
                                  onClose();
                                }}
                                className="btn-press flex-1 rounded-lg py-2 text-[12px] font-black text-purple-950 active:scale-95"
                              >
                                Deal them in
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* roster */}
                  <div className="mt-4 text-[9px] font-black uppercase tracking-[0.2em] text-gold-300">
                    {tournament.active ? "Standings" : "At the rail"} ({room.roster.length})
                  </div>
                  <div className="mt-1.5 overflow-hidden rounded-2xl border border-white/10">
                    {room.roster.map((p, i) => (
                      <div
                        key={p.id}
                        className={cn(
                          "flex items-center justify-between px-3.5 py-2.5",
                          i % 2 === 0 ? "bg-white/[0.05]" : ""
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Users size={13} className="text-purple-300/70" />
                          <span className="text-[13px] font-bold text-white">
                            {p.isSelf ? `${p.name} (you)` : p.name}
                          </span>
                          {shooterId === p.id && (
                            <span className="flex items-center gap-1 rounded-full bg-gold-400/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-gold-300">
                              <Dices size={10} /> shooter
                            </span>
                          )}
                        </div>
                        <span
                          className={cn(
                            "font-num text-base tracking-wide",
                            p.chips === 0 && tournament.active ? "text-red-400/80" : "text-gold-300"
                          )}
                        >
                          {p.chips === 0 && tournament.active ? "BUSTED" : fmt(p.chips)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {room.roster.length === 1 && (
                    <p className="mt-2 text-center text-[10px] text-purple-200/50">
                      Waiting for friends to join with the code above…
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      room.leave();
                      onClose();
                    }}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/30 bg-red-950/25 py-3 text-sm font-bold text-red-300 active:scale-95"
                  >
                    <LogOut size={16} />
                    Leave table
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
