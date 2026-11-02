import {AbsoluteFill, Sequence} from 'remotion';
import {Background} from '../components/Background';
import {Caption} from '../components/Caption';
import {FootageSlot} from '../components/FootageSlot';
import {toFrames} from '../timeline';

// S7 · 2:17–2:40 (23 s). Build process and the verification behind it.
// Do not quote a test count from an old record: use the count from the live
// terminal run on the day of recording, or cite STATUS with its date.
export const BuiltWithCodex: React.FC = () => (
  <AbsoluteFill>
    <Background glow={0.1} />
    <Sequence durationInFrames={toFrames(11)}>
      <FootageSlot id="S7-codex" />
      <Caption text="Built using Codex, deterministic proof tests and EventSub." />
    </Sequence>
    <Sequence from={toFrames(11)} durationInFrames={toFrames(12)}>
      <FootageSlot id="S7-tests" />
      <Caption text="Codex session · test run · EventSub" kicker="Proof" />
    </Sequence>
  </AbsoluteFill>
);
