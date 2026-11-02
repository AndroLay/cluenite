import React from 'react';
import {AbsoluteFill,Audio,Img,Sequence,interpolate,staticFile,useCurrentFrame} from 'remotion';
import {B,Desk,Kicker,type,enter} from '../commercial/Brand';
import proof from './proof.generated.json';
import {Guide} from './Guide';

const Stamp:React.FC<{children:React.ReactNode}>=({children})=><div style={{position:'absolute',left:92,bottom:34,fontFamily:type.sans,fontSize:18,color:B.dim,letterSpacing:.2}}>{children}</div>;
const Obs:React.FC<{reveal?:boolean;style?:React.CSSProperties}>=({reveal=false,style})=>{
  const crop=reveal?{x:24,y:308,w:540,h:388}:{x:24,y:492,w:540,h:204};
  return <div style={{position:'absolute',overflow:'hidden',border:`1px solid ${B.brass}`,background:B.ink,...style}}><Img src={staticFile(`submission/${reveal?'reveal':'first-proof'}.png`)} style={{position:'absolute',maxWidth:'none',width:`${1280/crop.w*100}%`,height:`${720/crop.h*100}%`,left:`${-crop.x/crop.w*100}%`,top:`${-crop.y/crop.h*100}%`}}/></div>;
};

export const SubmissionOpening:React.FC=()=>{
  const f=useCurrentFrame();
  const titleIn=enter(f,91,111);
  return <Desk light="left">
    <div style={{position:'absolute',left:92,top:65,display:'flex',alignItems:'center',gap:32}}><span style={{fontFamily:type.serif,fontSize:38,color:B.paper}}>Cluenite</span><Kicker>For streamers and their communities</Kicker></div>
    <div style={{position:'absolute',left:92,right:92,top:135,height:1,background:B.walnut}}/>
    <div style={{position:'absolute',left:92,top:205,width:730,opacity:1-titleIn,translate:`0 ${-18*titleIn}px`}}>
      <div style={{fontFamily:type.serif,fontSize:112,lineHeight:1.02,letterSpacing:-2}}>What if chat<br/>could solve it?</div>
      <div style={{marginTop:32,fontSize:30,lineHeight:1.4,color:B.dim,maxWidth:600}}>Turn a break in your stream<br/>into a shared investigation.</div>
    </div>
    <div style={{position:'absolute',left:92,top:211,width:700,opacity:titleIn,translate:`0 ${24*(1-titleIn)}px`}}>
      <Kicker>A Twitch-native mystery game</Kicker>
      <div style={{fontFamily:type.serif,fontSize:157,lineHeight:1,marginTop:18,letterSpacing:-3}}>Cluenite</div>
      <div style={{fontSize:34,lineHeight:1.4,color:B.paper,marginTop:30}}>Chat finds the clues.<br/>Evidence decides the ending.</div>
    </div>
    <Obs style={{left:870,top:260,width:958,height:362,opacity:enter(f,10,30),translate:`${40*(1-enter(f,10,38))}px 0`,boxShadow:'0 28px 70px #0008'}}/>
    <div style={{position:'absolute',left:888,top:654,fontSize:23,color:B.dim,fontFamily:type.sans}}>A viewer's observation becomes case evidence.</div>
    <div style={{position:'absolute',left:92,top:791,right:92,borderTop:`1px solid ${B.walnut}`,paddingTop:25,display:'flex',justifyContent:'space-between',fontSize:22,color:B.gold}}><span>Quick Case</span><span>Mystery Live</span><span>Co-op Mystery</span></div>
    <Stamp>Content review · actual OBS still from 2 November 2026 · fresh continuous take pending</Stamp>
  </Desk>;
};

const Code:React.FC<{path:string;code:string;highlight?:number[];style?:React.CSSProperties}>=({path,code,highlight=[],style})=><div style={{position:'absolute',background:'#17120eea',border:`1px solid ${B.walnut}`,borderRadius:5,overflow:'hidden',...style}}>
  <div style={{height:50,display:'flex',alignItems:'center',padding:'0 24px',borderBottom:`1px solid ${B.walnut}`,fontFamily:type.mono,fontSize:18,color:B.gold}}>{path}</div>
  <div style={{padding:'22px 0',fontSize:23,lineHeight:1.52,fontFamily:type.mono,color:B.paper}}>{code.split('\n').map((line,i)=><div key={i} style={{padding:'0 24px',whiteSpace:'pre',background:highlight.includes(i)?'#a77a4827':'transparent',borderLeft:`3px solid ${highlight.includes(i)?B.gold:'transparent'}`}}>{line||' '}</div>)}</div>
</div>;

const Phase:React.FC<{n:string;title:string;body:string}>=({n,title,body})=><div style={{position:'absolute',left:92,top:235,width:490}}><Kicker>{n} · Built with OpenAI Codex</Kicker><div style={{fontFamily:type.serif,fontSize:80,lineHeight:1.05,marginTop:24,letterSpacing:-1}}>{title}</div><div style={{marginTop:27,fontSize:28,lineHeight:1.5,color:B.dim}}>{body}</div></div>;

