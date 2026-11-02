import React from 'react';
import {AbsoluteFill,Img,Sequence,staticFile,useCurrentFrame} from 'remotion';
import {Audio,Video} from '@remotion/media';
import {TransitionSeries} from '@remotion/transitions';
import {C,progress,sans,serif} from '../trailer150/Motion';
import source from './media.json';

type Segment={id:string;label:string;seconds:number;src:string|null;inPoint:number};
const live=source.live.segments as Segment[];
const Label:React.FC<{children:React.ReactNode}>=({children})=><div style={{position:'absolute',left:72,right:72,bottom:21,height:39,display:'flex',alignItems:'center',justifyContent:'space-between',fontFamily:sans,fontSize:23,color:C.dim,background:C.ink,padding:'7px 12px'}}><span>{children}</span><span style={{fontFamily:serif,fontSize:29,color:C.gold}}>Cluenite</span></div>;
const Kicker:React.FC<{children:React.ReactNode}>=({children})=><div style={{fontFamily:sans,fontSize:23,letterSpacing:3,color:C.gold,textTransform:'uppercase'}}>{children}</div>;
const Body:React.FC<{children:React.ReactNode;style?:React.CSSProperties}>=({children,style})=><div style={{fontFamily:sans,fontSize:31,lineHeight:1.5,color:C.dim,...style}}>{children}</div>;

const Study:React.FC<{style?:React.CSSProperties}>=({style})=><div style={{position:'absolute',overflow:'hidden',...style}}><Img src={staticFile('motion-ui/room.png')} style={{position:'absolute',width:'138.63%',height:'138.64%',left:'-3.18%',top:'-16.94%',maxWidth:'none'}}/></div>;

const Hook:React.FC=()=>{
 const f=useCurrentFrame();
 return <AbsoluteFill style={{background:C.ink}}>
  <Sequence durationInFrames={108} name="The real practice study">
   <Study style={{inset:0,scale:1+.025*progress(f,0,108),transformOrigin:'25% 45%'}}/>
   <AbsoluteFill style={{background:'linear-gradient(90deg,transparent 18%,#100d0a55 48%,#100d0aee 79%)'}}/>
   <div style={{position:'absolute',left:1130,top:210,width:710}}><Kicker>A Missing Manuscript</Kicker><div style={{fontFamily:serif,fontSize:94,lineHeight:1.03,color:C.paper,marginTop:35}}>One missing<br/>manuscript.<br/>Everyone has<br/>a theory.</div></div>
  </Sequence>
  <Sequence from={108} durationInFrames={120} premountFor={30} name="A real object is found">
   <Video src={staticFile('motion-ui/window-find.mp4')} muted style={{position:'absolute',width:1920,height:1080}}/>
   <div style={{position:'absolute',left:0,right:0,top:0,height:138,background:C.ink}}><div style={{position:'absolute',left:68,top:26,fontFamily:serif,fontSize:64,color:C.paper}}>Look closer.</div></div>
  </Sequence>
  <Sequence from={228} durationInFrames={12} premountFor={15}><Img src={staticFile('motion-ui/window-board.png')} style={{width:1920,height:1080}}/></Sequence>
  <Label>Practice Case · Scripted chat · Local browser</Label>
 </AbsoluteFill>;
};

const Explain:React.FC=()=>{
 const f=useCurrentFrame();
 const p=progress(f,0,28);
 return <AbsoluteFill style={{background:C.ink}}>
  <div style={{position:'absolute',left:720-30*p,top:130,width:1160,height:825,overflow:'hidden',borderLeft:`2px solid ${C.brass}`}}>
   <Img src={staticFile('motion-ui/room.png')} style={{position:'absolute',width:1467,height:825,maxWidth:'none',left:-305,top:0}}/>
   <div style={{position:'absolute',left:0,right:0,top:0,height:112,background:C.ink,padding:'36px 32px',fontSize:28,color:C.gold}}>Practice Case / A Missing Manuscript</div>
  </div>
  <div style={{position:'absolute',inset:0,background:'linear-gradient(90deg,#100d0a 27%,#100d0a77 47%,transparent 67%)'}}/>
  <div style={{position:'absolute',left:88,top:185,width:620}}><Kicker>Cluenite</Kicker><div style={{fontFamily:serif,fontSize:100,lineHeight:.98,color:C.paper,marginTop:28,translate:`0 ${16*(1-p)}px`}}>Your viewers.<br/>On the case.</div><Body style={{marginTop:36,width:560}}>A mystery game for streamers<br/>and their Twitch chat.</Body><div style={{fontFamily:serif,fontSize:37,color:C.gold,marginTop:49}}>Search. Connect. Reconstruct. Solve.</div></div>
  <Label>Practice demonstration · Scripted chat, not Twitch</Label>
 </AbsoluteFill>;
};

