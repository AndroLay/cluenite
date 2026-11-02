import React from 'react';
import {AbsoluteFill,Img,OffthreadVideo,Sequence,staticFile,useCurrentFrame} from 'remotion';
import {BrassLens} from './BrassLens';
import {B,Desk,Kicker,enter,move,type} from './Brand';

export const NoirOpening:React.FC=()=>{
  const f=useCurrentFrame();
  const width=move(f,[0,95,130,169,260,330],[1220,1060,1060,1440,1440,1130]);
  const x=move(f,[0,95,130,169,260,330],[880,830,830,240,240,750]);
  const y=move(f,[0,95,130,169,260,330],[220,230,230,145,145,230]);
  return <Desk>
    <div style={{position:'absolute',left:x,top:y,width,height:width*1080/1920+34,opacity:move(f,[0,45,95],[.12,.38,1]),transform:`perspective(2800px) rotateX(${move(f,[0,95,169,330],[9,3,0,3])}deg) rotateY(${move(f,[0,95,169,330],[-17,-8,0,-6])}deg) rotateZ(${move(f,[0,95,169,330],[3,-1,0,1])}deg)`,borderRadius:8,border:`1px solid ${B.brass}`,overflow:'hidden',background:B.espresso,boxShadow:'0 46px 85px #0009,0 2px 1px #d9b68122 inset'}}>
      <div style={{height:34,background:'linear-gradient(#302218,#211811)',display:'flex',alignItems:'center',gap:8,paddingLeft:18,borderBottom:`1px solid ${B.leather}`}}>{[B.brass,B.leather,B.walnut].map(c=><span key={c} style={{width:6,height:6,borderRadius:8,background:c}}/>)}<span style={{fontSize:12,color:B.dim,marginLeft:16}}>Cluenite</span></div>
      <div style={{position:'relative',height:width*1080/1920}}>
        <Img src={staticFile('motion-ui/room.png')} style={{width:'100%',height:'100%'}}/>
        <Sequence from={144} durationInFrames={120} premountFor={30} name="Find the real window latch"><OffthreadVideo src={staticFile('motion-ui/window-find.mp4')} muted style={{width:'100%',height:'100%'}}/></Sequence>
        <AbsoluteFill style={{opacity:enter(f,259,270)}}><Img src={staticFile('motion-ui/window-board.png')} style={{width:'100%',height:'100%'}}/></AbsoluteFill>
      </div>
    </div>
    <div style={{position:'absolute',left:108,top:122,width:320,fontFamily:type.serif,fontSize:80,lineHeight:.98,color:B.paper,opacity:enter(f,16,34)*(1-enter(f,65,88)),translate:`0 ${20*(1-enter(f,16,34))}px`}}>What’s<br/>that?</div>
    <div style={{position:'absolute',left:110,top:330,opacity:enter(f,86,108)*(1-enter(f,130,146)),translate:`0 ${24*(1-enter(f,86,108))}px`}}>
      <Kicker>Twitch mysteries</Kicker>
      <div style={{fontFamily:type.serif,fontSize:123,letterSpacing:-3,marginTop:4}}>Cluenite</div>
      <div style={{fontSize:28,lineHeight:1.4,color:B.dim,marginTop:12}}>Your chat.<br/>On the case.</div>
    </div>
    <div style={{position:'absolute',left:110,top:42,fontFamily:type.serif,fontSize:57,opacity:enter(f,155,176)*(1-enter(f,245,265))}}>Look closer.</div>
    <div style={{position:'absolute',left:110,top:340,width:570,opacity:enter(f,298,319),translate:`0 ${20*(1-enter(f,298,319))}px`}}>
      <Kicker>One detail changes everything</Kicker>
      <div style={{fontFamily:type.serif,fontSize:101,lineHeight:.98,letterSpacing:-1.8,marginTop:25}}>Rain outside.<br/>Dry inside.</div>
    </div>
    <BrassLens/>
  </Desk>;
};
