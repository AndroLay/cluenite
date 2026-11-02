import React from 'react';
import {AbsoluteFill,Easing,Freeze,Img,OffthreadVideo,interpolate,staticFile,useCurrentFrame} from 'remotion';

// These are the active Cinematic Brown Noir tokens in apps/web/src/style.css.
export const B={ink:'#100d0a',espresso:'#211811',walnut:'#493021',leather:'#65432d',brass:'#a77a48',gold:'#d9b681',paper:'#e9decb',dim:'#bfb19a',thread:'#c79a62',burgundy:'#64352f',rose:'#d99a88'};
export const type={serif:'"EB Garamond", Georgia, serif',sans:'Inter, sans-serif',mono:'Consolas, monospace'};
export const ease=Easing.bezier(.16,1,.3,1);
export const move=(f:number,t:number[],v:number[])=>interpolate(f,t,v,{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:ease});
export const enter=(f:number,a:number,b:number)=>move(f,[a,b],[0,1]);

export const Desk:React.FC<{children?:React.ReactNode;light?:'left'|'right';red?:boolean}>=({children,light='right',red=false})=>{
  const f=useCurrentFrame();
  return <AbsoluteFill style={{background:B.ink,color:B.paper,fontFamily:type.sans,overflow:'hidden'}}>
    <AbsoluteFill style={{background:`radial-gradient(ellipse at ${light==='right'?'76%':'25%'} 28%,${red?'#49271f':'#493021'} 0%,#211811 42%,#100d0a 82%)`}}/>
    <div style={{position:'absolute',left:light==='right'?1040:200,top:-700,width:280,height:1900,rotate:light==='right'?'-27deg':'24deg',background:'linear-gradient(90deg,transparent,#d9b6810b,transparent)',filter:'blur(30px)'}}/>
    {Array.from({length:11},(_,i)=><div key={i} style={{position:'absolute',left:((i*239+70)-f*(.05+(i%3)*.03)+2100)%2100,top:(i*137+56)%1030,width:2+(i%3),height:2+(i%3),borderRadius:'50%',background:B.gold,opacity:.06+(i%4)*.015}}/>)}
    {children}
  </AbsoluteFill>;
};

export const Kicker:React.FC<{children:React.ReactNode;style?:React.CSSProperties}>=({children,style})=><div style={{fontSize:16,letterSpacing:3,fontWeight:500,color:B.gold,textTransform:'uppercase',...style}}>{children}</div>;
export const Head:React.FC<{children:React.ReactNode;at?:number;size?:number;style?:React.CSSProperties}>=({children,at=0,size=92,style})=>{
  const f=useCurrentFrame();
  return <div style={{fontFamily:type.serif,fontSize:size,lineHeight:1.02,fontWeight:400,letterSpacing:-1.8,color:B.paper,opacity:enter(f,at,at+20),translate:`0 ${22*(1-enter(f,at,at+26))}px`,...style}}>{children}</div>;
};

type Crop={x:number;y:number;w:number;h:number};
export const Screen:React.FC<{file:string;still?:boolean;imagePath?:string;crop?:Crop;start?:number;hold?:number;rate?:number;style?:React.CSSProperties}>=({file,still=false,imagePath,crop={x:0,y:0,w:1920,h:1080},start=0,hold,rate=1,style})=>{
  const f=useCurrentFrame();
  // Override OffthreadVideo's default object-fit:contain. Crops specify both
  // axes in source coordinates, so a contain letterbox would shift the crop.
  const mediaStyle:React.CSSProperties={position:'absolute',maxWidth:'none',objectFit:'fill',width:`${1920/crop.w*100}%`,height:`${1080/crop.h*100}%`,left:`${-crop.x/crop.w*100}%`,top:`${-crop.y/crop.h*100}%`};
  const media=still||imagePath?<Img src={staticFile(imagePath||`commercial/stills/${file}.png`)} style={mediaStyle}/>:<OffthreadVideo src={staticFile(`commercial/${file}.mp4`)} startFrom={Math.round(start*30)} playbackRate={rate} muted style={mediaStyle}/>;
  return <div style={{position:'absolute',overflow:'hidden',background:B.espresso,...style}}>{hold===undefined?media:<Freeze frame={Math.min(f,Math.floor(hold*30))}>{media}</Freeze>}</div>;
};

export const Browser:React.FC<{children:React.ReactNode;style?:React.CSSProperties}>=({children,style})=><div style={{position:'absolute',border:`1px solid ${B.brass}`,borderRadius:8,background:B.espresso,overflow:'hidden',boxShadow:'0 34px 70px #0009,0 1px 0 #d9b68133 inset',...style}}>
  <div style={{height:32,background:'linear-gradient(#302218,#211811)',borderBottom:`1px solid ${B.leather}`,display:'flex',alignItems:'center',paddingLeft:16,gap:7}}>{[B.brass,B.leather,B.walnut].map((c,i)=><span key={i} style={{height:6,width:6,borderRadius:8,background:c}}/>)}<span style={{fontSize:12,color:B.dim,marginLeft:12}}>Cluenite</span></div>
  <div style={{position:'absolute',inset:'32px 0 0'}}>{children}</div>
</div>;

export const Footnote:React.FC<{preview?:boolean}>=({preview=false})=><div style={{position:'absolute',bottom:29,left:72,right:72,display:'flex',justifyContent:'space-between',alignItems:'center',color:B.dim,fontFamily:type.sans,fontSize:17,textShadow:'0 2px 5px #100d0a'}}>
  <span style={{padding:'7px 12px',background:'#100d0ae8',border:`1px solid ${B.walnut}`,borderRadius:3}}>{preview?'Mystery Live · visual preview':'Local browser sample · scripted viewers'}</span>
  <span style={{fontFamily:type.serif,fontSize:26,color:B.gold}}>Cluenite</span>
</div>;
