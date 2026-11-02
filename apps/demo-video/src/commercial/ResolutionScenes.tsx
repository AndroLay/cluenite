import React from 'react';
import {AbsoluteFill,Img,Sequence,staticFile,useCurrentFrame} from 'remotion';
import {B,Browser,Desk,Head,Kicker,Screen,enter,move,type} from './Brand';
import {BrassLens} from './BrassLens';

export const TheReconstruction:React.FC=()=>{
  const f=useCurrentFrame();
  return <Desk>
    <Sequence from={0} durationInFrames={30} premountFor={30} name="Ada is accused in the actual UI"><Screen file="reveal" style={{inset:0}}/></Sequence>
    <Sequence from={30} durationInFrames={360} premountFor={30} name="The native scene reconstructs the night">
      <Screen file="reveal" start={1} rate={19/12} crop={{x:44,y:270,w:1385,h:472}} style={{left:0,top:160,width:1920,height:654}}/>
      <AbsoluteFill style={{background:'linear-gradient(0deg,#100d0a 0%,#100d0a 18%,transparent 60%)'}}/>
      <div style={{position:'absolute',left:100,top:52}}><Kicker>Case closed</Kicker><Head at={0} size={70} style={{marginTop:15}}>The alarm was her alibi.</Head></div>
      <Screen file="reveal" start={1} rate={19/12} crop={{x:65,y:707,w:1130,h:185}} style={{left:100,top:730,width:1720,height:282,maskImage:'linear-gradient(0deg,transparent,black 3%,black 94%,transparent)'}}/>
    </Sequence>
    <Sequence from={390} durationInFrames={120} premountFor={30} name="Hold the actual coat-lining twist">
      <Screen file="coat-result" imagePath="motion-ui/coat-result.png" crop={{x:44,y:270,w:1385,h:640}} style={{left:0,top:0,width:1920,height:887}}/>
      <AbsoluteFill style={{background:'linear-gradient(0deg,#100d0a 0%,#100d0a 25%,transparent 64%),linear-gradient(#100d0a 0%,#100d0a44 16%,transparent 28%)'}}/>
      <div style={{position:'absolute',left:100,top:52}}><Kicker>Case closed</Kicker><Head at={0} size={70} style={{marginTop:15}}>The alarm was her alibi.</Head></div>
      <Screen file="coat-result" imagePath="motion-ui/coat-result.png" crop={{x:65,y:850,w:1000,h:45}} style={{left:100,top:815,width:1700,height:77}}/>
    </Sequence>
  </Desk>;
};

export const AnotherNight:React.FC=()=>{
  const f=useCurrentFrame();
  return <Desk light="left">
    <div style={{position:'absolute',left:95,top:80}}><Kicker>The next case is waiting</Kicker><Head at={5} size={82} style={{marginTop:18}}>Another night.<br/>Another mystery.</Head></div>
    <Sequence from={0} durationInFrames={80} premountFor={30} name="The actual case menu">
      <Browser style={{left:705,top:100,width:1160,height:685,transform:`perspective(2600px) rotateY(${move(f,[0,45],[-8,-3])}deg) rotateZ(1deg)`}}><Screen file="menu" style={{inset:0}}/></Browser>
    </Sequence>
    <Sequence from={80} durationInFrames={130} premountFor={30} name="Mystery Live visual preview">
      <Browser style={{left:move(f,[80,112],[770,675]),top:260,width:1190,height:703,transform:`perspective(2600px) rotateY(${move(f,[80,112],[8,-2])}deg) rotateZ(-1deg)`,opacity:enter(f,80,99)}}><Screen file="m01" hold={4.2} style={{inset:0}}/></Browser>
      <div style={{position:'absolute',left:96,top:630,width:470,fontSize:26,lineHeight:1.5,color:B.dim,opacity:enter(f,100,122)}}>A larger evidence board.<br/>A whole new set of suspects.</div>
    </Sequence>
  </Desk>;
};

export const FinalWord:React.FC=()=>{
  const f=useCurrentFrame();
  return <Desk>
    <div style={{position:'absolute',right:190,top:40,width:860,height:860,borderRadius:'50%',background:'radial-gradient(circle,#65432d55,transparent 70%)'}}/>
    <BrassLens outro/>
    <div style={{position:'absolute',left:130,top:255}}>
      <Kicker style={{opacity:enter(f,7,27)}}>The mystery is better together</Kicker>
      <Head at={10} size={150} style={{marginTop:20,letterSpacing:-4}}>Cluenite</Head>
      <div style={{width:570*enter(f,30,75),height:1,background:B.brass,marginTop:26}}/>
      <div style={{fontSize:31,lineHeight:1.45,color:B.dim,marginTop:34,opacity:enter(f,38,60)}}>Your chat.<br/>On the case.</div>
      <div style={{fontSize:17,letterSpacing:2,color:B.brass,marginTop:62,opacity:enter(f,70,90)}}>BUILT WITH CODEX</div>
    </div>
    <div style={{position:'absolute',left:130,bottom:65,color:B.dim,fontSize:16,opacity:enter(f,80,105)}}>Gameplay shown: local public sample · scripted viewers</div>
  </Desk>;
};
