import React from 'react';
import {AbsoluteFill,Audio,Easing,Img,interpolate,OffthreadVideo,Sequence,staticFile,useCurrentFrame} from 'remotion';

const C={ink:'#100d0a',espresso:'#211811',paper:'#e9decb',gold:'#d9b681',brass:'#a77a48',dim:'#bfb19a'};
const ease=Easing.bezier(.22,1,.36,1);
const at=(f:number,start:number,end:number,a:number,b:number)=>interpolate(f,[start,end],[a,b],{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:ease});
const asset=(name:string)=>staticFile(`submission/native-opening/${name}`);

// Each slip is a high-resolution capture of the actual Vue component, not a
// replacement card design. This is an explicitly labeled editorial UI replay.
export const OpeningStudy:React.FC=()=>{
  const f=useCurrentFrame();
  const entrance=at(f,84,125,0,1);
  const release=at(f,654,695,0,1);
  const next=at(f,778,827,0,1);
  const x=280+(120-280)*entrance;
  const w=f<420?450+(1180-450)*entrance:760;
  const finalWidth=w+(780-w)*release;
  const open=at(f,466,474,0,1);
  const y=f<420?660+(340-660)*entrance:380-(50*release);
  const command=f>=360&&f<655;
  const roomOpacity=at(f,290,360,1,0);
  return <AbsoluteFill style={{background:C.espresso,color:C.paper,fontFamily:'Inter',overflow:'hidden'}}>
    <AbsoluteFill style={{background:'radial-gradient(ellipse 58% 46% at 76% 18%,rgba(217,182,129,.12),transparent 72%),radial-gradient(ellipse 120% 90% at 50% 40%,transparent 48%,rgba(8,5,3,.78) 100%)'}}/>
    <AbsoluteFill style={{opacity:roomOpacity}}>
      <Sequence from={0} durationInFrames={135} premountFor={30} name="Native room opening"><OffthreadVideo src={asset('native-room.mp4')} muted style={{width:1920,height:1080}}/></Sequence>
      <Sequence from={135} durationInFrames={135} premountFor={30} name="Native room continuation"><OffthreadVideo src={asset('native-room.mp4')} muted style={{width:1920,height:1080}}/></Sequence>
      <Sequence from={270} durationInFrames={90} premountFor={30} name="Native room exit"><OffthreadVideo src={asset('native-room.mp4')} muted style={{width:1920,height:1080}}/></Sequence>
      <AbsoluteFill style={{background:'linear-gradient(180deg,#100d0ad9,transparent 46%,#100d0a99)',opacity:at(f,84,145,.35,.86)}}/>
    </AbsoluteFill>
    <div style={{position:'absolute',left:120,top:65,fontSize:25,color:C.gold,opacity:at(f,73,87,1,0)}}>21:10. The main door stayed locked.</div>
    <div style={{position:'absolute',left:120,top:137,fontFamily:'EB Garamond',fontSize:at(f,345,357,74,62),lineHeight:1.04,opacity:at(f,642,663,1,0),textShadow:'0 3px 16px #100d0a'}}>What triggered the alarm?</div>
    {f>=84?<>
      <div style={{position:'absolute',left:120,top:65,fontFamily:'EB Garamond',fontSize:39,color:C.gold,opacity:at(f,110,125,0,1)}}>Cluenite</div>
      <div style={{position:'absolute',left:120,top:237,fontSize:29,color:C.dim,opacity:Math.min(at(f,116,137,0,1),at(f,312,338,1,0))}}>A mystery game for streamers and Twitch chat.</div>

      <div style={{position:'absolute',left:x,top:y,width:finalWidth,opacity:at(f,84,99,0,1),translate:`0 ${28*(1-at(f,84,105,0,1))}px`}}>
        <Img src={asset('cam-sealed.png')} style={{display:'block',width:'100%',opacity:1-open}}/>
        <Img src={asset('cam-open.png')} style={{position:'absolute',left:0,top:0,width:'100%',opacity:open}}/>
      </div>
      {command?<div style={{position:'absolute',left:120,top:248,opacity:Math.min(at(f,360,371,0,1),at(f,636,654,1,0))}}>
        <span style={{fontSize:18,color:C.dim,marginRight:25}}>Recorded Twitch input</span>
        <span style={{fontFamily:'Consolas,monospace',fontSize:37,color:C.gold}}>{'!look CAM'.slice(0,Math.max(0,Math.floor((f-373)/3)))}</span>
      </div>:null}

      <Sequence from={420} durationInFrames={234} premountFor={30} name="Genuine OBS response">
        <div style={{position:'absolute',left:940,top:350,width:860,opacity:at(f,420,433,0,1)}}>
          <div style={{fontSize:24,color:C.dim,marginBottom:24}}>Recorded browser overlay</div>
          <OffthreadVideo src={asset('obs-proof.mp4')} muted style={{width:860,height:325,objectFit:'contain'}}/>
        </div>
      </Sequence>
      <div style={{position:'absolute',left:120,top:137,fontFamily:'EB Garamond',fontSize:74,opacity:release*(1-next)}}>Tag R-07.</div>
      <div style={{position:'absolute',left:120,top:137,fontFamily:'EB Garamond',fontSize:74,opacity:next}}>Was R-07 scheduled here?</div>
      <div style={{position:'absolute',left:1040,top:374,width:740,opacity:release*(1-next),translate:`${-28*(1-release)}px 0`}}>
        <div style={{fontFamily:'EB Garamond',fontSize:40,color:C.paper,marginBottom:18}}>Released evidence</div>
        <Img src={asset('evidence.png')} style={{display:'block',width:'100%'}}/>
      </div>
      <div style={{position:'absolute',left:120,top:738,width:780,opacity:next}}>
        <div style={{fontFamily:'EB Garamond',fontSize:30,marginBottom:12}}>Released evidence</div>
        <Img src={asset('evidence.png')} style={{display:'block',width:'100%'}}/>
      </div>
      <div style={{position:'absolute',left:1120+100*(1-next),top:345,width:650,opacity:next}}>
        <div style={{fontSize:21,color:C.dim,marginBottom:22}}>Check the maintenance record.</div>
        <Img src={asset('schedule-sealed.png')} style={{display:'block',width:'100%'}}/>
      </div>
    </>:null}
    <div style={{position:'absolute',left:120,bottom:25,fontSize:17,color:C.dim,textShadow:`0 1px 5px ${C.ink}`}}>Native UI replay{f>=420&&f<654?' · recorded Twitch overlay shown at right':''}</div>
    <Audio src={asset('score-and-foley.wav')}/>
  </AbsoluteFill>;
};
