import React from 'react';
import {AbsoluteFill,Easing,Img,interpolate,staticFile,useCurrentFrame} from 'remotion';

export const C={ink:'#100D0A',espresso:'#211811',walnut:'#493021',brass:'#A77A48',gold:'#D9B681',paper:'#E9DECB',dim:'#BFB19A',red:'#D99A88'};
export const serif='"EB Garamond",Georgia,serif';
export const sans='Inter,sans-serif';
export const ease=Easing.bezier(.16,1,.3,1);
export const progress=(f:number,a:number,b:number)=>interpolate(f,[a,b],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:ease});

// Editorial annotation of an already verified connection; it never pretends
// to be an interactive product control or changes recorded game state.
export const ConnectionLine:React.FC<{start:number;end:number;x1:number;y1:number;x2:number;y2:number}>=({start,end,x1,y1,x2,y2})=>{
  const f=useCurrentFrame();
  if(f<start||f>end)return null;
  const p=progress(f,start,start+23);
  return <svg width={1920} height={1080} style={{position:'absolute',inset:0,pointerEvents:'none',opacity:1-progress(f,end-10,end)}}>
    <path d={`M ${x1} ${y1} C ${x1+80} ${y1+90}, ${x2-80} ${y2+90}, ${x2} ${y2}`} fill="none" stroke={C.gold} strokeWidth={3} pathLength={1} strokeDasharray={1} strokeDashoffset={1-p}/>
    <circle cx={x1} cy={y1} r={5} fill={C.gold}/><circle cx={x2} cy={y2} r={5} fill={C.gold} opacity={p}/>
  </svg>;
};

// A short page turn between investigations, used at chapter changes only.
// Still holds are extracted from the actual outgoing footage.
export const SceneHandoff:React.FC<{at:number;id:string;reverse?:boolean}>=({at,id,reverse=false})=>{
  const f=useCurrentFrame();
  if(f<at||f>at+21)return null;
  const p=progress(f,at,at+21);
  const x=1920*(reverse?p:1-p);
  return <AbsoluteFill style={{pointerEvents:'none'}}>
    <div style={{position:'absolute',inset:0,clipPath:reverse?`inset(0 0 0 ${p*100}%)`:`inset(0 ${p*100}% 0 0)`}}>
      <Img src={staticFile(`trailer150/joins/${id}.jpg`)} style={{width:1920,height:1080,translate:`${(reverse?1:-1)*p*65}px 0`}}/>
    </div>
    <div style={{position:'absolute',left:x,top:0,bottom:0,width:3,background:C.brass}}/>
  </AbsoluteFill>;
};

export const TimelineEmphasis:React.FC=()=>{
  const f=useCurrentFrame();
  if(f<2195||f>=2274)return null;
  const p=progress(f,2195,2220);
  return <div style={{position:'absolute',right:82,top:252,width:330,color:C.paper}}>
    <div style={{fontFamily:serif,fontSize:50,lineHeight:1.05}}>The blackout<br/>came last.</div>
    <div style={{width:250*p,height:2,background:C.gold,marginTop:22}}/>
    <div style={{fontFamily:sans,fontSize:24,color:C.dim,marginTop:18}}>Sequence verified<br/>by the evidence.</div>
  </div>;
};

export const ContradictionStrike:React.FC=()=>{
  const f=useCurrentFrame();
  if(f<2386||f>=2520)return null;
  const p=progress(f,2386,2406);
  return <div style={{position:'absolute',right:82,top:105,color:C.paper,fontFamily:serif,fontSize:44}}>
    <div style={{position:'relative'}}>Theft during the blackout
      <div style={{position:'absolute',left:0,top:'52%',height:2,width:`${p*100}%`,background:C.red}}/>
    </div>
    <div style={{fontFamily:sans,fontSize:24,color:C.red,marginTop:15,opacity:p}}>Contradicted by the access record.</div>
  </div>;
};
