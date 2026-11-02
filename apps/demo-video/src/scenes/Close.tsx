import {AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from '../components/Background';
import {Caption} from '../components/Caption';
import {FootageSlot} from '../components/FootageSlot';
import {toFrames} from '../timeline';
import {COLOR, FONT, reveal} from '../theme';

// S8 · 2:40–2:55 (15 s). Close. No repository or channel link is shown until the
// repository visibility decision is made (DEMO_VIDEO_PLAN.md, Section 5).
export const Close: React.FC = () => (
  <AbsoluteFill>
    <Background glow={0.2} />
    {/* No stand-in here: the wordmark occupies this space. Shows the recording once linked. */}
    <FootageSlot id="S8-reveal" fallback={<></>} />
    <Wordmark />
    <Sequence durationInFrames={toFrames(6)}>
      <Caption text="Every clue brings us together." />
    </Sequence>
    <Sequence from={toFrames(6)} durationInFrames={toFrames(9)}>
      <Caption text="Turn downtime into a mystery. Turn chat into investigators." />
    </Sequence>
  </AbsoluteFill>
);

const Wordmark: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = reveal(frame, fps, 6);
  const ruleWidth = interpolate(reveal(frame, fps, 24), [0, 1], [0, 360]);

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', paddingBottom: 220}}>
      <div
        style={{
          fontFamily: FONT.display,
          fontWeight: 600,
          fontSize: 150,
          letterSpacing: 2,
          color: COLOR.parchment,
          opacity: enter,
          transform: `translateY(${interpolate(enter, [0, 1], [24, 0])}px)`,
        }}
      >
        Cluenite
      </div>
      <div style={{marginTop: 18, height: 2, width: ruleWidth, backgroundColor: COLOR.amber}} />
    </AbsoluteFill>
  );
};
