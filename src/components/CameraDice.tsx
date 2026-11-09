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
  const trackerRef = useRef(new ScanTracker());
  const [status, setStatus] = useState("Opening camera…");
  const [ready, setReady] = useState(false);
  const [dice, setDice] = useState<[number | null, number | null]>([null, null]);
  const [retry, setRetry] = useState(0);
  const [device, setDevice] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    setReady(false);
    setStatus("Opening camera…");
    trackerRef.current.reset();
    async function openCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("Camera access is unavailable here. Open this HTTPS page directly in a new tab and check browser permissions.");
        return;
      }
      try {
        const video = device ? { deviceId: { exact: device } } : { facingMode: { ideal: "environment" } };
        stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
        if (cancelled) { stream.getTracks().forEach((track) => track.stop()); return; }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          if (cancelled) return;
          setReady(true);
          setStatus("Watching for dice movement. Throw the dice in view.");
        }
        if (navigator.mediaDevices.enumerateDevices) {
          const all = await navigator.mediaDevices.enumerateDevices().catch(() => []);
          if (!cancelled) setDevices(all.filter((item) => item.kind === "videoinput"));
        }
      } catch (error) {
        stream?.getTracks().forEach((track) => track.stop());
        if (!cancelled) setStatus(cameraError(error));
      }
    }
    void openCamera();
    return () => { cancelled = true; stream?.getTracks().forEach((track) => track.stop()); if (videoRef.current) videoRef.current.srcObject = null; };
  }, [retry, device]);

  // Disable stale results whenever the shooter/point/roll state changes.
  useEffect(() => {
    trackerRef.current.reset();
    setDice([null, null]);
  }, [active, device, retry]);

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
    <section aria-labelledby="camera-title" className="mx-2 mt-3 rounded-2xl border border-gold-400/40 bg-felt-950 p-4 shadow-xl">
      <div className="flex items-center justify-between gap-2">
        <h2 id="camera-title" className="font-display text-base font-bold text-gold-300">Live dice camera</h2>
        <button type="button" onClick={onClose} aria-label="Stop camera" className="rounded-full bg-white/10 p-2"><X size={20} /></button>
      </div>
      <p className="mt-2 text-xs leading-5 text-purple-100/80">Aim straight down at the landing area. Use two separated white dice with dark dots on a plain dark surface and good lighting.</p>
      <video ref={videoRef} muted playsInline autoPlay className="mt-3 aspect-video max-h-64 w-full rounded-xl bg-black object-contain" aria-label="Live camera preview" />
      {devices.length > 1 && <label className="mt-2 block text-xs text-purple-100">Camera <select value={device} onChange={(e) => setDevice(e.target.value)} className="ml-2 rounded-lg bg-felt-800 p-2 text-white"><option value="">Default camera</option>{devices.map((item, i) => <option key={item.deviceId} value={item.deviceId}>{item.label || `Camera ${i + 1}`}</option>)}</select></label>}
      <p className="mt-2 text-xs text-gold-200" role="status">{!active ? "Scanning paused while the table is busy or another shooter has the dice." : status}</p>
      {!ready && <div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={() => setRetry((n) => n + 1)} className="rounded-lg border border-white/30 px-3 py-2 text-xs text-white">Retry camera</button><a href={window.location.href} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-white/30 px-3 py-2 text-xs text-white">Open in new tab</a></div>}
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
