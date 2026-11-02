import {AbsoluteFill, Sequence, interpolate, useCurrentFrame} from 'remotion';
import {BottomLine,Capture,Copy,Corner,Eyebrow,F,FilmBase,P,ROOM,RoomBackdrop,Rule,SampleLabel,n} from './Common';

export const ColdOpen:React.FC = () => {
  const f=useCurrentFrame();
  return <FilmBase>
    <RoomBackdrop wash={.06} motion/>
    <div style={{position:'absolute',left:110,top:250}}>
      <Eyebrow style={{opacity:n(f,0,12)}}>ASHGROVE HOUSE / 21:05</Eyebrow>
      <Copy at={7} size={148} style={{marginTop:32}}>A manuscript.<br/><span style={{fontStyle:'italic',color:P.gold}}>Gone.</span></Copy>
      <Rule at={28} style={{marginTop:42}}/>
    </div>
    <BottomLine at={54}>Who would you trust?</BottomLine>
    <SampleLabel/>
  </FilmBase>;
};

export const Invitation:React.FC = () => {
  const f=useCurrentFrame();
  return <FilmBase>
    <Capture file="room" rect={ROOM} hold={5}/>
    <AbsoluteFill style={{background:'linear-gradient(0deg,#0d0a08 0%,rgba(13,10,8,.4) 35%,rgba(13,10,8,.24) 65%,#0d0a08 100%)'}}/>
    <Corner chapter="The case" number="01"/><SampleLabel/>
    <div style={{position:'absolute',left:106,right:100,bottom:190,opacity:n(f,0,18)}}>
      <Eyebrow>A PLAYABLE MYSTERY BY CLUENITE</Eyebrow>
      <Copy at={5} size={112} style={{marginTop:22}}>One room. Three suspects.<br/><span style={{color:P.gold}}>Your move.</span></Copy>
    </div>
    <div style={{position:'absolute',right:112,bottom:88,fontFamily:F.sans,fontSize:22,letterSpacing:3,color:P.dim,opacity:n(f,65,90)}}>FIND / CONNECT / CHALLENGE / SOLVE</div>
  </FilmBase>;
};

const SearchTake:React.FC<{file:string;label:string;start?:number;hold:number}> = ({file,label,start=0,hold}) => <AbsoluteFill>
  <Capture file={file} rect={ROOM} start={start} hold={hold}/>
  <AbsoluteFill style={{background:'linear-gradient(0deg,rgba(13,10,8,.9),transparent 23%,transparent 75%,rgba(13,10,8,.75))'}}/>
  <BottomLine>{label}</BottomLine>
</AbsoluteFill>;

export const Search:React.FC = () => <FilmBase>
  <Sequence durationInFrames={120} premountFor={30} name="A muddy latch"><SearchTake file="find-window" label="Start with what catches your eye." hold={3.9}/></Sequence>
  <Sequence from={120} durationInFrames={105} premountFor={30} name="The folded note"><SearchTake file="find-note" label="A note. A stopped clock. A missing key." hold={3.4}/></Sequence>
  <Sequence from={225} durationInFrames={135} premountFor={30} name="The stopped clock"><SearchTake file="find-clock" label="Every find changes what you know." hold={4.4}/></Sequence>
  <Sequence from={360} durationInFrames={180} premountFor={30} name="A quick run of finds"><SearchTake file="search-combo" label="And yes, the hunt gets competitive." hold={5.8}/></Sequence>
  <Corner chapter="Search the room" number="02"/><SampleLabel/>
</FilmBase>;