const Practice:React.FC=()=>{
 const f=useCurrentFrame();
 return <AbsoluteFill>
 <Video src={staticFile(source.practice.src)} muted style={{width:1920,height:1080}}/>
 {f>=1230&&f<1380?<div style={{position:'absolute',left:0,top:0,width:1180,height:132,background:C.ink}}><div style={{position:'absolute',left:90,top:43,fontFamily:serif,fontSize:66,color:C.paper}}>Who’s your suspect?</div></div>:null}
 <div style={{position:'absolute',left:0,right:0,bottom:0,height:78,background:C.ink}}/>
 <Label>Practice Case · Scripted chat · Edited playthrough</Label>
</AbsoluteFill>;
};

const Modes:React.FC=()=>{
 const f=useCurrentFrame();
 const active=Math.min(2,Math.floor(f/100));
 const names=['Quick Case','Mystery Live','Co-op'];
 const descriptions=['Short cases. Fast deductions.','Explore, connect and rebuild the timeline.','Two stations. One shared conclusion.'];
 return <AbsoluteFill style={{background:C.ink}}>
  <div style={{position:'absolute',left:90,top:66}}><Kicker>Choose your next investigation</Kicker><div style={{fontFamily:serif,fontSize:69,color:C.paper,marginTop:16}}>Different cases. The same search for truth.</div></div>
  <div style={{position:'absolute',left:90,top:245,width:1740,height:695,overflow:'hidden'}}>
   <Img src={staticFile('practice165/mode-selection.png')} style={{position:'absolute',maxWidth:'none',width:'154.84%',height:'218.18%',left:'-27.42%',top:'-118.18%'}}/>
   {[0,1,2].map(i=><div key={i} style={{position:'absolute',left:i*580,top:142,width:570,height:504,border:`${active===i?2:0}px solid ${C.brass}`,background:active===i?'transparent':'#100d0a5a'}}/>)}
  </div>
  <div style={{position:'absolute',left:100,right:100,bottom:87,textAlign:'center',fontSize:30,color:C.paper}}><span style={{color:C.gold}}>{names[active]}</span> — {descriptions[active]}</div>
  <Label>Actual mode selection · Practice is available without Twitch</Label>
 </AbsoluteFill>;
};

