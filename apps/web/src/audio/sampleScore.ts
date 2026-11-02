// Sound for the sample case, generated in the browser: a slow noir jazz bed (electric-piano chords, upright bass,
// brushes, and a sparse vibraphone line), room tone, rain on the garden window to the left, fire crackle to the
// right, thunder that follows the scene's lightning, and short stingers for story moments. No audio file ships.
//
// The AudioContext is created in start(), which must run inside a user gesture (the page calls it from the
// "Start the investigation" button). Until then every call is a silent no-op. Mute follows the site setting.

export type ScoreMood = "opening" | "investigation" | "tension" | "resolved";
export type ScoreCue =
  | "discover"
  | "link"
  | "miss"
  | "contradiction"
  | "timeline"
  | "hint"
  | "reveal"
  | "stamp"
  | "type";

export interface SampleScore {
  readonly started: boolean;
  start(): Promise<void>;
  setMuted(muted: boolean): void;
  setMood(mood: ScoreMood): void;
  cue(name: ScoreCue): void;
  /** Thunder after a lightning flash. Strength 0..1; the delay is how far away the strike was. */
  thunder(strength: number, delaySeconds: number): void;
  dispose(): void;
}

interface Chord {
  bass: number;
  notes: readonly number[];
  melody: readonly number[];
}

// D minor: Dm9 | Bbmaj9 | Gm9 | A7(b9). Voicings stay between F3 and F4 so the chords sit under the stingers.
const MINOR: readonly Chord[] = [
  { bass: 38, notes: [53, 57, 60, 64], melody: [62, 64, 65, 69, 72, 74] },
  { bass: 34, notes: [50, 57, 60, 65], melody: [62, 65, 69, 70, 72, 74] },
  { bass: 43, notes: [53, 57, 58, 62], melody: [62, 65, 67, 69, 70, 74] },
  { bass: 45, notes: [55, 58, 61, 64], melody: [61, 64, 67, 69, 70, 73] },
];
// The resolution: Dmaj9 | Gmaj7 | Bm9 | A9sus4.
const MAJOR: readonly Chord[] = [
  { bass: 38, notes: [54, 57, 61, 64], melody: [62, 64, 66, 69, 71, 73] },
  { bass: 43, notes: [54, 59, 62, 66], melody: [62, 66, 67, 71, 74] },
  { bass: 47, notes: [50, 57, 61, 66], melody: [61, 62, 66, 69, 71, 73] },
  { bass: 45, notes: [55, 59, 62, 64], melody: [62, 64, 67, 69, 71] },
];

const HOME_CHORD: Chord = { bass: 38, notes: [53, 57, 60, 64], melody: [62, 64, 65, 69] };

const TEMPO: Record<ScoreMood, number> = { opening: 58, investigation: 66, tension: 70, resolved: 56 };
const LOOKAHEAD_S = 0.3;
const TICK_MS = 60;

function midiHz(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function pick<T>(items: readonly T[]): T | undefined {
  return items[Math.floor(Math.random() * items.length)];
}

function noiseBuffer(ctx: AudioContext, seconds: number, kind: "white" | "brown" | "rain"): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const seam = Math.floor(ctx.sampleRate * 0.2);
  let last = 0;
  let drop = 0;
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    let sample = white;
    if (kind === "brown") {
      last = (last + 0.02 * white) / 1.02;
      sample = last * 3.5;
    } else if (kind === "rain") {
      if (Math.random() < 0.0006) drop = 0.15 + Math.random() * 0.35;
      sample = white * 0.25 + drop;
      drop *= 0.985;
    }
    // Fade the ends so a looping buffer never clicks at the seam.
    if (kind !== "white") {
      if (i < seam) sample *= i / seam;
      else if (i > length - seam) sample *= (length - i) / seam;
    }
    data[i] = sample;
  }
  return buffer;
}