export const SubmissionBuild:React.FC=()=>{
  const f=useCurrentFrame();
  return <Desk>
    <div style={{position:'absolute',left:92,top:65,fontFamily:type.serif,fontSize:54}}>How Cluenite was built</div>
    <div style={{position:'absolute',left:92,right:92,top:146,height:1,background:B.walnut}}/>
    <Sequence from={0} durationInFrames={180} premountFor={30} name="Authored case rules">
      <Phase n="01" title="Start with the rules." body="Define what a clue proves, what must connect, and when an answer is earned."/>
      <Code path={proof.caseRules.path} code={proof.caseRules.code.split('\n').slice(0,16).join('\n')} highlight={[1,2,5,6]} style={{left:650,top:207,width:1178,maxHeight:665}}/>
    </Sequence>
    <Sequence from={180} durationInFrames={180} premountFor={30} name="Actual engine proof guard">
      <Phase n="02" title="Build the proof engine." body="The actual verdict guard rejects a solution while required proof is missing."/>
      <Code path={proof.engine.path} code={proof.engine.code.split('\n').slice(0,13).join('\n')} highlight={[0,1,5,6]} style={{left:650,top:207,width:1178}}/>
    </Sequence>
    <Sequence from={360} durationInFrames={135} premountFor={30} name="Actual EventSub adapter">
      <Phase n="03" title="Connect Twitch." body="Normalize a chat notification, validate its origin, then pass the action to the server."/>
      <Code path={proof.eventSub.path} code={proof.eventSub.code.split('\n').slice(0,16).join('\n')} highlight={[4,12,13]} style={{left:650,top:207,width:1178}}/>
    </Sequence>
    <Sequence from={495} durationInFrames={105} premountFor={30} name="Actual local engine test result">
      <Phase n="04" title="Test the deductions." body="Accepted and rejected actions are checked against the authored cases."/>
      <div style={{position:'absolute',left:680,top:220,width:1100}}><div style={{fontFamily:type.serif,fontSize:180,color:B.gold,lineHeight:1}}>{proof.tests.passed}<span style={{fontSize:70,color:B.dim}}> / {proof.tests.total}</span></div><div style={{fontSize:35,marginTop:10}}>Engine tests passed</div><div style={{fontFamily:type.mono,fontSize:21,color:B.dim,marginTop:28,lineHeight:1.7}}>Q01 · proof before verdict<br/>M01 · timeline and contradiction<br/>C01 · complementary station proof</div><div style={{fontSize:19,color:B.dim,marginTop:35}}>Actual local test run · {proof.tests.date}</div></div>
    </Sequence>
    <Sequence from={600} durationInFrames={90} premountFor={30} name="Actual OBS outcome">
      <Phase n="05" title="Verify the real result." body="The server verifies the evidence. The overlay presents the result."/>
      <Obs reveal style={{left:820,top:198,width:920,height:661}}/>
    </Sequence>
    <div style={{position:'absolute',left:92,right:92,top:159,display:'flex',gap:0,alignItems:'center',fontFamily:type.sans,fontSize:17,color:B.dim}}>{['Authored case','Proof engine','Twitch EventSub','OBS overlay'].map((text,i)=><React.Fragment key={text}><span style={{padding:'6px 15px',border:`1px solid ${B.walnut}`,color:(f<180?0:f<360?1:f<495?2:3)===i?B.gold:B.dim}}>{text}</span>{i<3?<span style={{padding:'0 20px',color:B.brass}}>→</span>:null}</React.Fragment>)}</div>
    <Stamp>{f<600?'Content review · actual repository source and dated local engine result':'Content review · actual OBS still · 2 November 2026'}</Stamp>
  </Desk>;
};

// This review joins two non-contiguous sections of the 175-second script.
// It must never be represented as the complete submission film.
export const SubmissionContentReview:React.FC=()=>{
  const f=useCurrentFrame();
  return <AbsoluteFill style={{background:B.ink}}>
    <Sequence from={0} durationInFrames={360} premountFor={30} name="S1 · 00:00–00:12"><SubmissionOpening/></Sequence>
    <Sequence from={360} durationInFrames={690} premountFor={30} name="S7 · 02:17–02:40"><SubmissionBuild/></Sequence>
    <Sequence from={0} durationInFrames={360} premountFor={30} name="Opening narration guide"><Guide id="S1"/></Sequence>
    <Sequence from={360} durationInFrames={690} premountFor={30} name="Build narration guide"><Guide id="S7"/></Sequence>
    <Audio src={staticFile('commercial/score.wav')} volume={.1}/>
    <AbsoluteFill style={{pointerEvents:'none',background:B.ink,opacity:interpolate(f,[0,8,1040,1049],[1,0,0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})}}/>
  </AbsoluteFill>;
};
