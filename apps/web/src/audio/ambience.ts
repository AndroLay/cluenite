// Room tone under the case: brown noise, low-passed and high-passed, with a slow level swell. A
// light rain layer sits on top, and a distant rumble of thunder is struck at long, random gaps.
// Everything is generated in code, so no audio file ships with the app.
//
// Browsers block AudioContext until a user gesture, so the bed starts on the first pointerdown or
// keydown on the page. It never starts on its own. Mute uses the same switch as the sound effects.
// The caller should not create this in OBS mode, where the overlay must stay silent on stream.

export interface Ambience {
  setMuted(muted: boolean): void;
  dispose(): void;
}

const LEVEL = 0.045; // Quiet bed. The sound cues must stay on top of it.
const SWELL_DEPTH = 0.012; // LFO depth added to LEVEL, so the bed breathes between roughly 0.033 and 0.057.
const SWELL_HZ = 0.07; // One swell about every 14 seconds.
const FADE_IN_S = 2.5;
const MUTE_TIME_CONSTANT_S = 0.08;
const LOOP_SECONDS = 6;
const SEAM_FADE_S = 0.2;
const RAIN_LEVEL = 0.02; // Rain sits well under the room tone.
const RAIN_DROP_RATE = 0.0005; // Chance per sample of a new drop, about 20 drops a second at 44.1 kHz.
const RAIN_DROP_DECAY = 0.985; // A drop dies within a few milliseconds.
const THUNDER_SECONDS = 5;
const THUNDER_LEVEL = 0.07;
const THUNDER_FIRST_MIN_S = 15;
const THUNDER_FIRST_MAX_S = 40;
const THUNDER_MIN_S = 25;
const THUNDER_MAX_S = 70;

// Brown noise is a leaky integral of white noise. The ends are faded to zero so the loop seam does
// not click.
function brownNoise(ctx: AudioContext, seconds: number = LOOP_SECONDS): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const seam = Math.floor(ctx.sampleRate * SEAM_FADE_S);
  let last = 0;
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    let sample = last * 3.5;
    if (i < seam) sample *= i / seam;
    else if (i > length - seam) sample *= (length - i) / seam;
    data[i] = sample;
  }
  return buffer;
}

// Rain: white hiss with sparse drops that die quickly. Band-pass filters are applied on playback.
function rainNoise(ctx: AudioContext): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * LOOP_SECONDS);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const seam = Math.floor(ctx.sampleRate * SEAM_FADE_S);
  let drop = 0;
  for (let i = 0; i < length; i += 1) {
    if (Math.random() < RAIN_DROP_RATE) drop = 0.15 + Math.random() * 0.3;
    let sample = (Math.random() * 2 - 1) * 0.25 + drop;
    drop *= RAIN_DROP_DECAY;
    if (i < seam) sample *= i / seam;
    else if (i > length - seam) sample *= (length - i) / seam;
    data[i] = sample;
  }
  return buffer;
}

function randomMs(minS: number, maxS: number): number {
  return (minS + Math.random() * (maxS - minS)) * 1000;
}

