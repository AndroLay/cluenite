import React from 'react';
import {AbsoluteFill, Easing, Freeze, Img, OffthreadVideo, interpolate, staticFile, useCurrentFrame} from 'remotion';

export const P = {ink:'#0d0a08',paper:'#f1e4cc',dim:'#b9a88e',gold:'#caa36a',red:'#ce8067',green:'#b3c3a2'};
export const F = {serif:'"EB Garamond", Georgia, serif',sans:'Inter, sans-serif',mono:'Consolas, monospace'};
export const ease = Easing.bezier(.22,1,.36,1);
export const n = (frame:number,a:number,b:number) => interpolate(frame,[a,b],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:ease});

export const FilmBase:React.FC<{children:React.ReactNode}> = ({children}) => <AbsoluteFill style={{background:P.ink,color:P.paper,fontFamily:F.sans,overflow:'hidden'}}>{children}</AbsoluteFill>;

export const Eyebrow:React.FC<{children:React.ReactNode;style?:React.CSSProperties}> = ({children,style}) => <div style={{fontFamily:F.sans,fontSize:21,fontWeight:600,letterSpacing:4,textTransform:'uppercase',color:P.gold,...style}}>{children}</div>;

export const Copy:React.FC<{children:React.ReactNode;at?:number;size?:number;style?:React.CSSProperties}> = ({children,at=0,size=100,style}) => {
  const f=useCurrentFrame();
  return <div style={{fontFamily:F.serif,fontSize:size,fontWeight:400,letterSpacing:-2.5,lineHeight:.99,opacity:n(f,at,at+19),translate:`0 ${24*(1-n(f,at,at+25))}px`,...style}}>{children}</div>;
};

export const BottomLine:React.FC<{children:React.ReactNode;at?:number;accent?:boolean}> = ({children,at=0,accent=false}) => {
  const f=useCurrentFrame();
  return <div style={{position:'absolute',left:100,right:100,bottom:82,opacity:n(f,at,at+14),display:'flex',alignItems:'center',gap:24}}>
    <span style={{height:1,width:48,background:P.gold,flexShrink:0}}/>
    <span style={{fontSize:35,lineHeight:1.25,fontWeight:500,color:accent?P.gold:P.paper,textShadow:'0 2px 16px #000'}}>{children}</span>
  </div>;
};

// The label travels with every sample shot, including crops. The film never
// presents scripted sample viewers as Twitch chat or local rules as server proof.
export const SampleLabel:React.FC<{preview?:boolean}> = ({preview=false}) => <div style={{position:'absolute',right:76,top:42,fontSize:17,fontWeight:500,letterSpacing:2,color:P.dim,padding:'11px 16px',background:'rgba(13,10,8,.88)',border:'1px solid #493925'}}>
  {preview?'M01 VISUAL PREVIEW':'LOCAL BROWSER SAMPLE · SCRIPTED VIEWERS'}
</div>;

export const Corner:React.FC<{chapter:string;number:string}> = ({chapter,number}) => <div style={{position:'absolute',top:47,left:84,display:'flex',alignItems:'center',gap:19}}>
  <span style={{fontFamily:F.serif,fontSize:30,color:P.paper}}>Cluenite</span>
  <span style={{height:18,width:1,background:'#65503a'}}/>
  <span style={{fontSize:16,letterSpacing:3,color:P.dim}}>{number} / {chapter.toUpperCase()}</span>
</div>;

type Rect = {x:number;y:number;w:number;h:number};
export const ROOM:Rect={x:64,y:134,w:1344,h:756};
export const APP:Rect={x:0,y:0,w:1920,h:1080};
export const DESK:Rect={x:1425,y:134,w:431,h:514};

type Pan = {toY:number;fromFrame:number;toFrame:number};
type CaptureProps={file:string;rect?:Rect;start?:number;hold?:number;rate?:number;pan?:Pan;still?:boolean;style?:React.CSSProperties;wash?:number};
export const Capture:React.FC<CaptureProps> = ({file,rect=APP,start=0,hold,rate=1,pan,still=false,style,wash=0}) => {
  const frame=useCurrentFrame();
  const cropY=pan?interpolate(frame,[pan.fromFrame,pan.toFrame],[rect.y,pan.toY],{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:ease}):rect.y;
  // A source frame hold is an editorial pause on the real recording, never a
  // synthetic UI state. Layout motion remains outside this frozen media layer.
  const cropStyle:React.CSSProperties={position:'absolute',left:`${-rect.x/rect.w*100}%`,top:`${-cropY/rect.h*100}%`,width:`${1920/rect.w*100}%`,height:`${1080/rect.h*100}%`,maxWidth:'none'};
  const video=still?<Img src={staticFile('film/stills/'+file+'.png')} style={cropStyle}/>:<OffthreadVideo src={staticFile('film/'+file+'.mp4')} muted startFrom={Math.round(start*30)} playbackRate={rate} style={cropStyle}/>;
  return <AbsoluteFill style={{overflow:'hidden',...style}}>
    {hold===undefined?video:<Freeze frame={Math.min(frame,Math.floor(hold*30))}>{video}</Freeze>}
    {wash>0?<AbsoluteFill style={{background:`rgba(13,10,8,${wash})`}}/>:null}
  </AbsoluteFill>;
};

export const RoomBackdrop:React.FC<{file?:string;hold?:number;wash?:number;motion?:boolean}> = ({file='room',hold=5,wash=.25,motion=false}) => {
  const f=useCurrentFrame();
  return <AbsoluteFill style={{scale:String(interpolate(f,[0,600],[1,1.035],{extrapolateRight:'clamp'}))}}>
    {motion?<Capture file={file} rect={ROOM} hold={hold}/>:<AbsoluteFill style={{overflow:'hidden'}}><Img src={staticFile('film/stills/'+file+'.png')} style={{position:'absolute',left:`${-ROOM.x/ROOM.w*100}%`,top:`${-ROOM.y/ROOM.h*100}%`,width:`${1920/ROOM.w*100}%`,height:`${1080/ROOM.h*100}%`,maxWidth:'none'}}/></AbsoluteFill>}
    <AbsoluteFill style={{background:`linear-gradient(90deg,rgba(13,10,8,.84),rgba(13,10,8,${wash}) 60%,rgba(13,10,8,.16)),linear-gradient(0deg,#0d0a08 0%,transparent 25%,transparent 65%,#0d0a08 100%)`}}/>
  </AbsoluteFill>;
};

export const Rule:React.FC<{at?:number;style?:React.CSSProperties}> = ({at=0,style}) => {
  const f=useCurrentFrame();
  return <div style={{height:1,width:460*n(f,at,at+40),background:P.gold,...style}}/>;
};

export const DeskWindow:React.FC<{file:string;hold:number;start?:number;pan?:Pan;rect?:Rect;style?:React.CSSProperties}> = ({file,hold,start=0,pan,rect=DESK,style}) => <Capture file={file} start={start} rect={rect} pan={pan} hold={hold} style={{left:1108,top:145,width:650,height:775,border:'1px solid #725436',boxShadow:'0 32px 100px #0008',...style}}/>;

export const EditWipe:React.FC<{children:React.ReactNode}> = ({children}) => {
  const f=useCurrentFrame();
  return <AbsoluteFill style={{clipPath:`inset(0 ${(1-n(f,0,17))*100}% 0 0)`}}>{children}</AbsoluteFill>;
};
