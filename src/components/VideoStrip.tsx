import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Video, VideoOff, Dices, Users } from "lucide-react";
import { cn } from "../utils/cn";
import type { PeerInfo } from "../net/useRoom";

function Tile({
  name,
  stream,
  micOn,
  camOn,
  isSelf,
  isShooter,
}: {
  name: string;
  stream?: MediaStream | null;
  micOn: boolean;
  camOn: boolean;
  isSelf?: boolean;
  isShooter?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && stream && el.srcObject !== stream) el.srcObject = stream;
  }, [stream]);

  const initials = name.slice(0, 2).toUpperCase();

  return (
    <div
      className={cn(
        "relative h-[74px] w-[62px] flex-none overflow-hidden rounded-xl border bg-black/50",
        isShooter ? "border-gold-400 shadow-[0_0_12px_rgba(245,196,81,0.35)]" : "border-white/15"
      )}
    >
      {/* remote audio always plays; self is muted to avoid feedback */}
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={isSelf}
        className={cn("h-full w-full object-cover", !camOn && "invisible")}
      />
      {!camOn && (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-b from-felt-700 to-felt-900">
          <span className="font-num text-lg text-purple-200/80">{initials}</span>
        </div>
      )}

      {isShooter && (
        <div className="absolute left-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-gold-400 text-purple-950">
          <Dices size={10} strokeWidth={3} />
        </div>
      )}
      {!micOn && (
        <div className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-red-500/90 text-white">
          <MicOff size={9} strokeWidth={3} />
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 truncate bg-black/65 px-1 py-0.5 text-center text-[8px] font-bold text-white">
        {isSelf ? "You" : name}
      </div>
    </div>
  );
}

export function VideoStrip({
  show,
  peers,
  selfStream,
  selfName,
  micOn,
  camOn,
  onToggleMic,
  onToggleCam,
  shooterId,
  selfId,
  onOpenLobby,
}: {
  show: boolean;
  peers: PeerInfo[];
  selfStream: MediaStream | null;
  selfName: string;
  micOn: boolean;
  camOn: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  shooterId: string | null;
  selfId: string;
  onOpenLobby: () => void;
}) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="overflow-hidden border-b border-gold-400/15 bg-black/25 backdrop-blur-sm"
        >
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto px-3 py-2">
            {/* mic / cam controls */}
            <div className="flex flex-none flex-col gap-1">
              <button
                type="button"
                onClick={onToggleMic}
                aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
                className={cn(
                  "grid h-[35px] w-[46px] place-items-center rounded-lg border transition active:scale-95",
                  micOn
                    ? "border-emerald-400/50 bg-emerald-400/20 text-emerald-300"
                    : "border-white/15 bg-white/5 text-white/50"
                )}
              >
                {micOn ? <Mic size={16} /> : <MicOff size={16} />}
              </button>
              <button
                type="button"
                onClick={onToggleCam}
                aria-label={camOn ? "Turn camera off" : "Turn camera on"}
                className={cn(
                  "grid h-[35px] w-[46px] place-items-center rounded-lg border transition active:scale-95",
                  camOn
                    ? "border-emerald-400/50 bg-emerald-400/20 text-emerald-300"
                    : "border-white/15 bg-white/5 text-white/50"
                )}
              >
                {camOn ? <Video size={16} /> : <VideoOff size={16} />}
              </button>
            </div>

            <Tile
              name={selfName || "You"}
              stream={selfStream}
              micOn={micOn}
              camOn={camOn}
              isSelf
              isShooter={shooterId === selfId}
            />

            {peers.map((p) => (
              <Tile
                key={p.id}
                name={p.name}
                stream={p.stream}
                micOn={p.micOn}
                camOn={p.camOn}
                isShooter={shooterId === p.id}
              />
            ))}

            {peers.length === 0 && (
              <button
                type="button"
                onClick={onOpenLobby}
                className="flex h-[74px] flex-none flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/25 px-3 text-white/55 active:scale-95"
              >
                <Users size={16} />
                <span className="text-[8px] font-bold uppercase tracking-wide">Invite</span>
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
