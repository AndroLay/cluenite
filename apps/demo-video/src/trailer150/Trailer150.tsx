import React from 'react';
import {AbsoluteFill,Img,staticFile,useCurrentFrame} from 'remotion';
import {Audio,Video} from '@remotion/media';
import {TransitionSeries} from '@remotion/transitions';
import edit from './edit.generated.json';
import {C,ConnectionLine,ContradictionStrike,progress,sans,SceneHandoff,serif,TimelineEmphasis} from './Motion';

type Shot=typeof edit.shots[number]&{captureType?:string};
const Caption:React.FC<{text:string;upper?:boolean}>=({text,upper=false})=><div style={{position:'absolute',left:0,right:0,...(upper?{top:0}:{bottom:0}),minHeight:upper?96:108,padding:upper?'17px 92px':'12px 92px 38px',background:C.ink,color:C.paper,fontFamily:sans,fontSize:upper?36:37,lineHeight:1.38,textAlign:'center',...(upper?{}:{borderTop:`1px solid ${C.walnut}`})}}>{text}</div>;

const Opening:React.FC=()=>{
  const f=useCurrentFrame();
  const p=progress(f,0,66);
  const q=progress(f,155,232);
  return <AbsoluteFill style={{background:C.ink,color:C.paper,overflow:'hidden'}}>
    <div style={{position:'absolute',left:592-26*p,top:166-8*p,width:1320,height:743,overflow:'hidden',borderLeft:`2px solid ${C.brass}`,boxShadow:'-35px 0 90px #100D0A'}}>
      <Img src={staticFile('trailer150/gallery.jpg')} style={{width:1320,height:743,objectFit:'cover',scale:1+.012*p,transformOrigin:'42% 50%'}}/>
      <div style={{position:'absolute',inset:0,background:'linear-gradient(90deg,#100D0A65,transparent 25%)'}}/>
    </div>
    <div style={{position:'absolute',left:86,top:150,fontFamily:sans,fontSize:24,letterSpacing:3,color:C.gold}}>CLUENITE</div>
    <div style={{position:'absolute',left:82,top:255,width:475,fontFamily:serif,fontSize:87,lineHeight:.98,letterSpacing:-1.2,translate:`0 ${16*(1-p)}px`}}>Who triggered<br/>the alarm?</div>
    <div style={{position:'absolute',left:86,top:570,width:430,fontFamily:sans,fontSize:28,lineHeight:1.5,color:C.dim}}>21:10.<br/>The gallery door stayed locked.</div>
    <div style={{position:'absolute',left:86,top:800,width:430,fontFamily:serif,fontSize:38,color:C.gold,opacity:q}}>Your chat is on the case.</div>
    <div style={{position:'absolute',right:72,bottom:41,fontFamily:sans,fontSize:21,color:C.dim}}>In-game gallery artwork</div>
  </AbsoluteFill>;
};

const ProofCaption:React.FC<{shot:Shot;frame:number}>=({shot,frame})=>{
  const dt=frame-Math.round(shot.start*30);
  const command=shot.command;
  const capture=shot.captureType;
  let label=shot.chapter==='MYSTERY'?'Recorded host gameplay':shot.chapter==='COOP'||shot.chapter==='REVEAL'?'Two-account Twitch test · edited':shot.chapter==='BUILD'?'Actual development recording':'Recorded Twitch test · browser capture';
  if(capture==='frontend-replay')label='Frontend replay of verified actions';
  if(capture==='authenticated-host')label='Recorded host gameplay';
  const prominentCommand=command&&['TWITCH','BREAKTHROUGH'].includes(shot.chapter)&&!(shot.id==='B03'&&frame>=1320);
  return <>
    <div style={{position:'absolute',left:58,bottom:9,padding:'4px 12px',fontFamily:sans,fontSize:18,color:C.dim,background:C.ink,zIndex:5}}>{label}{command&&!prominentCommand?` · ${command}`:''}</div>
    {prominentCommand?<div style={{position:'absolute',left:58,top:106,padding:'12px 18px',background:C.ink,borderLeft:`3px solid ${C.brass}`,color:C.gold,fontFamily:'Consolas,monospace',fontSize:34,clipPath:`inset(0 ${100*(1-progress(dt,3,17))}% 0 0)`}}>
      <span style={{fontFamily:sans,fontSize:21,color:C.dim,marginRight:24}}>Recorded command</span>{command}
    </div>:null}
  </>;
};

const Ending:React.FC=()=>{
  const f=useCurrentFrame();
  const p=progress(f,4320,4342);
  return <AbsoluteFill style={{background:C.ink,opacity:p,color:C.paper,alignItems:'center',justifyContent:'center'}}>
    <div style={{fontFamily:serif,fontSize:138,letterSpacing:7,translate:`0 ${14*(1-progress(f,4330,4364))}px`}}>CLUENITE</div>
    <div style={{width:110,height:2,background:C.brass,marginTop:22}}/>
    <div style={{fontFamily:serif,fontSize:43,marginTop:40,color:C.gold}}>Every clue brings us closer to the truth.</div>
  </AbsoluteFill>;
};

