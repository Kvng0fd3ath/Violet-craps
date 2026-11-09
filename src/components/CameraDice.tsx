import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { detectDice } from "../camera/detectDice";
import { ScanTracker } from "../camera/scanTracker";

function cameraError(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  if (!window.isSecureContext) return "Camera needs a secure HTTPS page. Open the site directly in a new browser tab.";
  if (name === "NotAllowedError" || name === "SecurityError") return "Camera permission was blocked. Open this page in a new tab, allow camera access in your browser settings, then retry.";
  if (name === "NotFoundError") return "No camera was found. Connect a webcam and retry.";
  if (name === "NotReadableError") return "The webcam may be in use by another app or the lobby video. Close it there and retry.";
  return "Couldn't start the camera. Check browser permissions or try opening this page in a new tab.";
}

/** Live frames are analyzed locally; the video is not recorded or uploaded. */
export function CameraDice({ onClose, onConfirm, active }: { onClose: () => void; onConfirm: (dice: [number, number]) => void; active: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const trackerRef = useRef(new ScanTracker());
  const [status, setStatus] = useState("Click Enable camera to begin. Your browser may ask for permission.");
  const [ready, setReady] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [dice, setDice] = useState<[number | null, number | null]>([null, null]);
  const [opening, setOpening] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef(0);
  const hintRef = useRef<number | undefined>(undefined);
  const [device, setDevice] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    panelRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, []);

  useEffect(() => () => {
    requestRef.current++;
    window.clearTimeout(hintRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  // Invoke getUserMedia directly from the user's click (important in some browsers).
  const openCamera = async (cameraId = device) => {
    const request = ++requestRef.current;
    window.clearTimeout(hintRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setReady(false);
    setOpening(false);
    setDice([null, null]);
    trackerRef.current.reset();
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("Camera access is unavailable here. Open this HTTPS page directly in a new tab and check browser permissions.");
      return;
    }
    const policy = (document as Document & { permissionsPolicy?: { allowsFeature: (feature: string) => boolean }; featurePolicy?: { allowsFeature: (feature: string) => boolean } }).permissionsPolicy
      ?? (document as Document & { featurePolicy?: { allowsFeature: (feature: string) => boolean } }).featurePolicy;
    if (policy && !policy.allowsFeature("camera")) {
      setStatus("This embedded preview blocks camera access. Click Open game in new tab below, then enable the camera there.");
      return;
    }
    setOpening(true);
    setStatus("Opening camera… Allow camera access if your browser asks.");
    hintRef.current = window.setTimeout(() => {
      if (request === requestRef.current) setStatus("Waiting for camera permission. Check the address bar, or open the game in a new tab and try again.");
    }, 8000);
    let stream: MediaStream | null = null;
    try {
      const video = cameraId ? { deviceId: { exact: cameraId } } : { facingMode: { ideal: "environment" } };
      stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
      if (request !== requestRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = stream;
      stream.getVideoTracks().forEach((track) => {
        track.onended = () => { if (request === requestRef.current) { setReady(false); setStatus("The camera stopped. Reconnect it and enable it again."); } };
      });
      if (!videoRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      if (request !== requestRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      window.clearTimeout(hintRef.current);
      setOpening(false);
      setReady(true);
      setStatus("Camera connected. Throw the dice in view; the reader watches for movement.");
      if (navigator.mediaDevices.enumerateDevices) {
        const all = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        if (request === requestRef.current) setDevices(all.filter((item) => item.kind === "videoinput"));
      }
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      if (request === requestRef.current) {
        streamRef.current = null;
        window.clearTimeout(hintRef.current);
        setOpening(false);
        setStatus(cameraError(error));
      }
    }
  };

  // Discard stale readings when the shooter or table state changes.
  useEffect(() => {
    trackerRef.current.reset();
    setDice([null, null]);
  }, [active, device]);

  useEffect(() => {
    if (!ready || !active || dice[0] !== null || dice[1] !== null) return;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) { setStatus("Scanning is unavailable. Enter both dice below."); return; }
    const timer = window.setInterval(() => {
      const video = videoRef.current;
      if (!video?.videoWidth || !video.videoHeight) return;
      canvas.width = Math.min(480, video.videoWidth);
      canvas.height = Math.max(1, Math.round(canvas.width * video.videoHeight / video.videoWidth));
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const result = trackerRef.current.next(frame, () => detectDice(frame));
        if (result) { setDice(result); setStatus("Dice found. Check both values, then confirm."); }
      } catch {
        window.clearInterval(timer);
        setStatus("Couldn't read camera frames. Enter both dice below or retry.");
      }
    }, 300);
    return () => window.clearInterval(timer);
  }, [ready, active, dice]);

  const resetScan = () => { trackerRef.current.reset(); setDice([null, null]); setStatus("Watching for dice movement. Throw the dice in view."); };
  return (
    <section ref={panelRef} aria-labelledby="camera-title" className="mx-2 mt-3 scroll-mt-24 rounded-2xl border border-gold-400/40 bg-felt-950 p-4 shadow-xl">
      <div className="flex items-center justify-between gap-2">
        <h2 id="camera-title" className="font-display text-base font-bold text-gold-300">Live dice camera</h2>
        <button type="button" onClick={onClose} aria-label="Stop camera" className="rounded-full bg-white/10 p-2"><X size={20} /></button>
      </div>
      <p className="mt-2 text-xs leading-5 text-purple-100/80">Aim straight down at the landing area. Use two separated white dice with dark dots on a plain dark surface and good lighting.</p>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" aria-pressed={!showPreview} onClick={() => setShowPreview((visible) => !visible)} className="rounded-lg border border-white/30 px-3 py-2 text-xs font-bold text-white">{showPreview ? "Hide camera picture" : "Show camera picture"}</button>
        <span className="text-xs text-purple-200/75">{showPreview ? "Use the picture to aim your camera." : "Camera picture hidden; the scanner remains open."}</span>
      </div>
      <video ref={videoRef} muted playsInline autoPlay aria-label="Live camera preview" aria-hidden={!showPreview} className={showPreview ? "mt-2 aspect-video w-full max-w-[280px] rounded-xl bg-black object-contain" : "pointer-events-none absolute h-px w-px opacity-0"} />
      {devices.length > 1 && <label className="mt-2 block text-xs text-purple-100">Camera <select value={device} onChange={(e) => { setDevice(e.target.value); void openCamera(e.target.value); }} className="ml-2 rounded-lg bg-felt-800 p-2 text-white"><option value="">Default camera</option>{devices.map((item, i) => <option key={item.deviceId} value={item.deviceId}>{item.label || `Camera ${i + 1}`}</option>)}</select></label>}
      <p className="mt-2 rounded-lg bg-black/50 px-3 py-2 text-sm font-semibold text-gold-200" role="status">{status}</p>
      {!active && <p className="mt-1 text-xs text-purple-200/80">Scanning is paused while the table is busy or another shooter has the dice.</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {!ready && <button type="button" onClick={() => void openCamera()} className="rounded-lg border border-gold-400/60 bg-gold-400/15 px-3 py-2 text-sm font-bold text-gold-200">{opening ? "Try camera again" : "Enable camera"}</button>}
        <a href={window.location.href} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-white/30 px-3 py-2 text-sm text-white">Open game in new tab</a>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {([0, 1] as const).map((i) => <label key={i} className="text-xs font-bold text-purple-100">Die {i === 0 ? "A" : "B"}
          <select value={dice[i] ?? ""} disabled={!active} onChange={(e) => setDice((prev) => { const next: [number | null, number | null] = [...prev]; next[i] = e.target.value ? Number(e.target.value) : null; return next; })} className="mt-1 w-full rounded-xl border border-white/20 bg-felt-800 px-3 py-3 text-base text-white">
            <option value="">Select value</option>{[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>)}
      </div>
      <p className="mt-3 text-xs text-purple-200/70">The reader can be wrong. Check both values before confirming. Live video stays on your device and is not recorded.</p>
      <div className="mt-3 flex gap-2">
        <button type="button" disabled={!active} onClick={resetScan} className="flex items-center justify-center gap-1 rounded-xl border border-white/25 px-3 py-3 text-xs text-white disabled:opacity-40"><Camera size={16} /> Retry scan</button>
        <button type="button" disabled={!active || dice[0] === null || dice[1] === null} onClick={() => { if (dice[0] !== null && dice[1] !== null) { onConfirm([dice[0], dice[1]]); resetScan(); } }} className="btn-press flex-1 rounded-xl py-3 text-sm font-bold text-purple-950 disabled:opacity-40">Confirm and record roll</button>
      </div>
    </section>
  );
}
