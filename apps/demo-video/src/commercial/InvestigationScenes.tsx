import React from 'react';
import {AbsoluteFill,Img,Sequence,staticFile,useCurrentFrame} from 'remotion';
import {B,Browser,Desk,Head,Kicker,Screen,enter,move,type} from './Brand';

const room={x:44,y:132,w:1385,h:779};
const desk={x:1447,y:132,w:430,h:922};

export const TheCrew:React.FC=()=>{
  const f=useCurrentFrame();
  return <Desk light="left">
    <div style={{position:'absolute',left:96,top:51}}><Kicker>A Missing Manuscript</Kicker><Head at={4} size={67} style={{marginTop:12}}>Every detail. Every theory.</Head></div>
    <Sequence from={0} durationInFrames={75} premountFor={30} name="A clock found in the real room"><Screen file="find-clock" crop={room} style={{left:76,top:210,width:1328,height:747,border:`1px solid ${B.leather}`,borderRadius:5}}/></Sequence>
    <Sequence from={75} durationInFrames={75} premountFor={30} name="Find the key register"><Screen file="find-register" crop={room} style={{left:76,top:210,width:1328,height:747,border:`1px solid ${B.leather}`,borderRadius:5}}/></Sequence>
    <Sequence from={150} durationInFrames={60} premountFor={30} name="Quick finds in the sample"><Screen file="search-combo" crop={room} rate={2.7} style={{left:76,top:210,width:1328,height:747,border:`1px solid ${B.leather}`,borderRadius:5}}/></Sequence>
    <div style={{position:'absolute',left:1432,top:210,width:414,height:747,translate:`${80*(1-enter(f,8,33))}px 0`,opacity:enter(f,8,25),border:`1px solid ${B.brass}`,borderRadius:5,overflow:'hidden',boxShadow:'0 24px 55px #0008'}}>
      <Screen file="find-register" crop={{x:1447,y:132,w:430,h:777}} hold={4.7} style={{inset:0}}/>
    </div>
    <div style={{position:'absolute',left:1500,top:150,fontSize:15,letterSpacing:2,color:B.gold,opacity:enter(f,28,42)}}>THE SAMPLE CREW</div>
  </Desk>;
};

export const TheWrongLead:React.FC=()=>{
  const f=useCurrentFrame();
  return <Desk red>
    <Screen file="red-herring" crop={{x:75,y:185,w:650,h:690}} rate={1.0625} style={{left:0,top:0,width:1020,height:1080,opacity:.7}}/>
    <AbsoluteFill style={{background:'linear-gradient(90deg,#100d0a44,#100d0a00 35%,#100d0a 72%)'}}/>
    <div style={{position:'absolute',left:94,top:90,opacity:1-enter(f,96,113)}}><Kicker>The first theory</Kicker><Head at={8} size={91} style={{marginTop:20}}>Obviously<br/>the gardener.</Head></div>
    <div style={{position:'absolute',left:94,top:98,opacity:enter(f,107,126)}}><Kicker style={{color:B.rose}}>One small problem</Kicker><Head at={108} size={85} style={{marginTop:20}}>The window<br/>was dry.</Head></div>
    <Browser style={{left:1000,top:250,width:820,height:432,transform:`perspective(2400px) rotateY(${move(f,[0,34],[-7,0])}deg)`}}>
      <Sequence from={0} durationInFrames={138} premountFor={30} name="Test the weak mud record"><Screen file="red-herring" crop={{x:1455,y:428,w:414,h:202}} rate={1.0625} style={{inset:0}}/></Sequence>
      <Sequence from={138} durationInFrames={54} premountFor={30} name="Challenge with the actual window record"><Screen file="red-herring" start={6.3} crop={{x:1455,y:428,w:414,h:202}} style={{inset:0}}/></Sequence>
      <Sequence from={192} durationInFrames={48} premountFor={30} name="Hold the high-density native result"><Img src={staticFile('motion-ui/intruder-result.png')} style={{width:'100%',display:'block'}}/></Sequence>
    </Browser>
    <div style={{position:'absolute',left:95,top:600,width:600,opacity:enter(f,150,170),translate:`0 ${24*(1-enter(f,150,175))}px`}}>
      <Img src={staticFile('motion-ui/round.png')} style={{width:600,display:'block',boxShadow:'0 26px 60px #0009',rotate:'-3deg',borderRadius:3}}/>
      <div style={{fontSize:17,color:B.dim,marginTop:24}}>Actual clue record · ROUND_CHALK</div>
    </div>
  </Desk>;
};