export function createAmbience(): Ambience {
  let ctx: AudioContext | null = null;
  let source: AudioBufferSourceNode | null = null;
  let rain: AudioBufferSourceNode | null = null;
  let thunderTimer: number | null = null;
  let lfo: OscillatorNode | null = null;
  let mute: GainNode | null = null;
  let wantMuted = false;
  let disposed = false;

  function onGesture(): void {
    start();
  }

  function disarm(): void {
    window.removeEventListener("pointerdown", onGesture);
    window.removeEventListener("keydown", onGesture);
  }

  function start(): void {
    disarm();
    if (disposed || ctx !== null || typeof AudioContext === "undefined") return;

    const context = new AudioContext();
    ctx = context;
    const now = context.currentTime;

    const highpass = context.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 80;

    const lowpass = context.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 900;

    // The swell is an LFO added to this gain's value. The fade and mute gains sit after it.
    const level = context.createGain();
    level.gain.value = LEVEL;

    lfo = context.createOscillator();
    lfo.frequency.value = SWELL_HZ;
    const depth = context.createGain();
    depth.gain.value = SWELL_DEPTH;
    lfo.connect(depth).connect(level.gain);

    const fade = context.createGain();
    fade.gain.setValueAtTime(0, now);
    fade.gain.linearRampToValueAtTime(1, now + FADE_IN_S);

    // Mute sits last, so the rain and the thunder are silenced by the same switch.
    const muteNode = context.createGain();
    muteNode.gain.value = wantMuted ? 0 : 1;
    muteNode.connect(context.destination);
    mute = muteNode;

    source = context.createBufferSource();
    source.buffer = brownNoise(context);
    source.loop = true;
    source.connect(highpass).connect(lowpass).connect(level).connect(fade).connect(muteNode);

    // Rain: hiss band-passed to about 1.2–5 kHz, faded in with the bed.
    const rainHigh = context.createBiquadFilter();
    rainHigh.type = "highpass";
    rainHigh.frequency.value = 1200;
    const rainLow = context.createBiquadFilter();
    rainLow.type = "lowpass";
    rainLow.frequency.value = 5000;
    const rainLevel = context.createGain();
    rainLevel.gain.value = RAIN_LEVEL;
    const rainSource = context.createBufferSource();
    rainSource.buffer = rainNoise(context);
    rainSource.loop = true;
    rainSource.connect(rainHigh).connect(rainLow).connect(rainLevel).connect(fade);
    rain = rainSource;

    // Thunder: a few seconds of low rumble, struck at long random gaps and routed through mute.
    const thunderBuffer = brownNoise(context, THUNDER_SECONDS);
    const rumble = (): void => {
      thunderTimer = null;
      if (disposed) return;
      const t = context.currentTime;
      const sound = context.createBufferSource();
      sound.buffer = thunderBuffer;
      const rumbleLow = context.createBiquadFilter();
      rumbleLow.type = "lowpass";
      rumbleLow.frequency.setValueAtTime(260, t);
      rumbleLow.frequency.exponentialRampToValueAtTime(90, t + THUNDER_SECONDS);
      const envelope = context.createGain();
      envelope.gain.setValueAtTime(0, t);
      envelope.gain.linearRampToValueAtTime(THUNDER_LEVEL, t + 0.15);
      envelope.gain.setTargetAtTime(0, t + 0.15, 0.9);
      sound.connect(rumbleLow).connect(envelope).connect(muteNode);
      sound.start(t);
      sound.stop(t + THUNDER_SECONDS);
      thunderTimer = window.setTimeout(rumble, randomMs(THUNDER_MIN_S, THUNDER_MAX_S));
    };
    thunderTimer = window.setTimeout(rumble, randomMs(THUNDER_FIRST_MIN_S, THUNDER_FIRST_MAX_S));

    lfo.start();
    source.start();
    rainSource.start();
    void context.resume();
  }

  // Before the first gesture there is no graph yet, so the flag is kept and applied at start().
  function setMuted(muted: boolean): void {
    wantMuted = muted;
    if (ctx !== null && mute !== null) {
      mute.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, MUTE_TIME_CONSTANT_S);
    }
  }

  function dispose(): void {
    disposed = true;
    disarm();
    if (thunderTimer !== null) window.clearTimeout(thunderTimer);
    thunderTimer = null;
    try {
      source?.stop();
      rain?.stop();
      lfo?.stop();
    } catch {
      // Already stopped. Nothing to undo.
    }
    void ctx?.close();
    ctx = null;
    source = null;
    rain = null;
    lfo = null;
    mute = null;
  }

  window.addEventListener("pointerdown", onGesture);
  window.addEventListener("keydown", onGesture);

  return { setMuted, dispose };
}
