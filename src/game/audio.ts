/* Tiny synth — no audio assets needed. */

let ctx: AudioContext | null = null;

export function initAudio() {
  if (!ctx) {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    } catch {
      ctx = null;
    }
  }
  if (ctx && ctx.state === "suspended") ctx.resume();
}

function noiseBurst(time: number, dur: number, vol: number) {
  if (!ctx) return;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = "highpass";
  filt.frequency.value = 1800;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  src.connect(filt).connect(gain).connect(ctx.destination);
  src.start(time);
}

function tone(time: number, freq: number, dur: number, vol: number, type: OscillatorType = "triangle") {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(vol, time + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(time);
  osc.stop(time + dur + 0.05);
}

export function playRattle() {
  if (!ctx) return;
  const now = ctx.currentTime;
  noiseBurst(now + 0.05, 0.05, 0.16);
  noiseBurst(now + 0.28, 0.06, 0.2);
  noiseBurst(now + 0.5, 0.05, 0.14);
  noiseBurst(now + 1.05, 0.09, 0.26);
  noiseBurst(now + 1.16, 0.07, 0.18);
}

export function playOutcome(kind: "win" | "lose" | "point") {
  if (!ctx) return;
  const now = ctx.currentTime;
  if (kind === "win") {
    tone(now, 523.25, 0.18, 0.14);
    tone(now + 0.09, 659.25, 0.18, 0.14);
    tone(now + 0.18, 783.99, 0.3, 0.16);
  } else if (kind === "lose") {
    tone(now, 220, 0.28, 0.12, "sine");
    tone(now + 0.12, 155.56, 0.4, 0.12, "sine");
  } else {
    tone(now, 440, 0.12, 0.1);
    tone(now + 0.08, 587.33, 0.2, 0.12);
  }
}

export function playChip() {
  if (!ctx) return;
  noiseBurst(ctx.currentTime, 0.035, 0.1);
}

export const vibrate = (pattern: number | number[]) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
};
