import React from 'react';
import {AbsoluteFill,Audio,Sequence,staticFile,useCurrentFrame} from 'remotion';
import {B,Footnote,enter} from './Brand';
import {NoirOpening} from './NoirOpening';
import {TheChallenge,TheConnection,TheCrew,TheOrder,TheVerdict,TheWrongLead} from './InvestigationScenes';
import {AnotherNight,FinalWord,TheReconstruction} from './ResolutionScenes';

// Each shot is independently editable. All gameplay pixels come from the
// local sample, and editorial magnification is never presented as a UI feature.
export const Commercial:React.FC=()=>{
  const f=useCurrentFrame();
  return <AbsoluteFill style={{background:B.ink}}>
    <Sequence from={0} durationInFrames={420} premountFor={30} name="01 · The brass lens finds a clue"><NoirOpening/></Sequence>
    <Sequence from={420} durationInFrames={210} premountFor={30} name="02 · Everyone has a theory"><TheCrew/></Sequence>
    <Sequence from={630} durationInFrames={240} premountFor={30} name="03 · The gardener is a false lead"><TheWrongLead/></Sequence>
    <Sequence from={870} durationInFrames={300} premountFor={30} name="04 · The key and the clock"><TheConnection/></Sequence>
    <Sequence from={1170} durationInFrames={300} premountFor={30} name="05 · The alarm came later"><TheOrder/></Sequence>
    <Sequence from={1470} durationInFrames={180} premountFor={30} name="06 · Challenge the alibi"><TheChallenge/></Sequence>
    <Sequence from={1650} durationInFrames={150} premountFor={30} name="07 · Who is your suspect?"><TheVerdict/></Sequence>
    <Sequence from={1800} durationInFrames={510} premountFor={30} name="08 · The actual reconstruction and twist"><TheReconstruction/></Sequence>
    <Sequence from={2310} durationInFrames={210} premountFor={30} name="09 · Another mystery"><AnotherNight/></Sequence>
    <Sequence from={2520} durationInFrames={180} premountFor={30} name="10 · Cluenite"><FinalWord/></Sequence>
    {f<2520?<Footnote preview={f>=2390}/>:null}
    <AbsoluteFill style={{background:B.ink,opacity:1-enter(f,0,10),pointerEvents:'none'}}/>
    <Audio src={staticFile('commercial/score.wav')}/>
  </AbsoluteFill>;
};