export function createSampleScore(): SampleScore {
  let ctx: AudioContext | null = null;
  let muteNode: GainNode | null = null;
  let musicBus: GainNode | null = null;
  let duck: GainNode | null = null;
  let epBus: GainNode | null = null;
  let sfxBus: GainNode | null = null;
  let droneGain: GainNode | null = null;
  let firePan: StereoPannerNode | null = null;
  let white: AudioBuffer | null = null;
  let brown: AudioBuffer | null = null;
  const loops: AudioScheduledSourceNode[] = [];
  let timer: number | null = null;
  let muted = false;
  let disposed = false;
  let mood: ScoreMood = "opening";
  let nextBeat = 0;
  let beat = 0;
  let lastType = 0;

  function env(gain: GainNode, time: number, peak: number, attack: number, decay: number): void {
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + attack + decay);
  }

  // Electric piano: a sine with a quiet octave, through the shared tremolo bus.
  function ep(note: number, time: number, length: number, velocity: number, target?: AudioNode): void {
    if (!ctx || !epBus) return;
    const out = ctx.createGain();
    const freq = midiHz(note);
    const a = ctx.createOscillator();
    const b = ctx.createOscillator();
    a.type = "sine";
    b.type = "sine";
    a.frequency.value = freq;
    b.frequency.value = freq * 2.002;
    const bGain = ctx.createGain();
    bGain.gain.value = 0.22;
    a.connect(out);
    b.connect(bGain).connect(out);
    out.gain.setValueAtTime(0.0001, time);
    out.gain.exponentialRampToValueAtTime(0.09 * velocity, time + 0.012);
    out.gain.exponentialRampToValueAtTime(0.035 * velocity, time + 0.5);
    out.gain.exponentialRampToValueAtTime(0.0001, time + length + 0.9);
    out.connect(target ?? epBus);
    a.start(time);
    b.start(time);
    a.stop(time + length + 1);
    b.stop(time + length + 1);
  }

  function bass(note: number, time: number, length: number, velocity: number): void {
    if (!ctx || !musicBus) return;
    const out = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 420;
    const a = ctx.createOscillator();
    const b = ctx.createOscillator();
    a.type = "sine";
    b.type = "triangle";
    a.frequency.value = midiHz(note);
    b.frequency.value = midiHz(note);
    const bGain = ctx.createGain();
    bGain.gain.value = 0.3;
    a.connect(out);
    b.connect(bGain).connect(out);
    env(out, time, 0.2 * velocity, 0.008, Math.min(1.4, length + 0.4));
    out.connect(lp).connect(musicBus);
    a.start(time);
    b.start(time);
    a.stop(time + length + 0.6);
    b.stop(time + length + 0.6);
  }

  function vibes(note: number, time: number, velocity: number, target?: AudioNode): void {
    if (!ctx || !musicBus) return;
    const out = ctx.createGain();
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = midiHz(note);
    const trem = ctx.createOscillator();
    trem.frequency.value = 5.6;
    const tremDepth = ctx.createGain();
    tremDepth.gain.value = 0.25;
    const amp = ctx.createGain();
    amp.gain.value = 0.75;
    trem.connect(tremDepth).connect(amp.gain);
    osc.connect(amp).connect(out);
    env(out, time, 0.06 * velocity, 0.006, 2.2);
    out.connect(target ?? musicBus);
    osc.start(time);
    trem.start(time);
    osc.stop(time + 2.4);
    trem.stop(time + 2.4);
  }

  function noiseHit(
    time: number,
    seconds: number,
    peak: number,
    filter: BiquadFilterType,
    freq: number,
    q: number,
    target: AudioNode,
  ): void {
    if (!ctx || !white) return;
    const src = ctx.createBufferSource();
    src.buffer = white;
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    env(g, time, peak, 0.004, seconds);
    src.connect(f).connect(g).connect(target);
    src.start(time, Math.random() * 1.5);
    src.stop(time + seconds + 0.05);
  }

  function thud(time: number, freq: number, peak: number, decay: number): void {
    if (!ctx || !sfxBus) return;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * 1.6, time);
    osc.frequency.exponentialRampToValueAtTime(freq, time + 0.08);
    const g = ctx.createGain();
    env(g, time, peak, 0.005, decay);
    osc.connect(g).connect(sfxBus);
    osc.start(time);
    osc.stop(time + decay + 0.1);
  }

  function duckMusic(): void {
    if (!ctx || !duck) return;
    const t = ctx.currentTime;
    duck.gain.cancelScheduledValues(t);
    duck.gain.setTargetAtTime(0.5, t, 0.03);
    duck.gain.setTargetAtTime(1, t + 0.5, 0.45);
  }

  function chordAt(bar: number): Chord {
    const set = mood === "resolved" ? MAJOR : MINOR;
    return set[bar % set.length] ?? HOME_CHORD;
  }

  // One beat of the bed. The pattern thins out for the opening and the resolution and tightens under tension.
  function scheduleBeat(time: number, index: number): void {
    if (!ctx || !musicBus || muted) return;
    const spb = 60 / TEMPO[mood];
    const bar = Math.floor(index / 4);
    const pos = index % 4;
    const chord = chordAt(bar);
    const human = (): number => (Math.random() - 0.5) * 0.024;
    if (pos === 0) {
      const vel = mood === "opening" ? 0.42 : mood === "resolved" ? 0.5 : 0.58;
      chord.notes.forEach((note, i) => ep(note, time + i * 0.014 + human(), spb * 3, vel));
      if (mood !== "opening") bass(chord.bass, time + human(), spb * 1.6, 0.9);
    }
    if (mood === "investigation" || mood === "tension") {
      if (pos === 1 || pos === 3) noiseHit(time + human(), 0.14, mood === "tension" ? 0.05 : 0.032, "bandpass", 5200, 0.8, musicBus);
      if (pos === 2) bass(chord.bass + (Math.random() < 0.7 ? 7 : 12), time + human(), spb * 0.9, 0.7);
      if (pos === 1 && Math.random() < 0.5) {
        chord.notes.slice(2).forEach((note) => ep(note, time + spb * 0.5 + human(), spb * 0.6, 0.3));
      }
      if (pos === 3 && Math.random() < 0.4) {
        const next = chordAt(bar + 1);
        bass(next.bass - 1, time + spb * 0.5 + human(), spb * 0.4, 0.55);
      }
    }
    if (mood === "tension") {
      if (pos === 1 || pos === 3) bass(chord.bass, time + human(), spb * 0.5, 0.6);
      if (pos === 2) chord.notes.forEach((note) => ep(note, time + human(), spb * 0.4, 0.34));
    }
    // A sparse vibraphone line every other bar, never under tension.
    if (mood !== "tension" && bar % 2 === 1 && pos === 0 && Math.random() < (mood === "resolved" ? 0.85 : 0.55)) {
      const count = 2 + Math.floor(Math.random() * 3);
      let at = time + spb * (1 + Math.floor(Math.random() * 2) * 0.5);
      for (let i = 0; i < count; i += 1) {
        const note = pick(chord.melody);
        if (note !== undefined) vibes(note, at + human(), mood === "opening" ? 0.7 : 0.85);
        at += spb * (Math.random() < 0.5 ? 0.5 : 1);
      }
    }
  }

  function tick(): void {
    if (!ctx) return;
    const now = ctx.currentTime;
    if (nextBeat < now - 0.1) nextBeat = now + 0.05;
    while (nextBeat < now + LOOKAHEAD_S) {
      scheduleBeat(nextBeat, beat);
      beat += 1;
      nextBeat += 60 / TEMPO[mood];
    }
    // Fire crackle, a couple of pops a second.
    if (!muted && firePan && Math.random() < 0.09) {
      noiseHit(now + Math.random() * 0.05, 0.006 + Math.random() * 0.012, 0.012 + Math.random() * 0.02, "bandpass", 1800 + Math.random() * 2600, 1.2, firePan);
    }
  }

  function startLoop(buffer: AudioBuffer, chain: AudioNode[], destination: AudioNode): void {
    if (!ctx) return;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    let node: AudioNode = src;
    for (const next of chain) node = node.connect(next);
    node.connect(destination);
    src.start();
    loops.push(src);
  }

  async function start(): Promise<void> {
    if (disposed) return;
    if (ctx) {
      if (ctx.state === "suspended") await ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const context = new Ctor();
    ctx = context;
    white = noiseBuffer(context, 2, "white");
    brown = noiseBuffer(context, 6, "brown");
    const rain = noiseBuffer(context, 6, "rain");

    muteNode = context.createGain();
    muteNode.gain.value = muted ? 0 : 1;
    const comp = context.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    comp.connect(muteNode).connect(context.destination);
    const master = context.createGain();
    master.gain.setValueAtTime(0, context.currentTime);
    master.gain.linearRampToValueAtTime(0.9, context.currentTime + 2.5);
    master.connect(comp);

    duck = context.createGain();
    duck.connect(master);
    musicBus = context.createGain();
    musicBus.gain.value = 0.9;
    musicBus.connect(duck);
    // Shared tremolo and tone for the electric piano.
    const epTone = context.createBiquadFilter();
    epTone.type = "lowpass";
    epTone.frequency.value = 2200;
    epBus = context.createGain();
    epBus.gain.value = 0.85;
    const lfo = context.createOscillator();
    lfo.frequency.value = 4.2;
    const lfoDepth = context.createGain();
    lfoDepth.gain.value = 0.12;
    lfo.connect(lfoDepth).connect(epBus.gain);
    lfo.start();
    loops.push(lfo);
    epBus.connect(epTone).connect(musicBus);
    sfxBus = context.createGain();
    sfxBus.gain.value = 1;
    sfxBus.connect(master);

    // Room tone in the middle, rain from the window on the left, fire on the right.
    const amb = context.createGain();
    amb.gain.value = 1;
    amb.connect(master);
    const hp = context.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 70;
    const lp = context.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 650;
    const roomLevel = context.createGain();
    roomLevel.gain.value = 0.05;
    startLoop(brown, [hp, lp, roomLevel], amb);
    const rainPan = context.createStereoPanner();
    rainPan.pan.value = -0.4;
    rainPan.connect(amb);
    const rainHi = context.createBiquadFilter();
    rainHi.type = "highpass";
    rainHi.frequency.value = 1100;
    const rainLo = context.createBiquadFilter();
    rainLo.type = "lowpass";
    rainLo.frequency.value = 5200;
    const rainLevel = context.createGain();
    rainLevel.gain.value = 0.03;
    startLoop(rain, [rainHi, rainLo, rainLevel], rainPan);
    const patter = context.createBiquadFilter();
    patter.type = "bandpass";
    patter.frequency.value = 620;
    patter.Q.value = 0.7;
    const patterLevel = context.createGain();
    patterLevel.gain.value = 0.014;
    startLoop(rain, [patter, patterLevel], rainPan);
    firePan = context.createStereoPanner();
    firePan.pan.value = 0.35;
    firePan.connect(amb);

    // Low drone for tension, silent until the mood asks for it.
    droneGain = context.createGain();
    droneGain.gain.value = 0;
    droneGain.connect(musicBus);
    for (const freq of [73.42, 77.78]) {
      const osc = context.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(droneGain);
      osc.start();
      loops.push(osc);
    }

    nextBeat = context.currentTime + 0.2;
    beat = 0;
    timer = window.setInterval(tick, TICK_MS);
    applyMood();
    await context.resume();
  }

  function applyMood(): void {
    if (!ctx || !droneGain) return;
    droneGain.gain.setTargetAtTime(mood === "tension" ? 0.03 : 0, ctx.currentTime, 1.2);
  }

  function cue(name: ScoreCue): void {
    if (!ctx || !sfxBus || muted || ctx.state !== "running") return;
    const t = ctx.currentTime + 0.01;
    if (name === "type") {
      if (t - lastType < 0.035) return;
      lastType = t;
      noiseHit(t, 0.004, 0.035, "bandpass", 2600 + Math.random() * 900, 2, sfxBus);
      return;
    }
    duckMusic();
    if (name === "discover") {
      vibes(76, t, 1.2, sfxBus);
      vibes(81, t + 0.08, 1, sfxBus);
    } else if (name === "link") {
      bass(50, t, 0.5, 1);
      ep(57, t + 0.05, 0.5, 0.7, sfxBus);
      ep(64, t + 0.12, 0.6, 0.6, sfxBus);
      if (white) {
        const src = ctx.createBufferSource();
        src.buffer = white;
        const f = ctx.createBiquadFilter();
        f.type = "bandpass";
        f.Q.value = 3;
        f.frequency.setValueAtTime(800, t);
        f.frequency.exponentialRampToValueAtTime(3200, t + 0.35);
        const g = ctx.createGain();
        env(g, t, 0.05, 0.05, 0.32);
        src.connect(f).connect(g).connect(sfxBus);
        src.start(t);
        src.stop(t + 0.45);
      }
    } else if (name === "miss") {
      thud(t, 70, 0.26, 0.26);
      ep(64, t + 0.02, 0.25, 0.32, sfxBus);
      ep(65, t + 0.02, 0.25, 0.32, sfxBus);
    } else if (name === "contradiction") {
      thud(t, 52, 0.32, 1.1);
      for (const note of [62, 63, 69]) ep(note, t + 0.04, 0.9, 0.5, sfxBus);
      noiseHit(t, 0.5, 0.04, "lowpass", 900, 0.7, sfxBus);
    } else if (name === "timeline") {
      for (let i = 0; i < 3; i += 1) noiseHit(t + i * 0.13, 0.02, 0.06, "bandpass", 3400, 3, sfxBus);
      vibes(74, t + 0.45, 1.1, sfxBus);
      vibes(81, t + 0.6, 1, sfxBus);
    } else if (name === "hint") {
      vibes(86, t, 0.9, sfxBus);
    } else if (name === "reveal") {
      const bloom = [50, 57, 62, 66, 69, 76];
      const bus = sfxBus;
      bloom.forEach((note, i) => ep(note, t + i * 0.04, 2.6, 0.75, bus));
      bass(38, t, 2.8, 1);
      vibes(86, t + 0.9, 1, sfxBus);
      vibes(90, t + 1.3, 0.9, sfxBus);
      thud(t, 48, 0.3, 1.6);
    } else if (name === "stamp") {
      noiseHit(t, 0.16, 0.3, "lowpass", 380, 0.8, sfxBus);
      thud(t, 92, 0.32, 0.3);
    }
  }

  function thunder(strength: number, delaySeconds: number): void {
    if (!ctx || !brown || !sfxBus || muted) return;
    const t = ctx.currentTime + Math.max(0, delaySeconds);
    const src = ctx.createBufferSource();
    src.buffer = brown;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(70, t + 4.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.1 * strength, t + 0.12 + (1 - strength) * 0.3);
    g.gain.setTargetAtTime(0, t + 0.3, 1);
    src.connect(f).connect(g).connect(sfxBus);
    src.start(t, Math.random() * 1);
    src.stop(t + 5);
  }

  return {
    get started() {
      return ctx !== null;
    },
    start,
    setMuted(value) {
      muted = value;
      if (ctx && muteNode) muteNode.gain.setTargetAtTime(value ? 0 : 1, ctx.currentTime, 0.08);
    },
    setMood(next) {
      if (next === mood) return;
      mood = next;
      applyMood();
    },
    cue,
    thunder,
    dispose() {
      disposed = true;
      if (timer !== null) window.clearInterval(timer);
      timer = null;
      for (const node of loops) {
        try {
          node.stop();
        } catch {
          // Already stopped.
        }
      }
      loops.length = 0;
      void ctx?.close();
      ctx = null;
    },
  };
}