// The picture conform is replaceable without changing editorial timing.
// All titles, annotations and sound remain native vector/audio layers.
export const Trailer150:React.FC=()=>{
  const f=useCurrentFrame();
  const shot=edit.shots.find(s=>f>=Math.round(s.start*30)&&f<Math.round(s.end*30)) as Shot|undefined;
  let caption=shot?.caption||'';
  if(shot?.id==='B03'&&f<1360)caption='Test the conclusion against the evidence.';
  if(shot?.id==='D04'&&f<4005)caption='Running the actual evidence-engine tests.';
  const customAnnotation=(f>=2195&&f<2274)||(f>=2386&&f<2520);
  const bridge=[1470,2700,3450,4170].some(cut=>f>=cut-11&&f<cut+11);
  return <AbsoluteFill style={{background:C.ink,fontFamily:sans,overflow:'hidden'}}>
    <TransitionSeries name="Locked 150-second editorial template">
      <TransitionSeries.Sequence durationInFrames={240} premountFor={30} name="01 · Gallery / replaceable artwork"><Opening/></TransitionSeries.Sequence>
      <TransitionSeries.Sequence durationInFrames={810} premountFor={30} name="02 · Twitch action and evidence">
        <Video name="Twitch-native gameplay" src={staticFile('trailer150/picture.mp4')} trimBefore={240} durationInFrames={810} premountFor={30} muted style={{width:1920,height:1080}}/>
      </TransitionSeries.Sequence>
      <TransitionSeries.Sequence durationInFrames={420} premountFor={30} name="03 · First verified breakthrough">
        <Video name="CAM plus schedule proof" src={staticFile('trailer150/picture.mp4')} trimBefore={1050} durationInFrames={420} premountFor={30} muted style={{width:1920,height:1080,translate:`0 ${f<1185?-110:0}px`}}/>
      </TransitionSeries.Sequence>
      <TransitionSeries.Overlay durationInFrames={22} premountFor={30}><SceneHandoff at={0} id="q01"/></TransitionSeries.Overlay>
      <TransitionSeries.Sequence durationInFrames={1230} premountFor={30} name="04 · Missing trophy / reconstruction">
        <Video name="M01 real host investigation" src={staticFile('trailer150/picture.mp4')} trimBefore={1470} durationInFrames={1230} premountFor={30} muted style={{width:1920,height:1080}}/>
      </TransitionSeries.Sequence>
      <TransitionSeries.Overlay durationInFrames={22} premountFor={30}><SceneHandoff at={0} id="m01" reverse/></TransitionSeries.Overlay>
      <TransitionSeries.Sequence durationInFrames={750} premountFor={30} name="05 · Two stations / one proof">
        <Video name="Genuine two-account co-op test" src={staticFile('trailer150/picture.mp4')} trimBefore={2700} durationInFrames={750} premountFor={30} muted style={{width:1920,height:1080}}/>
      </TransitionSeries.Sequence>
      <TransitionSeries.Overlay durationInFrames={22} premountFor={30}><SceneHandoff at={0} id="coop"/></TransitionSeries.Overlay>
      <TransitionSeries.Sequence durationInFrames={720} premountFor={30} name="06 · Codex contribution / real development">
        <Video name="Actual source and test execution" src={staticFile('trailer150/picture.mp4')} trimBefore={3450} durationInFrames={720} premountFor={30} muted style={{width:1920,height:1080}}/>
      </TransitionSeries.Sequence>
      <TransitionSeries.Overlay durationInFrames={22} premountFor={30}><SceneHandoff at={0} id="build" reverse/></TransitionSeries.Overlay>
      <TransitionSeries.Sequence durationInFrames={330} premountFor={30} name="07 · Verified reveal / Cluenite">
        <Video name="B17 reveal and ending hold" src={staticFile('trailer150/picture.mp4')} trimBefore={4170} durationInFrames={330} premountFor={30} muted style={{width:1920,height:1080}}/>
      </TransitionSeries.Sequence>
    </TransitionSeries>
    {f>=240&&f<4320&&shot&&!bridge?<ProofCaption shot={shot} frame={f}/>:null}
    {f>=240&&f<330?<div style={{position:'absolute',right:70,top:78,color:C.paper,fontFamily:serif,fontSize:39,background:C.ink,padding:'9px 18px'}}>A mystery game for Twitch chat.</div>:null}
    <ConnectionLine start={1110} end={1178} x1={545} y1={568} x2={1290} y2={568}/>
    <TimelineEmphasis/>
    <ContradictionStrike/>
    {f>=2880&&f<3000?<div style={{position:'absolute',right:72,top:77,fontFamily:serif,fontSize:42,color:C.gold,background:C.ink,padding:'10px 18px'}}>Field station → shared evidence</div>:null}
    {f>=3235&&f<3328?<div style={{position:'absolute',right:70,top:77,fontFamily:serif,fontSize:42,color:C.gold,background:C.ink,padding:'10px 18px'}}>Joint proof verified.</div>:null}
    {f>=3450&&f<4050?<div style={{position:'absolute',right:58,top:23,padding:'9px 14px',color:C.gold,background:C.ink,fontFamily:sans,fontSize:21}}>Codex · engine, proof checks, persistence, Twitch</div>:null}
    {f>=240&&f<4320&&caption&&!bridge&&!customAnnotation?<Caption text={caption} upper={['Q02','Q05'].includes(shot?.id||'')}/>:null}
    <Ending/>
    <AbsoluteFill style={{background:C.ink,opacity:progress(f,4481,4499)}}/>
    <Audio src={staticFile('trailer150/score.wav')}/>
  </AbsoluteFill>;
};
