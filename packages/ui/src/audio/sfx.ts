// Synthesized SFX for the MVP. No audio files, so no licensing or bundle cost.
// The AudioContext is created only inside unlock(), which must run from a user
// gesture (browser autoplay policy). Until then play() is a silent no-op.

export type SfxCue = "evidence" | "contradiction" | "reveal";

export interface SfxPlayer {
  readonly muted: boolean;
  setMuted(muted: boolean): void;
  unlock(): Promise<void>;
  play(cue: SfxCue): void;
  dispose(): void;
}

interface ToneStep {
  frequency: number;
  endFrequency?: number;
  delay: number;
  duration: number;
  gain: number;
  type: OscillatorType;
}

const CUES: Record<SfxCue, readonly ToneStep[]> = {
  // Short two-note chime for an evidence unlock.
  evidence: [
    { frequency: 880, delay: 0, duration: 0.18, gain: 0.18, type: "sine" },
    { frequency: 1320, delay: 0.07, duration: 0.28, gain: 0.12, type: "sine" },
  ],
  // Soft, lower falling tone for a contradiction.
  contradiction: [
    { frequency: 260, endFrequency: 196, delay: 0, duration: 0.45, gain: 0.2, type: "triangle" },
  ],
  // About 2.8 s payoff sting for the final reveal.
  reveal: [
    { frequency: 261.63, delay: 0, duration: 2.6, gain: 0.07, type: "sine" },
    { frequency: 523.25, delay: 0, duration: 0.9, gain: 0.16, type: "triangle" },
    { frequency: 659.25, delay: 0.18, duration: 0.9, gain: 0.14, type: "triangle" },
    { frequency: 783.99, delay: 0.36, duration: 0.9, gain: 0.14, type: "triangle" },
    { frequency: 1046.5, delay: 0.56, duration: 2.2, gain: 0.16, type: "triangle" },
  ],
};

type AudioContextCtor = typeof AudioContext;

function resolveAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  const legacy = (window as Window & { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  return window.AudioContext ?? legacy ?? null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function createSfxPlayer(options: { volume?: number } = {}): SfxPlayer {
  const volume = clamp(options.volume ?? 0.6, 0, 1);
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let muted = false;

  return {
    get muted() {
      return muted;
    },

    setMuted(value: boolean) {
      muted = value;
      if (master) master.gain.value = muted ? 0 : volume;
    },

    async unlock() {
      if (context) {
        if (context.state === "suspended") await context.resume();
        return;
      }
      const Ctor = resolveAudioContextCtor();
      if (!Ctor) return;
      context = new Ctor();
      master = context.createGain();
      master.gain.value = muted ? 0 : volume;
      master.connect(context.destination);
      await context.resume();
    },

    play(cue: SfxCue) {
      if (!context || !master || muted || context.state !== "running") return;
      const now = context.currentTime;
      for (const step of CUES[cue]) {
        const start = now + step.delay;
        const end = start + step.duration;
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        oscillator.type = step.type;
        oscillator.frequency.setValueAtTime(step.frequency, start);
        if (step.endFrequency !== undefined) {
          oscillator.frequency.exponentialRampToValueAtTime(step.endFrequency, end);
        }
        envelope.gain.setValueAtTime(0.0001, start);
        envelope.gain.exponentialRampToValueAtTime(step.gain, start + 0.02);
        envelope.gain.exponentialRampToValueAtTime(0.0001, end);
        oscillator.connect(envelope).connect(master);
        oscillator.start(start);
        oscillator.stop(end + 0.02);
      }
    },

    dispose() {
      void context?.close();
      context = null;
      master = null;
    },
  };
}
