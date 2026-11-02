import React from 'react';
import {AbsoluteFill,Audio,Easing,Img,OffthreadVideo,Sequence,interpolate,staticFile,useCurrentFrame} from 'remotion';
import capture from '../../public/motion-ui/manifest.json';

const C={paper:'#f7f3eb',ink:'#241b16',gold:'#ae8149',muted:'#887a69'};
const out=Easing.bezier(.19,1,.22,1);
const p=(f:number,frames:number[],values:number[])=>interpolate(f,frames,values,{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:out});
const reveal=(f:number,start:number,end:number)=>p(f,[start,end],[0,1]);
const FONT='Inter, sans-serif';

// One continuous staging path: the device remains recognizable through the
// zoom, native find, board cut and editorial lift of its real evidence cards.
const camera=(f:number)=>({
  x:p(f,[0,40,115,165,270,355],[850,790,790,230,230,950]),
  y:p(f,[0,40,115,165,270,355],[290,220,220,115,115,310]),
  width:p(f,[0,40,115,165,270,355],[1250,1080,1080,1460,1460,1000]),
  rx:p(f,[0,40,115,165,270,355],[12,5,5,0,0,5]),
  ry:p(f,[0,40,115,165,270,355],[-18,-10,-10,0,0,-12]),
  rz:p(f,[0,40,115,165,270,355],[5,1,1,0,0,3]),
});

const BrandMark:React.FC=()=> <div style={{width:112,height:112,borderRadius:27,background:'linear-gradient(145deg,#fffdf8,#ebe0ca)',border:'1px solid #fff',boxShadow:'0 13px 28px #533b2526,inset 0 1px 0 white',display:'grid',placeItems:'center'}}>
  <svg width="82" height="82" viewBox="0 0 82 82"><defs><linearGradient id="brass" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#d1ad70"/><stop offset="1" stopColor="#8e6335"/></linearGradient></defs><circle cx="33" cy="32" r="21" fill="#f8f4e9" stroke="url(#brass)" strokeWidth="7"/><path d="m49 48 21 22" stroke="url(#brass)" strokeWidth="9" strokeLinecap="round"/><path d="M19 29c1-8 7-13 14-13" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg>
</div>;

const Browser:React.FC=()=>{
  const f=useCurrentFrame();
  const a=camera(f);
  const h=a.width*1080/1920;
  const bar=a.width/32;
  const defocus=p(f,[300,355],[0,4]);
  return <div style={{position:'absolute',left:a.x,top:a.y,width:a.width,height:h+bar,opacity:reveal(f,0,22),transform:`perspective(2600px) rotateX(${a.rx}deg) rotateY(${a.ry}deg) rotateZ(${a.rz}deg)`,transformOrigin:'50% 50%',filter:`blur(${defocus}px)`,boxShadow:'0 54px 90px -24px #3e2b254a,0 13px 27px -5px #3e2b252d',borderRadius:18,background:'#201913',border:'2px solid #46382c',overflow:'hidden'}}>
    <div style={{height:bar,background:'linear-gradient(#372b23,#201a15)',display:'flex',alignItems:'center',padding:'0 18px',gap:8,borderBottom:'1px solid #725537'}}>
      {['#b68a69','#bba67a','#929a7c'].map(color=><span key={color} style={{width:8,height:8,borderRadius:8,background:color,opacity:.8}}/>)}
      <span style={{marginLeft:18,fontSize:a.width/91,color:'#c8b79f',fontFamily:FONT,letterSpacing:.3}}>Cluenite · A Missing Manuscript</span>
    </div>
    <div style={{position:'relative',height:h,overflow:'hidden'}}>
      <Img src={staticFile('motion-ui/room.png')} style={{width:'100%',height:'100%',display:'block'}}/>
      <Sequence from={144} durationInFrames={120} name="Actual canvas find">
        <OffthreadVideo src={staticFile('film/find-window.mp4')} muted style={{width:'100%',height:'100%'}}/>
      </Sequence>
      <AbsoluteFill style={{opacity:reveal(f,260,270)}}><Img src={staticFile('motion-ui/window-board.png')} style={{width:'100%',height:'100%'}}/></AbsoluteFill>
    </div>
    <div style={{position:'absolute',inset:0,borderRadius:17,border:'1px solid #ffffff17',pointerEvents:'none'}}/>
  </div>;
};

