import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { joinRoom, selfId, type Room } from "trystero/nostr";

/* ------------------------------------------------------------------
   Serverless P2P lobby — WebRTC mesh matchmade over public Nostr
   relays. No backend, no API keys. Carries game sync + mic/cam.
------------------------------------------------------------------- */

const APP_ID = "violet-felt-craps-v1";
const NAME_KEY = "violet-felt-name";
const ROOM_KEY = "violet-felt-room";

export interface PeerInfo {
  id: string;
  name: string;
  micOn: boolean;
  camOn: boolean;
  chips: number;
  stream?: MediaStream;
}

/** Broadcast when a player kicks off tournament play. */
export interface TourneyMsg {
  buyIn: number;
  startedBy: string;
  mode: "virtual" | "manual";
  stamp: number;
  [k: string]: string | number;
}

export interface RollMsg {
  d1: number;
  d2: number;
  point: number | null;
  name: string;
  sevenOut: boolean;
  [k: string]: string | number | boolean | null;
}

interface Presence {
  name: string;
  micOn: boolean;
  camOn: boolean;
  chips: number;
  [k: string]: string | boolean | number;
}

export type MediaState = "off" | "requesting" | "on" | "denied";

export const loadName = () => {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
};
export const loadRoomCode = () => {
  try {
    return localStorage.getItem(ROOM_KEY) ?? "";
  } catch {
    return "";
  }
};

/** Friendly random table code like "HARD-8-ROLLER". */
export const randomRoomCode = () => {
  const a = ["HARD", "YO", "SNAKE", "BOX", "NINA", "FEVER", "LITTLE", "BIG"];
  const b = ["JOE", "EIGHT", "EYES", "CARS", "NINE", "FIVE", "TEN", "RED"];
  const pick = (x: string[]) => x[Math.floor(Math.random() * x.length)];
  return `${pick(a)}-${pick(b)}-${100 + Math.floor(Math.random() * 900)}`;
};