export const TheConnection:React.FC=()=>{
  const f=useCurrentFrame();
  const lift=enter(f,5,32);
  return <Desk>
    <div style={{position:'absolute',left:100,top:72,opacity:1-enter(f,105,125)}}><Kicker>Make the connection</Kicker><Head at={3} size={82} style={{marginTop:15}}>Two clues. One broken alibi.</Head></div>
    <div style={{position:'absolute',inset:0,opacity:1-enter(f,100,125)}}>
      <svg width="1920" height="1080" style={{position:'absolute',inset:0}}><path d="M 695 558 C 870 750, 1020 270, 1220 508" fill="none" stroke={B.thread} strokeWidth={3} pathLength={1} strokeDasharray={1} strokeDashoffset={1-enter(f,52,98)}/><circle cx="695" cy="558" r="6" fill={B.gold} opacity={enter(f,45,55)}/><circle cx="1220" cy="508" r="6" fill={B.gold} opacity={enter(f,90,101)}/></svg>
      <Img src={staticFile('motion-ui/key.png')} style={{position:'absolute',left:215,top:350+40*(1-lift),width:520,rotate:`${-5+lift*2}deg`,opacity:lift,boxShadow:'0 30px 65px #000a',borderRadius:3}}/>
      <Img src={staticFile('motion-ui/clock.png')} style={{position:'absolute',left:1190,top:300+50*(1-enter(f,17,42)),width:520,rotate:`${5-enter(f,17,42)*3}deg`,opacity:enter(f,17,42),boxShadow:'0 30px 65px #000a',borderRadius:3}}/>
      <div style={{position:'absolute',left:215,top:720,fontFamily:type.mono,fontSize:21,color:B.dim,opacity:enter(f,48,64)}}>20:50–21:02</div>
      <div style={{position:'absolute',left:1200,top:670,fontFamily:type.mono,fontSize:21,color:B.dim,opacity:enter(f,65,81)}}>20:52</div>
    </div>
    <div style={{position:'absolute',inset:0,opacity:enter(f,105,125)}}>
      <div style={{position:'absolute',left:100,top:185,width:535}}><Kicker>A real connection</Kicker><Head at={115} size={79} style={{marginTop:19}}>The key<br/>was out.</Head><p style={{fontSize:27,lineHeight:1.5,color:B.dim,marginTop:28}}>Exactly when the<br/>clock stopped.</p></div>
      <Browser style={{left:760,top:143,width:1080,height:640}}><Sequence from={100} durationInFrames={200} premountFor={30} name="Select and link the actual clock and key"><Screen file="link" start={6} hold={3.9} style={{inset:0}}/></Sequence></Browser>
      <div style={{position:'absolute',left:761,top:820,fontSize:16,color:B.gold,letterSpacing:2,opacity:1-enter(f,205,220)}}>SELECT → LINK → PROOF</div>
      <Sequence from={215} durationInFrames={85} premountFor={30} name="High-density native linked deduction"><Img src={staticFile('motion-ui/deduction.png')} style={{position:'absolute',left:760,top:700,width:1000,opacity:enter(f,215,232),borderRadius:3,boxShadow:'0 20px 60px #000b'}}/></Sequence>
    </div>
  </Desk>;
};