const EmptyLive:React.FC<{segment:Segment;index:number}>=({segment,index})=> <AbsoluteFill style={{background:C.ink,color:C.paper}}>
 <div style={{position:'absolute',left:95,top:100}}><Kicker>Reserved live playthrough · 40 seconds</Kicker><div style={{fontFamily:serif,fontSize:83,marginTop:25}}>One round. From chat to conclusion.</div></div>
 <div style={{position:'absolute',left:95,top:320,width:1730,height:470,border:`1px solid ${C.walnut}`,background:C.espresso,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column'}}>
  <div style={{fontFamily:serif,fontSize:64,color:C.gold}}>Real Twitch + gameplay footage pending</div>
  <Body style={{marginTop:28,textAlign:'center'}}>This slot is intentionally empty until the final gameplay is ready.<br/>No Practice Case footage is presented as live Twitch.</Body>
 </div>
 <div style={{position:'absolute',left:110,right:110,top:850,display:'flex',justifyContent:'space-between'}}>{live.map((s,i)=><div key={s.id} style={{width:315,borderTop:`2px solid ${i===index?C.gold:C.walnut}`,paddingTop:18,fontSize:26,color:i===index?C.gold:C.dim}}>{String(i+1).padStart(2,'0')} / {s.label}</div>)}</div>
 <Label>Template preview · No live footage shown · {segment.label}</Label>
</AbsoluteFill>;

const Live:React.FC=()=>{
 let start=0;
 return <AbsoluteFill>{live.map((segment,index)=>{
  const from=start;start+=segment.seconds*30;
  return <Sequence key={segment.id} from={from} durationInFrames={segment.seconds*30} premountFor={30} name={`Real playthrough / ${segment.id}`}>
   {segment.src?<><Video src={staticFile(segment.src)} trimBefore={Math.round(segment.inPoint*30)} style={{width:1920,height:1080}}/><Label>Recorded Twitch + gameplay · One round · Edited chronologically</Label></>:<EmptyLive segment={segment} index={index}/>}
  </Sequence>;
 })}</AbsoluteFill>;
};

const Development:React.FC=()=>{
 const f=useCurrentFrame();
 const copy=f<169?'We used Codex to turn case rules into a deterministic engine.':f<332?'A correct guess still needs the required evidence.':f<496?'EventSub validates Twitch input before it reaches the live round.':f<600?'Running the actual evidence-engine tests.':'10 engine tests passed across 3 files.';
 return <AbsoluteFill style={{background:C.ink}}>
  <Video src={staticFile(source.development.src)} muted style={{width:1920,height:1080}}/>
  <div style={{position:'absolute',left:0,right:0,top:0,height:110,background:C.ink,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 70px',borderBottom:`1px solid ${C.walnut}`}}><span style={{fontFamily:serif,fontSize:57,color:C.paper}}>Built with OpenAI Codex</span><span style={{fontSize:23,color:C.gold}}>Rules → validation → Twitch → tests</span></div>
  <div style={{position:'absolute',left:0,right:0,bottom:0,height:132,background:C.ink,borderTop:`1px solid ${C.walnut}`}}><div style={{fontSize:35,lineHeight:1.3,color:C.paper,textAlign:'center',marginTop:18}}>{copy}</div></div>
  <Label>Actual source + test recording · Codex session UI is not shown</Label>
 </AbsoluteFill>;
};

const Ending:React.FC=()=>{
 const f=useCurrentFrame();
 return <AbsoluteFill style={{background:C.ink,color:C.paper}}>
  <Img src={staticFile('motion-ui/coat-result.png')} style={{position:'absolute',width:1920,height:1080,opacity:.19*(1-progress(f,0,100)),scale:1+.015*progress(f,0,110)}}/>
  <AbsoluteFill style={{alignItems:'center',justifyContent:'center'}}><div style={{fontFamily:serif,fontSize:145,letterSpacing:7,translate:`0 ${12*(1-progress(f,0,26))}px`}}>CLUENITE</div><div style={{width:120*progress(f,12,52),height:2,background:C.brass,marginTop:22}}/><div style={{fontFamily:serif,fontSize:45,color:C.gold,marginTop:39}}>Every clue brings us closer to the truth.</div></AbsoluteFill>
  <AbsoluteFill style={{background:C.ink,opacity:progress(f,270,299)}}/>
 </AbsoluteFill>;
};

const PracticeHandoff:React.FC=()=>{
 const f=useCurrentFrame();const p=progress(f,0,23);
 return <AbsoluteFill style={{pointerEvents:'none'}}>
  <div style={{position:'absolute',inset:0,clipPath:`inset(0 ${p*100}% 0 0)`}}><Img src={staticFile('practice165/practice-out.png')} style={{width:1920,height:1080,translate:`${-42*p}px 0`}}/><div style={{position:'absolute',left:0,right:0,bottom:0,height:78,background:C.ink}}/><Label>Practice Case · Scripted chat · Edited playthrough</Label></div>
  <div style={{position:'absolute',left:1920*(1-p),top:0,bottom:0,width:2,background:C.brass}}/>
 </AbsoluteFill>;
};

// Chapter joins keep the exact 165-second contract. The 63-second Practice
// edit retains the reference's genuine UI crops and specific evidence motion.
export const Practice165:React.FC=()=> <AbsoluteFill style={{background:C.ink,fontFamily:sans}}>
 <TransitionSeries>
  <TransitionSeries.Sequence durationInFrames={240} premountFor={30} name="01 / Practice hook"><Hook/></TransitionSeries.Sequence>
  <TransitionSeries.Sequence durationInFrames={210} premountFor={30} name="02 / What is Cluenite"><Explain/></TransitionSeries.Sequence>
  <TransitionSeries.Sequence durationInFrames={1890} premountFor={30} name="03 / Complete Practice Case"><Practice/></TransitionSeries.Sequence>
  <TransitionSeries.Overlay durationInFrames={24} premountFor={30}><PracticeHandoff/></TransitionSeries.Overlay>
  <TransitionSeries.Sequence durationInFrames={300} premountFor={30} name="04 / Quick Case, Mystery Live, Co-op"><Modes/></TransitionSeries.Sequence>
  <TransitionSeries.Sequence durationInFrames={1200} premountFor={30} name="05 / Real Twitch playthrough - media pending"><Live/></TransitionSeries.Sequence>
  <TransitionSeries.Sequence durationInFrames={810} premountFor={30} name="06 / Codex built the system"><Development/></TransitionSeries.Sequence>
  <TransitionSeries.Sequence durationInFrames={300} premountFor={30} name="07 / Cluenite"><Ending/></TransitionSeries.Sequence>
 </TransitionSeries>
 <Audio src={staticFile('practice165/score.wav')} volume={f=>f>=2640&&f<3840&&live.every(s=>s.src) ? 0.18 : 1}/>
</AbsoluteFill>;
