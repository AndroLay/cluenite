import {AbsoluteFill, Sequence} from 'remotion';
import {Background} from '../components/Background';
import {Caption} from '../components/Caption';
import {FootageSlot} from '../components/FootageSlot';
import {toFrames} from '../timeline';

// S4 · 0:52–1:20 (28 s). The longer mode on the same engine.
// Do not show a Start control: a new round stays in READY until one exists
// (docs/demo/DEMO_VIDEO_PLAN.md, Section 5, item 7). Avoid the hint button.
export const ModesScene: React.FC = () => (
  <AbsoluteFill>
    <Background glow={0.1} />
    <Sequence durationInFrames={toFrames(14)}>
      <FootageSlot id="S4-dashboard" />
      <Caption text="Same engine, deeper investigation." />
    </Sequence>
    <Sequence from={toFrames(14)} durationInFrames={toFrames(14)}>
      <FootageSlot id="S4-board" />
      <Caption text="Mystery Live · M01" kicker="Case" />
    </Sequence>
  </AbsoluteFill>
);

// S5 · 1:20–1:45 (25 s). Wrong theories are tested and refuted, not punished.
// Do not press the hint button in this footage until the known bug is fixed.
export const TimelineScene: React.FC = () => (
  <AbsoluteFill>
    <Background glow={0.1} />
    <Sequence durationInFrames={toFrames(13)}>
      <FootageSlot id="S5-correction" />
      <Caption text="!order HEAT ORDER OPEN TROLLEY BLACKOUT" command kicker="Chat command" />
    </Sequence>
    <Sequence from={toFrames(13)} durationInFrames={toFrames(12)}>
      <FootageSlot id="S5-theory" />
      <Sequence durationInFrames={toFrames(4)}>
        <Caption text="Wrong theories are tested, not punished." />
      </Sequence>
      <Sequence from={toFrames(4)} durationInFrames={toFrames(8)}>
        <Caption text="!challenge BLACKOUT_THEFT ACCESS_RECORD" command kicker="Chat command" />
      </Sequence>
    </Sequence>
  </AbsoluteFill>
);
