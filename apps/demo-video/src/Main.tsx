import {AbsoluteFill, Sequence, interpolate, useCurrentFrame} from 'remotion';
import {Bed} from './audio/Bed';
import {Narration} from './audio/Narration';
import {Sfx} from './audio/Sfx';
import {Close} from './scenes/Close';
import {BuiltWithCodex} from './scenes/Codex';
import {FirstEvidence, Verdict} from './scenes/Evidence';
import {ModesScene, TimelineScene} from './scenes/Board';
import {ResponsiveCheck} from './scenes/Responsive';
import {Hook} from './scenes/Hook';
import {hasPlaceholders} from './footage';
import {SEGMENTS, segmentRange, type SegmentId} from './timeline';
import {COLOR, FONT} from './theme';

const SCENES: Record<SegmentId, React.FC> = {
  S1: Hook,
  S2: FirstEvidence,
  S3: Verdict,
  S4: ModesScene,
  S5: TimelineScene,
  S6: ResponsiveCheck,
  S7: BuiltWithCodex,
  S8: Close,
};

const FADE_FRAMES = 12;

// Fades each segment in from and out to ink, so cuts between segments read as
// deliberate scene changes rather than hard jumps.
const SegmentFade: React.FC<{durationInFrames: number; children: React.ReactNode}> = ({
  durationInFrames,
  children,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, FADE_FRAMES, durationInFrames - FADE_FRAMES, durationInFrames],
    [0, 1, 1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
  return <AbsoluteFill style={{opacity}}>{children}</AbsoluteFill>;
};

// Shown for as long as any footage slot is still a placeholder. It keeps a
// draft from being mistaken for a finished cut.
const DraftBadge: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      top: 40,
      right: 48,
      padding: '10px 20px',
      borderRadius: 999,
      border: `2px solid ${COLOR.amber}`,
      backgroundColor: 'rgba(18,12,8,0.85)',
      fontFamily: FONT.text,
      fontWeight: 700,
      fontSize: 20,
      letterSpacing: 3,
      color: COLOR.amber,
    }}
  >
    DRAFT · REAL FOOTAGE PENDING
  </div>
);

export const Main: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: COLOR.ink}}>
    {SEGMENTS.map((segment) => {
      const {from, durationInFrames} = segmentRange(segment.id);
      const Scene = SCENES[segment.id];
      return (
        <Sequence key={segment.id} from={from} durationInFrames={durationInFrames} name={segment.id}>
          <SegmentFade durationInFrames={durationInFrames}>
            <Scene />
          </SegmentFade>
        </Sequence>
      );
    })}
    <Bed />
    <Narration />
    <Sfx />
    {hasPlaceholders ? <DraftBadge /> : null}
  </AbsoluteFill>
);
