import {Audio, interpolate, staticFile} from 'remotion';
import {FPS, segmentRange, type SegmentId} from '../timeline';
import {NARRATION} from './narration.generated';

// Background bed: the file is already quiet (about -30 dB mean, generated locally).
// The bed drops a little while narration is speaking, then returns.
const BED_VOLUME = 0.5;
const DUCKED_VOLUME = 0.2;
const DUCK_FADE_FRAMES = 9;

const voiceWindows = NARRATION.map((line) => {
  const from = segmentRange(line.segment as SegmentId).from + Math.round(line.atSec * FPS);
  return {from, to: from + Math.ceil(line.durationSec * FPS)};
});

// Returns the bed volume for a global frame: BED_VOLUME, eased down to DUCKED_VOLUME
// around each narration window.
const bedVolume = (frame: number): number => {
  let duck = 0;
  for (const window of voiceWindows) {
    const amount = interpolate(
      frame,
      [window.from - DUCK_FADE_FRAMES, window.from, window.to, window.to + DUCK_FADE_FRAMES],
      [0, 1, 1, 0],
      {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
    );
    duck = Math.max(duck, amount);
  }
  return BED_VOLUME + (DUCKED_VOLUME - BED_VOLUME) * duck;
};

export const Bed: React.FC = () => <Audio src={staticFile('audio/bed.mp3')} volume={bedVolume} />;
