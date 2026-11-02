import { siteSettings } from "./settings";

// Small interface sounds for the menus: a soft tick on hover, a brass chime on select. They are synthesised with
// Web Audio, so they cost no downloads, and they stay silent until the first user gesture, as browsers require.

export type UiSound = "hover" | "select" | "back" | "success";

let ctx: AudioContext | null = null;
let lastHover = 0;

function audio(): AudioContext | null {
  if (!siteSettings.soundOn) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx.state === "running" ? ctx : null;
  } catch {
    return null;
  }
}

function tone(c: AudioContext, freq: number, start: number, length: number, gain: number, type: OscillatorType): void {
  const osc = c.createOscillator();
  const amp = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime + start);
  amp.gain.setValueAtTime(0.0001, c.currentTime + start);
  amp.gain.exponentialRampToValueAtTime(gain, c.currentTime + start + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + length);
  osc.connect(amp).connect(c.destination);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + length + 0.02);
}

export function playUi(kind: UiSound): void {
  if (kind === "hover") {
    const now = performance.now();
    if (now - lastHover < 70) return;
    lastHover = now;
  }
  const c = audio();
  if (!c) return;
  switch (kind) {
    case "hover":
      tone(c, 1320, 0, 0.05, 0.012, "sine");
      break;
    case "select":
      tone(c, 660, 0, 0.18, 0.045, "triangle");
      tone(c, 990, 0.06, 0.26, 0.035, "sine");
      break;
    case "back":
      tone(c, 520, 0, 0.14, 0.035, "triangle");
      break;
    case "success":
      tone(c, 523, 0, 0.2, 0.04, "triangle");
      tone(c, 659, 0.09, 0.22, 0.04, "triangle");
      tone(c, 784, 0.18, 0.34, 0.04, "sine");
      break;
  }
}
