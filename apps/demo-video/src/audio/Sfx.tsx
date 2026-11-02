import {Audio, Sequence, staticFile} from 'remotion';
import {FPS, toFrames} from '../timeline';

// Sound effects tied to the on-screen beats of the labeled illustrations. Each cue
// fires when its element first appears (see the delays in illustrations/Illustrations.tsx).
// These cues are tied to the illustrations: when a segment switches to real footage,
// re-time or remove its cues here so they match what the recording shows.
type Cue = {file: string; atSec: number; durationSec: number; volume: number};

// Tile reveals on the S4 board: 8 tiles, one every 5 frames, starting at 0:66.
const BOARD_START_SEC = 66;
const TILE_STEP_SEC = 5 / FPS;
const boardTicks: Cue[] = Array.from({length: 8}, (_, i) => ({
  file: 'audio/sfx/tick.wav',
  atSec: BOARD_START_SEC + i * TILE_STEP_SEC,
  durationSec: 0.08,
  volume: 0.22,
}));

const CUES: Cue[] = [
  // S2: the board updates after the !look command (Game state node, 1:01 into S2).
  {file: 'audio/sfx/chime.wav', atSec: 13.1, durationSec: 1.2, volume: 0.35},
  // S3: the VERIFIED badge stamps in (delay 30 frames from the S3 start at 0:35).
  {file: 'audio/sfx/stamp.wav', atSec: 36.0, durationSec: 0.4, volume: 0.45},
  ...boardTicks,
  // S8: the wordmark reveal (6 frames after the S8 start at 2:40).
  {file: 'audio/sfx/chime.wav', atSec: 160.2, durationSec: 1.2, volume: 0.3},
];

export const Sfx: React.FC = () => (
  <>
    {CUES.map((cue, i) => (
      <Sequence
        key={`${cue.file}-${i}`}
        from={toFrames(cue.atSec)}
        durationInFrames={Math.ceil(cue.durationSec * FPS)}
      >
        <Audio src={staticFile(cue.file)} volume={cue.volume} />
      </Sequence>
    ))}
  </>
);
