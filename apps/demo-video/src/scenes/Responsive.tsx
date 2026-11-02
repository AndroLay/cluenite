import {AbsoluteFill, Sequence} from 'remotion';
import {Background} from '../components/Background';
import {Caption} from '../components/Caption';
import {FootageSlot} from '../components/FootageSlot';
import {toFrames} from '../timeline';

// S6 · 1:45–2:17 (32 s). Uses the verified fallback from DEMO_VIDEO_PLAN.md:
// responsive checks on signed-out public pages at 390 px and 1280 px.
// Co-op is not verified live, so the co-op lobby must not appear as working.
export const ResponsiveCheck: React.FC = () => (
  <AbsoluteFill>
    <Background glow={0.08} />
    <FootageSlot id="S6-responsive" />
    <Sequence durationInFrames={toFrames(12)}>
      <Caption text="Layouts hold at phone and desktop widths." />
    </Sequence>
    <Sequence from={toFrames(12)} durationInFrames={toFrames(20)}>
      <Caption text="Responsive check · 390 px and 1280 px" kicker="Responsive check" />
    </Sequence>
  </AbsoluteFill>
);
