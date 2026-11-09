/* Tiny synth — no audio assets needed. */

let ctx: AudioContext | null = null;
let output: GainNode | null = null;
let muted = false;

export function initAudio() {
  if (!ctx) {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      output = ctx.createGain();
      output.gain.value = muted ? 0 : 1;
      output.connect(ctx.destination);
    } catch {
      ctx = null;
      output = null;
    }
  }
  if (ctx && ctx.state === "suspended") ctx.resume();
}

function noiseBurst(time: number, dur: number, vol: number) {
  if (!ctx || !output) return;
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
  src.connect(filt).connect(gain).connect(output);
  src.start(time);
}

function tone(time: number, freq: number, dur: number, vol: number, type: OscillatorType = "triangle") {
  if (!ctx || !output) return;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(vol, time + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  osc.connect(gain).connect(output);
  osc.start(time);
  osc.stop(time + dur + 0.05);
}

export function playRattle() {
  if (!ctx || !output) return;
  const now = ctx.currentTime;
  // A series of short, irregular wooden clicks that slow as the dice settle.
  const hits: [number, number, number][] = [
    [0.02, 0.11, 720], [0.09, 0.08, 970], [0.17, 0.12, 640],
    [0.27, 0.09, 890], [0.39, 0.12, 570], [0.55, 0.09, 800],
    [0.74, 0.10, 620], [0.97, 0.08, 760], [1.18, 0.13, 520],
  ];
  for (const [offset, volume, frequency] of hits) {
    noiseBurst(now + offset, 0.025, volume * 0.6);
    tone(now + offset, frequency, 0.055, volume, "sine");
  }
}

/** The browser supplies installed voices; their availability varies by device. */
export function chooseDealerVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const english = voices.filter((voice) => /^en(?:-|_|$)/i.test(voice.lang));
  return english.find((voice) => /female|samantha|victoria|karen|moira|tessa|zira|aria|jenny|susan|ava|allison|serena/i.test(voice.name))
    ?? english.find((voice) => /^en[-_]us/i.test(voice.lang))
    ?? english[0];
}

export function callDice(d1: number, d2: number) {
  if (muted || typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") return;
  try {
    const speech = window.speechSynthesis;
    speech.cancel();
    const call = new SpeechSynthesisUtterance(`${d1} and ${d2}, ${d1 + d2}.`);
    const voice = chooseDealerVoice(speech.getVoices());
    if (voice) call.voice = voice;
    call.lang = voice?.lang ?? "en-US";
    call.rate = 0.95;
    speech.speak(call);
  } catch {
    // Speech is optional; the visual dice and results remain available.
  }
}

export function setAudioMuted(value: boolean) {
  muted = value;
  if (ctx && output) output.gain.setValueAtTime(value ? 0 : 1, ctx.currentTime);
  if (value && typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

export function playOutcome(kind: "win" | "lose" | "point") {
  if (!ctx || !output) return;
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
  if (!ctx || !output) return;
  noiseBurst(ctx.currentTime, 0.035, 0.1);
}

export const vibrate = (pattern: number | number[]) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
};
