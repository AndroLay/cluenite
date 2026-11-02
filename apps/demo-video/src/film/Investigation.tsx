import {AbsoluteFill, Sequence, interpolate, useCurrentFrame} from 'remotion';
import {BottomLine,Copy,Corner,DeskWindow,EditWipe,Eyebrow,F,FilmBase,P,RoomBackdrop,Rule,SampleLabel,n} from './Common';

export const RedHerring:React.FC = () => {
  const f=useCurrentFrame();
  return <FilmBase>
    <RoomBackdrop file="red-herring" hold={8.3} wash={.45}/>
    <div style={{position:'absolute',left:106,top:220,width:850}}>
      <Eyebrow>THE OBVIOUS SUSPECT</Eyebrow>
      <Copy at={6} size={112} style={{marginTop:30}}>Mud on the latch.<br/>Must be the gardener.</Copy>
      <div style={{marginTop:55,opacity:n(f,165,188)}}>
        <div style={{fontFamily:F.serif,fontSize:83,color:P.gold,fontStyle:'italic'}}>Hold on.</div>
        <p style={{fontSize:32,lineHeight:1.4,color:P.dim,maxWidth:720}}>The window was latched from inside.<br/>And the sill is dry.</p>
      </div>
    </div>
    <DeskWindow file="red-herring" hold={8.3}/>
    <BottomLine at={220}>A good theory has to survive the evidence.</BottomLine>
    <Corner chapter="Follow the wrong lead" number="03"/><SampleLabel/>
  </FilmBase>;
};

export const Connection:React.FC = () => {
  const f=useCurrentFrame();
  const link=n(f,210,270);
  return <FilmBase>
    <RoomBackdrop file="link" hold={9.8} wash={.6}/>
    <EditWipe>
      <div style={{position:'absolute',left:106,top:200,width:890}}>
        <Eyebrow>TWO CLUES. ONE VERY BAD ALIBI.</Eyebrow>
        <div style={{marginTop:50,opacity:n(f,15,37)}}>
          <div style={{fontSize:26,color:P.dim,letterSpacing:2}}>THE CLOCK STOPPED</div>
          <div style={{fontFamily:F.serif,fontSize:145,lineHeight:1.15,color:P.paper}}>20:52</div>
        </div>
        <div style={{height:66,position:'relative',marginLeft:43}}>
          <div style={{width:1,height:66*link,background:P.gold}}/>
          <div style={{position:'absolute',left:-5,top:60,width:11,height:11,background:P.gold,rotate:'45deg',opacity:link}}/>
        </div>
        <div style={{marginTop:18,opacity:n(f,90,113)}}>
          <div style={{fontSize:26,color:P.dim,letterSpacing:2}}>THE KEY WAS SIGNED OUT</div>
          <div style={{fontFamily:F.serif,fontSize:105,lineHeight:1.2,color:P.gold}}>20:50—21:02</div>
        </div>
        <div style={{fontSize:32,lineHeight:1.4,marginTop:30,color:P.paper,opacity:n(f,245,265)}}>One set of initials in the register: A.W.</div>
      </div>
      <DeskWindow file="link" hold={9.8} pan={{toY:566,fromFrame:150,toFrame:210}}/>
    </EditWipe>
    <Corner chapter="Make the connection" number="04"/><SampleLabel/>
    <BottomLine at={300}>Now the room starts telling a different story.</BottomLine>
  </FilmBase>;
};

export const TimelineProof:React.FC = () => {
  const f=useCurrentFrame();
  const progress=n(f,270,350);
  return <FilmBase>
    <RoomBackdrop file="timeline" hold={11.8} wash={.65}/>
    <div style={{position:'absolute',left:1000,top:205,width:830}}>
      <Eyebrow>REBUILD THE NIGHT</Eyebrow>
      <Copy at={8} size={106} style={{marginTop:30}}>The theft happened<br/><span style={{fontStyle:'italic',color:P.gold}}>before the alarm.</span></Copy>
      <div style={{position:'relative',marginTop:86,width:790,height:200}}>
        <div style={{position:'absolute',left:20,top:20,width:675*progress,height:1,background:P.gold}}/>
        {[{x:20,time:'20:52',label:'BOX OPENED',at:90},{x:520,time:'21:05',label:'ALARM RAISED',at:190}].map(item=><div key={item.time} style={{position:'absolute',left:item.x,top:0,opacity:n(f,item.at,item.at+22)}}>
          <div style={{width:11,height:11,marginTop:15,background:P.gold,rotate:'45deg'}}/>
          <div style={{fontFamily:F.serif,fontSize:77,marginTop:25}}>{item.time}</div>
          <div style={{fontSize:20,letterSpacing:2,color:P.dim}}>{item.label}</div>
        </div>)}
      </div>
    </div>
    <DeskWindow file="timeline" hold={11.8} rect={{x:1425,y:230,w:431,h:428}} pan={{toY:438,fromFrame:210,toFrame:300}} style={{left:106,top:150,width:780,height:775}}/>
    <BottomLine at={340}>Put events in order. Watch the alibi fall apart.</BottomLine>
    <Corner chapter="Reconstruct the evening" number="05"/><SampleLabel/>
  </FilmBase>;
};

export const Challenge:React.FC = () => {
  const f=useCurrentFrame();
  return <FilmBase>
    <RoomBackdrop file="lie" hold={7.3} wash={.65}/>
    <div style={{position:'absolute',left:106,top:230,width:900}}>
      <Eyebrow>ADA WREN / NIGHT CLERK</Eyebrow>
      <div style={{position:'relative',marginTop:35}}>
        <Copy at={5} size={111}>“The study was<br/>locked all evening.”</Copy>
        <div style={{position:'absolute',top:144,left:0,width:780*n(f,145,172),height:3,background:P.red,rotate:'-3deg'}}/>
      </div>
      <Rule at={190} style={{marginTop:58}}/>
      <div style={{marginTop:30,opacity:n(f,205,227)}}>
        <div style={{fontSize:22,letterSpacing:3,color:P.gold}}>CHALLENGE WITH THE KEY REGISTER</div>
        <p style={{fontSize:33,lineHeight:1.4,color:P.paper}}>Her own initials say otherwise.</p>
      </div>
    </div>
    <DeskWindow file="lie" hold={7.3}/>
    <BottomLine at={210}>You do not win by guessing. You make the case.</BottomLine>
    <Corner chapter="Break the statement" number="06"/><SampleLabel/>
  </FilmBase>;
};