type Box={x:number;y:number;width:number;height:number};
const Evidence:React.FC<{name:'mud'|'round';launch:number;x:number;y:number;angle:number}>=({name,launch,x,y,angle})=>{
  const f=useCurrentFrame();
  const t=reveal(f,launch,launch+54);
  const a=camera(launch);
  const box=capture.boxes[name] as Box;
  const sourceX=a.x+box.x*a.width/1920;
  const sourceY=a.y+a.width/32+box.y*a.width/1920;
  const sourceW=box.width*a.width/1920;
  const width=sourceW+(430-sourceW)*t;
  const lift=Math.sin(Math.PI*t)*-45;
  return <div style={{position:'absolute',left:sourceX+(x-sourceX)*t,top:sourceY+(y-sourceY)*t+lift,width,opacity:reveal(f,launch,launch+5),transform:`perspective(1600px) translateZ(${45*t}px) rotateY(${-3*t}deg) rotateZ(${angle*t}deg)`,transformOrigin:'50% 50%',borderRadius:10,overflow:'hidden',boxShadow:`0 ${7+24*t}px ${15+44*t}px #473124${t>.4?'35':'12'},0 2px 3px #47312418`}}>
    <Img src={staticFile('motion-ui/'+name+'.png')} style={{width:'100%',display:'block'}}/>
  </div>;
};

export const MotionStudy:React.FC=()=>{
  const f=useCurrentFrame();
  const brandIn=reveal(f,24,58);
  const brandOut=1-reveal(f,115,144);
  return <AbsoluteFill style={{background:C.paper,color:C.ink,fontFamily:FONT,overflow:'hidden'}}>
    <AbsoluteFill style={{background:'radial-gradient(ellipse at 70% 35%,#fffefa 0%,#f7f3eb 52%,#e7ddcc 120%)'}}/>
    <div style={{position:'absolute',left:850,top:865,width:960,height:100,borderRadius:'50%',background:'#826448',opacity:.13,filter:'blur(55px)',transform:'rotate(-4deg)'}}/>
    <Browser/>
    <div style={{position:'absolute',left:110,top:326,opacity:brandIn*brandOut,transform:`translateX(${(1-brandIn)*-55-(1-brandOut)*40}px)`,filter:`blur(${(1-brandOut)*8}px)`}}>
      <div style={{display:'flex',gap:27,alignItems:'center'}}><BrandMark/><div><div style={{fontSize:17,fontWeight:600,letterSpacing:3.5,color:C.gold,marginBottom:4}}>TWITCH MYSTERIES</div><div style={{fontFamily:'"EB Garamond", Georgia, serif',fontSize:110,lineHeight:1,letterSpacing:-3}}>Cluenite</div></div></div>
      <div style={{fontSize:28,lineHeight:1.4,marginTop:31,marginLeft:140,color:C.muted,opacity:reveal(f,62,87)}}>Make downtime<br/>a whodunit.</div>
    </div>
    <div style={{position:'absolute',left:110,top:49,fontSize:43,fontWeight:600,letterSpacing:-1.5,opacity:reveal(f,155,177)*(1-reveal(f,252,270)),transform:`translateY(${16*(1-reveal(f,155,177))}px)`}}>Spot something?</div>
    <div style={{position:'absolute',left:110,top:306,width:470,opacity:reveal(f,287,312),transform:`translateY(${24*(1-reveal(f,287,312))}px)`}}>
      <div style={{fontSize:16,letterSpacing:3,fontWeight:600,color:C.gold}}>THE CHAT HAS A THEORY</div>
      <div style={{fontSize:83,letterSpacing:-4,lineHeight:1.06,fontWeight:600,marginTop:25,opacity:1-reveal(f,346,362)}}>Nice<br/>theory.</div>
      <div style={{position:'absolute',left:0,top:43,fontSize:83,letterSpacing:-4,lineHeight:1.06,fontWeight:600,opacity:reveal(f,358,380),transform:`translateY(${14*(1-reveal(f,358,380))}px)`}}>Now<br/>prove it.</div>
    </div>
    <Evidence name="mud" launch={274} x={655} y={300} angle={-6}/>
    <Evidence name="round" launch={299} x={1140} y={400} angle={4}/>
    <div style={{position:'absolute',left:110,bottom:42,fontSize:17,color:C.muted,letterSpacing:.5}}>Local browser sample · scripted viewers</div>
    <div style={{position:'absolute',right:80,bottom:42,fontSize:14,color:C.muted,letterSpacing:2}}>CLUENITE / MOTION STUDY</div>
    <Audio src={staticFile('film/score.wav')} volume={frame=>.86*(1-reveal(frame,432,449))}/>
  </AbsoluteFill>;
};
