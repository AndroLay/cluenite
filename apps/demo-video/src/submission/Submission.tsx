import React from 'react';
import {AbsoluteFill,OffthreadVideo,Sequence,staticFile} from 'remotion';
import {B,Desk,Kicker,type} from '../commercial/Brand';
import {SubmissionBuild,SubmissionOpening} from './ContentReview';
import media from './media.json';
import script from './script.json';

const Capture:React.FC<{id:'S2'|'S3'|'S4'|'S5'|'S6'}>=({id})=>{
  const shot=media[id];
  const segment=script.segments.find(s=>s.id===id)!;
  if(shot.file)return <AbsoluteFill><OffthreadVideo src={staticFile(shot.file)} muted style={{width:'100%',height:'100%',objectFit:'contain'}}/><div style={{position:'absolute',left:60,bottom:30,padding:'10px 16px',background:B.ink,color:B.paper,fontFamily:type.sans,fontSize:20}}>Local signed-out interface · 390 and 1280 px</div></AbsoluteFill>;
  return <Desk><div style={{position:'absolute',left:100,right:100,top:210}}><Kicker>{id} · Required real recording pending</Kicker><div style={{fontFamily:type.serif,fontSize:85,marginTop:27}}>{segment.title}</div><div style={{fontSize:30,color:B.dim,marginTop:35,maxWidth:1390,lineHeight:1.5}}>{shot.description}</div><div style={{fontSize:25,color:B.rose,marginTop:54}}>This is a capture placeholder, not a gameplay demonstration.</div></div></Desk>;
};

const Close:React.FC=()=> <Desk><div style={{position:'absolute',left:100,top:180}}><Kicker>A Twitch-native mystery game</Kicker><div style={{fontFamily:type.serif,fontSize:170,marginTop:35,lineHeight:1}}>Cluenite</div><div style={{fontSize:44,lineHeight:1.4,marginTop:30}}>Built for streamers.<br/>Solved together.</div><div style={{fontSize:23,color:B.dim,marginTop:60}}>The actual Q01 reveal take belongs here before final delivery.</div></div></Desk>;

// Exact original S1–S8 boundaries. Export is gated until mandatory captures exist.
export const Submission:React.FC=()=> <AbsoluteFill style={{background:B.ink}}>
  <Sequence from={0} durationInFrames={360} premountFor={30} name="S1 · What is Cluenite?"><SubmissionOpening/></Sequence>
  <Sequence from={360} durationInFrames={690} premountFor={30} name="S2 · Twitch evidence"><Capture id="S2"/></Sequence>
  <Sequence from={1050} durationInFrames={510} premountFor={30} name="S3 · Link and verdict"><Capture id="S3"/></Sequence>
  <Sequence from={1560} durationInFrames={840} premountFor={30} name="S4 · Dashboard and M01"><Capture id="S4"/></Sequence>
  <Sequence from={2400} durationInFrames={750} premountFor={30} name="S5 · Timeline and theory"><Capture id="S5"/></Sequence>
  <Sequence from={3150} durationInFrames={960} premountFor={30} name="S6 · Verified fallback"><Capture id="S6"/></Sequence>
  <Sequence from={4110} durationInFrames={690} premountFor={30} name="S7 · How Codex helped build Cluenite"><SubmissionBuild/></Sequence>
  <Sequence from={4800} durationInFrames={450} premountFor={30} name="S8 · Close on the answer"><Close/></Sequence>
  <div style={{position:'absolute',right:55,top:25,padding:'9px 15px',background:B.ink,border:`1px solid ${B.brass}`,color:B.gold,fontFamily:type.sans,fontSize:19}}>2:55 CONTENT DRAFT · REQUIRED CAPTURES PENDING</div>
</AbsoluteFill>;
