import {AbsoluteFill, Sequence} from 'remotion';
import {Background} from '../components/Background';
import {Caption} from '../components/Caption';
import {FootageSlot} from '../components/FootageSlot';
import {toFrames} from '../timeline';

// S2 · 0:12–0:35 (23 s). Chat, not a dashboard, moves the case.
// Caption timings are provisional until the real recording exists.
export const FirstEvidence: React.FC = () => (
  <AbsoluteFill>
    <Background glow={0.12} />
    <FootageSlot id="S2-chat" />
    <Sequence durationInFrames={toFrames(5)}>
      <Caption text="Chat finds evidence directly in Twitch." />
    </Sequence>
    <Sequence from={toFrames(5)} durationInFrames={toFrames(18)}>
      <Caption text="!look CAM" command kicker="Chat command" />
    </Sequence>
  </AbsoluteFill>
);

// S3 · 0:35–0:52 (17 s). The evidence changes game state, and the verdict is checked.
export const Verdict: React.FC = () => (
  <AbsoluteFill>
    <Background glow={0.12} />
    <FootageSlot id="S3-link" />
    <Sequence durationInFrames={toFrames(6)}>
      <Caption text="It's not votes; the evidence changes game state." />
    </Sequence>
    <Sequence from={toFrames(6)} durationInFrames={toFrames(11)}>
      <Caption text="Verified by the case engine" kicker="Case engine" />
    </Sequence>
  </AbsoluteFill>
);
