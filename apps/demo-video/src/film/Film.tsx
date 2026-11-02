import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import {ColdOpen,Invitation,Search} from './Opening';
import {Challenge,Connection,RedHerring,TimelineProof} from './Investigation';
import {BuildCredit,EndCard,MoreMysteries,TheChoice,TheReveal} from './Ending';
import {P} from './Common';

// A separately authored cut. The original Haiku composition remains available.
// Durations are literal per shot so the Studio has independent editable rows.
export const Film:React.FC = () => <AbsoluteFill style={{background:P.ink}}>
  <Sequence from={0} durationInFrames={150} premountFor={30} name="01 · Who would you trust?"><ColdOpen/></Sequence>
  <Sequence from={150} durationInFrames={150} premountFor={30} name="02 · One room, three suspects"><Invitation/></Sequence>
  <Sequence from={300} durationInFrames={540} premountFor={30} name="03 · Find the clues"><Search/></Sequence>
  <Sequence from={840} durationInFrames={360} premountFor={30} name="04 · The wrong lead"><RedHerring/></Sequence>
  <Sequence from={1200} durationInFrames={420} premountFor={30} name="05 · The key and the clock"><Connection/></Sequence>
  <Sequence from={1620} durationInFrames={450} premountFor={30} name="06 · Before the alarm"><TimelineProof/></Sequence>
  <Sequence from={2070} durationInFrames={300} premountFor={30} name="07 · Challenge the lie"><Challenge/></Sequence>
  <Sequence from={2370} durationInFrames={180} premountFor={30} name="08 · Have you got it?"><TheChoice/></Sequence>
  <Sequence from={2550} durationInFrames={600} premountFor={30} name="09 · The alarm was her alibi"><TheReveal/></Sequence>
  <Sequence from={3150} durationInFrames={300} premountFor={30} name="10 · Another case awaits"><MoreMysteries/></Sequence>
  <Sequence from={3450} durationInFrames={120} premountFor={30} name="11 · Built with Codex"><BuildCredit/></Sequence>
  <Sequence from={3570} durationInFrames={210} premountFor={30} name="12 · The break just got interesting"><EndCard/></Sequence>
  <Audio src={staticFile('film/score.wav')}/>
</AbsoluteFill>;