export const TheOrder:React.FC=()=>{
  const f=useCurrentFrame();
  return <Desk light="left">
    <div style={{position:'absolute',left:100,top:118,width:750}}><Kicker>Put the night in order</Kicker><Head at={5} size={94} style={{marginTop:24}}>Wait.<br/>Before the alarm?</Head></div>
    <div style={{position:'absolute',left:107,top:570,width:750,opacity:enter(f,75,100)}}>
      <svg width="750" height="120"><path d="M 15 60 H 715" stroke={B.brass} strokeWidth={2} pathLength={1} strokeDasharray={1} strokeDashoffset={1-enter(f,72,115)}/><circle cx="20" cy="60" r="7" fill={B.gold}/><circle cx="710" cy="60" r="7" fill={B.gold} opacity={enter(f,110,125)}/></svg>
      <div style={{position:'absolute',left:0,top:0,fontFamily:type.mono,fontSize:37}}>20:52</div><div style={{position:'absolute',right:0,top:0,fontFamily:type.mono,fontSize:37}}>21:05</div>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:24,color:B.dim}}><span>The manuscript is taken</span><span>The alarm</span></div>
      <div style={{fontFamily:type.serif,fontSize:49,color:B.gold,marginTop:85,opacity:enter(f,228,250)}}>Thirteen minutes apart.</div>
    </div>
    <Browser style={{left:1080,top:64,width:650,height:936,transform:`perspective(2500px) rotateY(${move(f,[0,35],[-5,0])}deg)`}}>
      <Screen file="timeline-edit" crop={{x:1448,y:215,w:430,h:598}} hold={9.9} style={{inset:0}}/>
      <Sequence from={205} durationInFrames={95} premountFor={30} name="Hold the high-density accepted timeline"><Screen file="timeline-result" imagePath="motion-ui/timeline-result.png" crop={{x:1448,y:215,w:430,h:598}} style={{inset:0}}/></Sequence>
    </Browser>
  </Desk>;
};

export const TheChallenge:React.FC=()=>{
  const f=useCurrentFrame();
  return <Desk red>
    <Screen file="lie" crop={{x:925,y:290,w:500,h:625}} rate={1.25} hold={5.8} style={{left:970,top:0,width:864,height:1080,opacity:.56}}/>
    <AbsoluteFill style={{background:'linear-gradient(90deg,#100d0a 20%,transparent 70%)'}}/>
    <div style={{position:'absolute',left:100,top:100}}><Kicker>Question everything</Kicker><Head at={3} size={92} style={{marginTop:19}}>Challenge<br/>the alibi.</Head></div>
    <Browser style={{left:100,top:440,width:1080,height:505,translate:`0 ${30*(1-enter(f,8,30))}px`,opacity:enter(f,8,30)}}>
      <Screen file="lie" start={3.5} crop={{x:1463,y:247,w:397,h:174}} rate={1.1} hold={3} style={{inset:0}}/>
      <Sequence from={95} durationInFrames={85} premountFor={30} name="Hold the high-density disproven alibi"><Img src={staticFile('motion-ui/locked-result.png')} style={{width:'100%',display:'block'}}/></Sequence>
    </Browser>
  </Desk>;
};

export const TheVerdict:React.FC=()=>{
  const f=useCurrentFrame();
  return <Desk>
    <Screen file="verdict" rate={1.1} hold={4.9} style={{left:0,top:0,width:1920,height:1080}}/>
    <AbsoluteFill style={{background:'linear-gradient(#100d0ae6 0%,#100d0a00 28%,#100d0a00 84%,#100d0a 100%)'}}/>
    <Head at={6} size={66} style={{position:'absolute',left:90,top:54}}>Who’s your suspect?</Head>
    <div style={{position:'absolute',left:1255,top:210,width:500,height:630,border:`1px solid ${B.brass}`,borderRadius:4,overflow:'hidden',boxShadow:'0 30px 70px #0008',opacity:enter(f,13,30),translate:`${35*(1-enter(f,13,30))}px 0`}}>
      <Screen file="verdict" crop={{x:1447,y:197,w:430,h:542}} rate={1.1} hold={4.9} style={{inset:0}}/>
    </div>
  </Desk>;
};
