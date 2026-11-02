import {AbsoluteFill,Sequence,interpolate,useCurrentFrame} from 'remotion';
import {BottomLine,Capture,Copy,Corner,DeskWindow,Eyebrow,F,FilmBase,P,ROOM,RoomBackdrop,Rule,SampleLabel,n} from './Common';

export const TheChoice:React.FC = () => {
  const f=useCurrentFrame();
  return <FilmBase>
    <RoomBackdrop file="verdict" hold={5.3} wash={.65}/>
    <div style={{position:'absolute',left:106,top:250,width:900}}>
      <Eyebrow>THE ROOM HAS GIVEN YOU THE ANSWER</Eyebrow>
      <Copy at={6} size={130} style={{marginTop:36}}>Have you<br/><span style={{color:P.gold,fontStyle:'italic'}}>got it?</span></Copy>
      <div style={{display:'flex',gap:19,marginTop:65}}>{[0,1,2].map(i=><span key={i} style={{width:10,height:10,rotate:'45deg',background:P.gold,opacity:n(f,70+i*37,85+i*37)}}/>)}</div>
    </div>
    <DeskWindow file="verdict" hold={5.3} rect={{x:1425,y:345,w:431,h:514}}/>
    <Corner chapter="Make the accusation" number="07"/><SampleLabel/>
    <BottomLine at={100}>The loudest theory is not always the right one.</BottomLine>
  </FilmBase>;
};

export const TheReveal:React.FC = () => {
  const f=useCurrentFrame();
  return <FilmBase>
    <Capture file="reveal" rect={ROOM} hold={19.8}/>
    <AbsoluteFill style={{background:'linear-gradient(90deg,rgba(13,10,8,.94),rgba(13,10,8,.8) 50%,rgba(13,10,8,.12))',opacity:1-n(f,125,165)}}/>
    <div style={{position:'absolute',left:106,top:225,width:1200,opacity:1-n(f,125,160)}}>
      <Eyebrow>CASE CLOSED / ADA WREN</Eyebrow>
      <Copy at={12} size={142} style={{marginTop:32}}>The alarm<br/>was her <span style={{color:P.gold,fontStyle:'italic'}}>alibi.</span></Copy>
      <Rule at={50} style={{marginTop:54}}/>
    </div>
    <Sequence from={165} durationInFrames={435} premountFor={30} name="Actual in-app reconstruction">
      <Capture file="reveal" rect={ROOM} start={5.5} hold={14.3}/>
    </Sequence>
    <Sequence from={540} durationInFrames={60} name="Hold the actual coat twist">
      <Capture file="reveal" rect={ROOM} still/>
    </Sequence>
    <div style={{position:'absolute',top:0,right:0,width:690,height:108,background:'linear-gradient(180deg,#0d0a08,rgba(13,10,8,.93) 80%,transparent)'}}/>
    <div style={{opacity:1-n(f,125,165)}}><Corner chapter="The reveal" number="08"/></div><SampleLabel/>
  </FilmBase>;
};

export const MoreMysteries:React.FC = () => <FilmBase>
  <Sequence durationInFrames={150} premountFor={30} name="Actual case menu">
    <Capture file="menu" hold={4.8}/>
    <AbsoluteFill style={{background:'linear-gradient(0deg,rgba(13,10,8,.96),transparent 45%,rgba(13,10,8,.7))'}}/>
    <BottomLine>Next mystery? Bring the whole chat.</BottomLine>
    <div style={{position:'absolute',top:45,left:84}}><Eyebrow>QUICK CASE / MYSTERY LIVE / CO-OP</Eyebrow></div>
    <div style={{position:'absolute',right:76,top:42,fontSize:17,color:P.dim,letterSpacing:2,background:P.ink,padding:12}}>ACTUAL CASE MENU · LOCAL APP</div>
  </Sequence>
  <Sequence from={150} durationInFrames={150} premountFor={30} name="Actual M01 visual preview">
    <Capture file="m01" start={.5} hold={4.8}/>
    <AbsoluteFill style={{background:'linear-gradient(0deg,rgba(13,10,8,.95),transparent 35%,rgba(13,10,8,.72))'}}/>
    <BottomLine>A different case. More to untangle.</BottomLine>
    <Corner chapter="Mystery Live" number="09"/><SampleLabel preview/>
  </Sequence>
</FilmBase>;

export const BuildCredit:React.FC = () => {
  const f=useCurrentFrame();
  return <FilmBase>
    <div style={{position:'absolute',left:110,top:265}}>
      <Eyebrow>FROM THE FIRST RULE TO THE FINAL REVEAL</Eyebrow>
      <Copy at={5} size={130} style={{marginTop:36}}>Built with <span style={{color:P.gold}}>Codex.</span></Copy>
      <Rule at={25} style={{marginTop:45}}/>
      <div style={{marginTop:38,fontSize:32,color:P.dim,opacity:n(f,45,65)}}>Cases. Proof. Realtime play.</div>
    </div>
    <svg viewBox="0 0 600 500" style={{position:'absolute',right:100,top:230,width:470,height:390,opacity:.65}}>
      <path d="M80 350 220 150 400 230 510 70" fill="none" stroke={P.gold} strokeWidth="1.7" pathLength="1" strokeDasharray="1" strokeDashoffset={1-n(f,0,110)}/>
      {[[80,350],[220,150],[400,230],[510,70]].map(([x,y],i)=><g key={i} opacity={n(f,10+i*18,30+i*18)}><circle cx={x} cy={y} r="19" fill={P.ink} stroke={P.gold}/><circle cx={x} cy={y} r="4" fill={P.gold}/></g>)}
    </svg>
  </FilmBase>;
};

export const EndCard:React.FC = () => {
  const f=useCurrentFrame();
  return <FilmBase>
    <AbsoluteFill style={{background:'radial-gradient(ellipse at 50% 60%,#342114 0%,#0d0a08 68%)'}}/>
    <div style={{position:'absolute',left:110,top:190,right:110,opacity:n(f,0,18)}}>
      <Eyebrow>TWITCH-NATIVE MYSTERIES</Eyebrow>
      <Copy at={8} size={137} style={{marginTop:31}}>The break just<br/>got <span style={{color:P.gold,fontStyle:'italic'}}>interesting.</span></Copy>
      <div style={{marginTop:65,display:'flex',alignItems:'center',gap:28}}>
        <svg width="59" height="59" viewBox="0 0 64 64"><circle cx="26" cy="26" r="17" fill="none" stroke={P.gold} strokeWidth="2"/><path d="m39 39 17 17" stroke={P.gold} strokeWidth="2"/></svg>
        <div style={{fontFamily:F.serif,fontSize:78,letterSpacing:-1}}>Cluenite</div>
      </div>
      <div style={{height:1,background:P.gold,width:1280*n(f,20,75),marginTop:28}}/>
      <div style={{marginTop:30,fontSize:28,color:P.dim,opacity:n(f,65,85)}}>Open a case. Bring your chat.</div>
    </div>
  </FilmBase>;
};
