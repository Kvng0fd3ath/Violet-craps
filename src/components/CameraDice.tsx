import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { detectDice } from "../camera/detectDice";

/** A still is analyzed locally; nothing is recorded or sent to a server. */
export function CameraDice({ onClose, onConfirm }: { onClose: () => void; onConfirm: (dice: [number, number]) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState("Opening camera…");
  const [ready, setReady] = useState(false);
  const [dice, setDice] = useState<[number | null, number | null]>([null, null]);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    async function openCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("Camera unavailable. Use HTTPS and allow camera access, or enter both dice below.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (cancelled) { stream.getTracks().forEach((track) => track.stop()); return; }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          if (!cancelled) { setReady(true); setStatus("Point at both dice, then scan."); }
        }
      } catch {
        stream?.getTracks().forEach((track) => track.stop());
        if (!cancelled) setStatus("Couldn't open the camera. Check permissions or enter both dice below.");
      }
    }
    void openCamera();
    return () => { cancelled = true; stream?.getTracks().forEach((track) => track.stop()); };
  }, []);

  const scan = () => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) { setStatus("Camera isn't ready yet. Try again or enter the dice below."); return; }
    const canvas = document.createElement("canvas");
    canvas.width = Math.min(480, video.videoWidth);
    canvas.height = Math.max(1, Math.round(canvas.width * video.videoHeight / video.videoWidth));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) { setStatus("Could not scan this image. Enter both dice below."); return; }
    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const result = detectDice(ctx.getImageData(0, 0, canvas.width, canvas.height));
      if (result) { setDice(result); setStatus("Suggested result — check both dice before confirming."); }
      else { setDice([null, null]); setStatus("Couldn't read both dice. Try again or enter them below."); }
    } catch { setDice([null, null]); setStatus("Couldn't scan this image. Enter both dice below."); }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true" aria-labelledby="camera-title">
      <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl border border-gold-400/40 bg-felt-950 p-4 shadow-2xl">
        <div className="flex items-center justify-between gap-2">
          <h2 id="camera-title" className="font-display text-lg font-bold text-gold-300">Scan real dice</h2>
          <button type="button" onClick={onClose} aria-label="Close camera" className="rounded-full bg-white/10 p-2"><X size={20} /></button>
        </div>
        <p className="mt-2 text-xs leading-5 text-purple-100/80">For best results, use two separate white dice with dark dots on a dark, plain surface. Point the camera straight down in good light.</p>
        <video ref={videoRef} muted playsInline autoPlay className="mt-3 aspect-video w-full rounded-xl bg-black object-contain" aria-label="Live camera preview" />
        <p className="mt-2 text-xs text-gold-200" role="status">{status}</p>
        <button type="button" disabled={!ready} onClick={scan} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-gold-400/40 bg-gold-400/10 py-3 font-bold text-gold-200 disabled:opacity-40"><Camera size={18} /> Scan dice</button>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {([0, 1] as const).map((i) => (
            <label key={i} className="text-xs font-bold text-purple-100">Die {i === 0 ? "A" : "B"}
              <select value={dice[i] ?? ""} onChange={(e) => setDice((prev) => { const next: [number | null, number | null] = [...prev]; next[i] = e.target.value ? Number(e.target.value) : null; return next; })} className="mt-1 w-full rounded-xl border border-white/20 bg-felt-800 px-3 py-3 text-base text-white">
                <option value="">Select value</option>
                {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          ))}
        </div>
        <p className="mt-3 text-xs text-purple-200/70">Camera readings can be wrong. Check both values; no roll is recorded until you confirm. Video stays on this device.</p>
        <button type="button" disabled={dice[0] === null || dice[1] === null} onClick={() => { if (dice[0] !== null && dice[1] !== null) onConfirm([dice[0], dice[1]]); }} className="btn-press mt-3 w-full rounded-xl py-3 font-bold text-purple-950 disabled:opacity-40">Confirm and record roll</button>
      </div>
    </div>
  );
}
