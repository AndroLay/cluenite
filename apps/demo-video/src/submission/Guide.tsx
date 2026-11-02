import React from 'react';
import {Audio,Sequence,staticFile,useCurrentFrame} from 'remotion';
import alignment from './narration-guide.generated.json';
import {B,type} from '../commercial/Brand';

export const Guide:React.FC<{id:string;coop?:boolean}>=({id,coop=false})=>{
  const f=useCurrentFrame();
  const track=alignment.find(a=>a.id===id&&a.variant===(coop?'coop':'default'));
  if(!track)return null;
  const cue=track.cues.find(c=>f/30>=c.at&&f/30<c.at+c.duration);
  return <>
    <Audio src={staticFile(track.file)}/>
    {cue?<div style={{position:'absolute',left:130,right:130,bottom:82,textAlign:'center',fontFamily:type.sans,fontSize:27,lineHeight:1.4,color:B.paper}}><span style={{display:'inline-block',maxWidth:1520,padding:'10px 20px',background:'#100d0af0',borderRadius:4}}>{cue.text}</span></div>:null}
  </>;
};
