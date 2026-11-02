import React from 'react';
import {AbsoluteFill,Audio,Easing,Img,OffthreadVideo,Sequence,interpolate,interpolateColors,staticFile,useCurrentFrame} from 'remotion';
import {Magnifier} from './Magnifier';

const curve=Easing.bezier(.2,.9,.2,1);
const p=(f:number,t:number[],v:number[])=>interpolate(f,t,v,{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:curve});
const n=(f:number,a:number,b:number)=>p(f,[a,b],[0,1]);

const Product:React.FC=()=>{
  const f=useCurrentFrame();
  const width=p(f,[0,95,130,169,260,330],[1220,1060,1060,1440,1440,1200]);
  const height=width*1080/1920,bar=width/32;
  const x=p(f,[0,95,130,169,260,330],[880,830,830,240,240,700]);
  const y=p(f,[0,95,130,169,260,330],[220,230,230,145,145,250]);
  const rx=p(f,[0,95,169,330],[9,3,0,3]),ry=p(f,[0,95,169,330],[-17,-8,0,-6]);
  return <div style={{position:'absolute',left:x,top:y,width,height:height+bar,opacity:p(f,[0,45,95],[.16,.36,1]),transform:`perspective(2800px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${p(f,[0,95,169,330],[3,-1,0,1])}deg)`,borderRadius:18,border:'2px solid #3c372e',overflow:'hidden',background:'#191e1d',boxShadow:'0 46px 70px -22px #001a244d,0 12px 24px #001a2426'}}>
    <div style={{height:bar,background:'linear-gradient(#344043,#17272c)',display:'flex',alignItems:'center',gap:8,paddingLeft:19,borderBottom:'1px solid #a080514d'}}>{['#b8996e','#9d997c','#74988c'].map(c=><span key={c} style={{width:8,height:8,borderRadius:8,background:c}}/>)}<span style={{fontSize:width/91,color:'#d2d9d3',marginLeft:18}}>Cluenite</span></div>
    <div style={{position:'relative',height}}>
      <Img src={staticFile('motion-ui/room.png')} style={{width:'100%',height:'100%',display:'block'}}/>
      <Sequence from={144} durationInFrames={120} name="Actual current-build canvas find"><OffthreadVideo src={staticFile('motion-ui/window-find.mp4')} muted style={{width:'100%',height:'100%'}}/></Sequence>
      <AbsoluteFill style={{opacity:n(f,259,270)}}><Img src={staticFile('motion-ui/window-board.png')} style={{width:'100%',height:'100%'}}/></AbsoluteFill>
    </div>
  </div>;
};

export const OpticalStudy:React.FC=()=>{
  const f=useCurrentFrame();
  const dawn=n(f,55,115);
  const ink=interpolateColors(dawn,[0,1],['#e6f2ea','#193438']);
  return <AbsoluteFill style={{background:'#071e27',fontFamily:'Inter, sans-serif',overflow:'hidden'}}>
    <AbsoluteFill style={{background:'radial-gradient(ellipse at 75% 35%,#11505a 0%,#092c37 45%,#04141c 100%)'}}/>
    <div style={{position:'absolute',left:740,top:-500,width:500,height:1800,transform:'rotate(34deg)',background:'linear-gradient(90deg,transparent,#ffe1a610,transparent)',filter:'blur(65px)',opacity:1-dawn}}/>
    {Array.from({length:14},(_,i)=>{const depth=(i%4+1)/4;return <div key={i} style={{position:'absolute',left:(i*277+130)%1900-f*.23*depth,top:(i*193+75)%940-f*.1*depth,width:5+depth*12,height:5+depth*12,borderRadius:'50%',background:i%3===0?'#edca8c':'#a1c9c4',opacity:(1-dawn)*(.035+depth*.055),filter:`blur(${1+depth*5}px)`}}/>;})}
    <div style={{position:'absolute',left:850,top:50,width:850,height:850,borderRadius:'50%',background:'radial-gradient(circle,#e3a64f35,transparent 65%)',opacity:1-dawn}}/>
    <AbsoluteFill style={{opacity:dawn,background:'radial-gradient(ellipse at 72% 32%,#fffff8 0%,#eef4ef 55%,#c7dcd7 110%)'}}/>
    <div style={{position:'absolute',left:830,top:880,width:950,height:90,borderRadius:'50%',filter:'blur(44px)',background:'#163e3c',opacity:.17*dawn}}/>
    <Product/>
    <div style={{position:'absolute',left:110,top:115,width:310,fontSize:64,lineHeight:1.03,fontWeight:600,letterSpacing:-2.5,color:'#e9f3e9',opacity:n(f,16,34)*(1-n(f,65,88)),transform:`translateY(${20*(1-n(f,16,34))}px)`}}>What's<br/>that?</div>
    <div style={{position:'absolute',left:110,top:335,opacity:n(f,86,108)*(1-n(f,130,146)),color:'#193438',transform:`translateY(${24*(1-n(f,86,108))}px)`}}>
      <div style={{color:'#9a743f',fontSize:17,letterSpacing:3,fontWeight:600}}>TWITCH MYSTERIES</div>
      <div style={{fontFamily:'"EB Garamond", Georgia, serif',fontSize:118,letterSpacing:-3,marginTop:7}}>Cluenite</div>
      <div style={{fontSize:29,lineHeight:1.4,color:'#6a827b',marginTop:16}}>Your chat.<br/>On the case.</div>
    </div>
    <div style={{position:'absolute',left:110,top:52,fontSize:43,fontWeight:600,letterSpacing:-1.4,color:'#193438',opacity:n(f,155,176)*(1-n(f,245,265))}}>Look closer.</div>
    <div style={{position:'absolute',left:110,top:345,width:530,color:'#193438',opacity:n(f,298,319)*(1-n(f,400,420)),transform:`translateY(${20*(1-n(f,298,319))}px)`}}>
      <div style={{fontSize:16,color:'#a17a41',fontWeight:600,letterSpacing:3}}>ONE DETAIL CHANGES EVERYTHING</div>
      <div style={{fontSize:84,fontWeight:600,lineHeight:1.04,letterSpacing:-3,marginTop:27}}>The sill<br/>is dry.</div>
    </div>
    <Magnifier/>
    <div style={{position:'absolute',left:110,top:350,color:'#193438',opacity:n(f,414,435)}}><div style={{fontFamily:'"EB Garamond", Georgia, serif',fontSize:99,lineHeight:1}}>Cluenite</div><div style={{fontSize:27,color:'#6a827b',marginTop:24}}>Bring your chat.<br/>Question everything.</div></div>
    <div style={{position:'absolute',left:110,bottom:42,fontSize:18,color:ink,opacity:.78}}>Local browser sample · scripted viewers</div>
    <div style={{position:'absolute',right:80,bottom:42,fontSize:14,color:ink,opacity:.6,letterSpacing:2}}>CLUENITE / OPTICAL STUDY</div>
    <Audio src={staticFile('film/score.wav')} volume={frame=>.86*(1-n(frame,432,449))}/>
  </AbsoluteFill>;
};