export function useRoom(
  onRemoteRoll: (msg: RollMsg) => void,
  onTournamentStart?: (msg: TourneyMsg) => void
) {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [name, setName] = useState(() => loadName());
  const [peers, setPeers] = useState<Record<string, PeerInfo>>({});
  const [selfStream, setSelfStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [mediaState, setMediaState] = useState<MediaState>("off");
  const [status, setStatus] = useState<"idle" | "connecting" | "live">("idle");

  const roomRef = useRef<Room | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sendRollRef = useRef<((m: RollMsg) => void) | null>(null);
  const sendPresenceRef = useRef<((p: Presence, opts?: { target?: string }) => void) | null>(null);
  const sendTourneyRef = useRef<((m: TourneyMsg, opts?: { target?: string }) => void) | null>(null);
  const rollCbRef = useRef(onRemoteRoll);
  rollCbRef.current = onRemoteRoll;
  const tourneyCbRef = useRef(onTournamentStart);
  tourneyCbRef.current = onTournamentStart;

  /** Latest tournament config seen at this table (null = cash game). */
  const [tourney, setTourney] = useState<TourneyMsg | null>(null);
  const tourneyRef = useRef<TourneyMsg | null>(null);
  tourneyRef.current = tourney;

  /* keep a live snapshot of our own presence for answering joiners */
  const chipsRef = useRef(0);
  const presenceRef = useRef<Presence>({ name, micOn: false, camOn: false, chips: 0 });
  presenceRef.current = { name, micOn, camOn, chips: chipsRef.current };

  /* ------------------------------ media ------------------------------ */

  /** Acquire camera+mic once; toggles afterwards just flip track.enabled. */
  const ensureMedia = useCallback(async (): Promise<MediaStream | null> => {
    if (streamRef.current) return streamRef.current;
    setMediaState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: "user" },
      });
      streamRef.current = stream;
      setSelfStream(stream);
      setMediaState("on");
      // start muted & dark until the player opts in
      stream.getAudioTracks().forEach((t) => (t.enabled = false));
      stream.getVideoTracks().forEach((t) => (t.enabled = false));
      roomRef.current?.addStream(stream);
      return stream;
    } catch {
      setMediaState("denied");
      return null;
    }
  }, []);

  const broadcastPresence = useCallback(
    (next: { name?: string; micOn?: boolean; camOn?: boolean; chips?: number }) => {
      const cur = presenceRef.current;
      const p: Presence = {
        name: next.name ?? cur.name,
        micOn: next.micOn ?? cur.micOn,
        camOn: next.camOn ?? cur.camOn,
        chips: next.chips ?? cur.chips,
      };
      presenceRef.current = p;
      sendPresenceRef.current?.(p);
    },
    []
  );

  /** Push our current stack to the table so standings stay live. */
  const reportChips = useCallback(
    (chips: number) => {
      if (chipsRef.current === chips) return;
      chipsRef.current = chips;
      if (roomRef.current) broadcastPresence({ chips });
    },
    [broadcastPresence]
  );

  const toggleMic = useCallback(async () => {
    const stream = await ensureMedia();
    if (!stream) return;
    const next = !micOn;
    stream.getAudioTracks().forEach((t) => (t.enabled = next));
    setMicOn(next);
    broadcastPresence({ micOn: next });
  }, [ensureMedia, micOn, broadcastPresence]);

  const toggleCam = useCallback(async () => {
    const stream = await ensureMedia();
    if (!stream) return;
    const next = !camOn;
    stream.getVideoTracks().forEach((t) => (t.enabled = next));
    setCamOn(next);
    broadcastPresence({ camOn: next });
  }, [ensureMedia, camOn, broadcastPresence]);

  /* ------------------------------ room ------------------------------ */

  const leave = useCallback(() => {
    roomRef.current?.leave();
    roomRef.current = null;
    sendRollRef.current = null;
    sendPresenceRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setSelfStream(null);
    setPeers({});
    setRoomCode(null);
    setTourney(null);
    tourneyRef.current = null;
    setStatus("idle");
    setMicOn(false);
    setCamOn(false);
    setMediaState("off");
  }, []);

  const join = useCallback(
    (code: string, playerName: string) => {
      const clean = code.trim().toUpperCase();
      if (!clean) return;
      if (roomRef.current) leave();

      const finalName = playerName.trim() || "Shooter";
      setName(finalName);
      presenceRef.current = {
        name: finalName,
        micOn: false,
        camOn: false,
        chips: chipsRef.current,
      };
      try {
        localStorage.setItem(NAME_KEY, finalName);
        localStorage.setItem(ROOM_KEY, clean);
      } catch {
        /* ignore */
      }

      setStatus("connecting");
      setRoomCode(clean);

      const room = joinRoom({ appId: APP_ID }, clean);
      roomRef.current = room;

      const presence = room.makeAction<Presence>("presence");
      const roll = room.makeAction<RollMsg>("roll");
      const tourneyAction = room.makeAction<TourneyMsg>("tourney");
      sendPresenceRef.current = (p, opts) =>
        presence.send(p, opts?.target ? { target: opts.target } : undefined);
      sendRollRef.current = (m) => roll.send(m);
      sendTourneyRef.current = (m, opts) =>
        tourneyAction.send(m, opts?.target ? { target: opts.target } : undefined);

      presence.onMessage = (data, ctx) => {
        setPeers((prev) => ({
          ...prev,
          [ctx.peerId]: {
            id: ctx.peerId,
            name: String(data?.name ?? "Shooter"),
            micOn: !!data?.micOn,
            camOn: !!data?.camOn,
            chips: Number(data?.chips ?? 0),
            stream: prev[ctx.peerId]?.stream,
          },
        }));
      };

      roll.onMessage = (data) => rollCbRef.current(data);

      tourneyAction.onMessage = (data) => {
        // ignore replays of a tournament we're already running
        if (tourneyRef.current && tourneyRef.current.stamp === data.stamp) return;
        setTourney(data);
        tourneyCbRef.current?.(data);
      };

      room.onPeerJoin = (peerId) => {
        setStatus("live");
        setPeers((prev) => ({
          ...prev,
          [peerId]:
            prev[peerId] ?? { id: peerId, name: "Shooter", micOn: false, camOn: false, chips: 0 },
        }));
        // introduce ourselves + push our stream to the newcomer
        presence.send(presenceRef.current, { target: peerId });
        if (streamRef.current) room.addStream(streamRef.current, { target: peerId });
        // catch late arrivals up on tournament rules
        if (tourneyRef.current) tourneyAction.send(tourneyRef.current, { target: peerId });
      };

      room.onPeerLeave = (peerId) => {
        setPeers((prev) => {
          const next = { ...prev };
          delete next[peerId];
          return next;
        });
      };

      room.onPeerStream = (stream, peerId) => {
        setPeers((prev) => ({
          ...prev,
          [peerId]: {
            id: peerId,
            name: prev[peerId]?.name ?? "Shooter",
            micOn: prev[peerId]?.micOn ?? false,
            camOn: prev[peerId]?.camOn ?? false,
            chips: prev[peerId]?.chips ?? 0,
            stream,
          },
        }));
      };

      setStatus("live");
    },
    [leave]
  );

  /** Tell the table what the dice did. */
  const broadcastRoll = useCallback(
    (d1: number, d2: number, point: number | null, sevenOut: boolean) => {
      sendRollRef.current?.({ d1, d2, point, sevenOut, name: presenceRef.current.name });
    },
    []
  );

  /** Kick off tournament play for the whole table. */
  const startTournament = useCallback((buyIn: number, mode: "virtual" | "manual") => {
    const msg: TourneyMsg = {
      buyIn,
      mode,
      startedBy: presenceRef.current.name,
      stamp: Date.now(),
    };
    setTourney(msg);
    tourneyRef.current = msg;
    sendTourneyRef.current?.(msg);
    return msg;
  }, []);

  const clearTournament = useCallback(() => {
    setTourney(null);
    tourneyRef.current = null;
  }, []);

  useEffect(() => () => void roomRef.current?.leave(), []);

  /* roster is sorted so every client agrees on shooter order */
  const roster = useMemo(() => {
    const ids = [selfId, ...Object.keys(peers)].sort();
    return ids.map((id) => ({
      id,
      name: id === selfId ? name || "You" : (peers[id]?.name ?? "Shooter"),
      isSelf: id === selfId,
      chips: id === selfId ? chipsRef.current : (peers[id]?.chips ?? 0),
    }));
  }, [peers, name]);

  return {
    selfId,
    roomCode,
    name,
    setName,
    status,
    peers,
    peerList: Object.values(peers),
    roster,
    selfStream,
    micOn,
    camOn,
    mediaState,
    join,
    leave,
    toggleMic,
    toggleCam,
    ensureMedia,
    broadcastRoll,
    reportChips,
    tourney,
    startTournament,
    clearTournament,
    inRoom: roomCode !== null,
  };
}

export type RoomApi = ReturnType<typeof useRoom>;
