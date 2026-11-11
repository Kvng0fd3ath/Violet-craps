import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { detectDice, type DiceAppearance } from "../camera/detectDice";
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
  const [dice, setDice] = useState<[number | null, number | null]>([null, null]);
  const [opening, setOpening] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef(0);
  const hintRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!panelRef.current) return;
    panelRef.current.scrollIntoView({ block: "start", behavior: "smooth" });
  }, []);

  useEffect(() => () => {
    requestRef.current++;
    window.clearTimeout(hintRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  // Invoke getUserMedia directly from the user's click
  const openCamera = async () => {
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
      const video = { facingMode: { ideal: "environment" } };
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
      
      // AUTO-DETECTION LOGIC: Start scanning immediately
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        const timer = window.setInterval(() => {
          const video = videoRef.current;
          if (!video?.videoWidth || !video.videoHeight) return;
          canvas.width = Math.min(480, video.videoWidth);
          canvas.height = Math.max(1, Math.round(canvas.width * video.videoHeight / video.videoWidth));
          try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const result = trackerRef.current.next(frame, () => detectDice(frame, "dark")); // Default to dark dice
            if (result) {
              // AUTO-CONFIRM: Best guess (don't wait for manual confirmation)
              setStatus(`Dice ${result[0]} + ${result[1]} detected! Recording automatically…`);
              onConfirm(result);
              window.clearInterval(timer);
              setTimeout(() => {
                setDice([null, null]);
                setStatus("Ready for next roll. Throw the dice in view.");
                trackerRef.current.reset();
              }, 3000); // Reset after 3 seconds
            }
          } catch (e) {
            window.clearInterval(timer);
            setStatus("Couldn't read camera frames. Enter both dice below or retry.");
          }
        }, 300);
        return () => window.clearInterval(timer);
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
  }, [active]);

  return (
    <section ref={panelRef} aria-labelledby="camera-title" className="mx-2 mt-3 scroll-mt-24 rounded-2xl border border-gold-400/40 bg-felt-950 p-3 shadow-xl">
      <div className="flex items-center justify-between gap-2">
        <h2 id="camera-title" className="font-display text-base font-bold text-gold-300">Live dice camera</h2>
        <button type="button" onClick={onClose} aria-label="Stop camera" className="rounded-full bg-white/10 p-2"><X size={20} /></button>
      </div>
      <video ref={videoRef} muted playsInline autoPlay aria-label="Live camera preview" className="mt-2 aspect-video w-full max-w-[280px] rounded-xl bg-black object-contain" />
      <div className="mt-2 rounded-lg bg-black/50 px-3 py-2 text-sm font-semibold text-gold-200" role="status">
        {status}
        {dice[0] !== null && dice[1] !== null && <span className="ml-2 text-gold-300">Dice {dice[0]} + {dice[1]} detected!</span>}
      </div>
    </section>
  );
}
