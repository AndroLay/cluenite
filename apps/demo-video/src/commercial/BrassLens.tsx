import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {cancelRender,continueRender,delayRender,Easing,interpolate,staticFile,useCurrentFrame} from 'remotion';

const curve=Easing.bezier(.2,.85,.25,1);
const at=(f:number,t:number[],v:number[])=>interpolate(f,t,v,{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:curve});
const phase=(f:number,a:number,b:number)=>at(f,[a,b],[0,1]);
type Stage={draw:(f:number)=>void;dispose:()=>void};

// The glass is an authored editorial camera guide. Its lens samples real UI
// pixels, not invented evidence or a feature asserted to exist in the app.
export const BrassLens:React.FC<{outro?:boolean}>=({outro=false})=>{
  const frame=useCurrentFrame();
  const canvas=useRef<HTMLCanvasElement>(null);
  const stage=useRef<Stage|null>(null);
  const current=useRef(frame);current.current=frame;
  const [handle]=useState(()=>delayRender('Preparing the original magnifying glass'));
  useEffect(()=>{
    let abandoned=false;
    const make=async()=>{
      const renderer=new T.WebGLRenderer({canvas:canvas.current!,alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});
      renderer.setSize(1920,1080,false);
      renderer.setPixelRatio(1);
      renderer.outputColorSpace=T.SRGBColorSpace;
      renderer.toneMapping=T.ACESFilmicToneMapping;
      renderer.toneMappingExposure=.78;
      renderer.shadowMap.enabled=true;
      renderer.shadowMap.type=T.PCFSoftShadowMap;
      renderer.setClearColor(0x000000,0);
      const scene=new T.Scene();
      const camera=new T.PerspectiveCamera(40,1920/1080,.1,100);
      camera.position.set(0,0,20);
      const pmrem=new T.PMREMGenerator(renderer);
      const room=new RoomEnvironment();
      const environment=pmrem.fromScene(room,.04).texture;
      scene.environment=environment;
      scene.environmentIntensity=.52;
      room.dispose();pmrem.dispose();
      const load=new T.TextureLoader();
      const [image,evidence]=await Promise.all(['room','round'].map(name=>load.loadAsync(staticFile('motion-ui/'+name+'.png'))));
      for(const texture of [image,evidence]){texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();}
      const ambient=new T.HemisphereLight(0xe9decb,0x211811,1.3);scene.add(ambient);
      const key=new T.DirectionalLight(0xffd69a,3.8);key.position.set(-4,6,7);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-12;key.shadow.camera.right=12;key.shadow.camera.top=9;key.shadow.camera.bottom=-9;key.shadow.bias=-.0004;key.shadow.normalBias=.02;scene.add(key);
      const rim=new T.DirectionalLight(0xa77a48,1.6);rim.position.set(5,-1,5);scene.add(rim);
      const gold=new T.MeshStandardMaterial({color:0xa77a48,metalness:.82,roughness:.52});
      const bronze=new T.MeshStandardMaterial({color:0x65432d,metalness:.65,roughness:.48});
      const grip=new T.MeshStandardMaterial({color:0x493021,metalness:.02,roughness:.72});
      const prop=new T.Group();scene.add(prop);
      const mesh=(geometry:T.BufferGeometry,material:T.Material)=>{const m=new T.Mesh(geometry,material);m.castShadow=true;prop.add(m);return m;};
      mesh(new T.TorusGeometry(1.5,.15,24,112),bronze);
      const front=mesh(new T.TorusGeometry(1.5,.083,24,112),gold);front.position.z=.13;
      const back=mesh(new T.TorusGeometry(1.5,.055,18,112),gold);back.position.z=-.15;
      const handleGroup=new T.Group();handleGroup.position.set(1.12,-1.12,0);handleGroup.rotation.z=Math.PI/4;prop.add(handleGroup);
      const part=(geo:T.BufferGeometry,mat:T.Material,y:number)=>{const m=new T.Mesh(geo,mat);m.position.y=y;m.castShadow=true;handleGroup.add(m);return m;};
      part(new T.CylinderGeometry(.19,.19,.42,40),gold,-.12);
      part(new T.CylinderGeometry(.165,.19,1.67,40),grip,-1.04);
      part(new T.CylinderGeometry(.205,.205,.14,40),gold,-1.91);
      for(const y of [-.35,-.49,-1.62,-1.76]){const band=part(new T.TorusGeometry(.184,.014,10,40),bronze,y);band.rotation.x=Math.PI/2;}
      const uniforms={uRoom:{value:image},uEvidence:{value:evidence},uCenter:{value:new T.Vector2(.594,.59)},uSpan:{value:new T.Vector2(.15,.267)},uDetail:{value:0},uAngle:{value:0}};
      const glass=new T.ShaderMaterial({uniforms,toneMapped:false,vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`
        uniform sampler2D uRoom;uniform sampler2D uEvidence;
        uniform vec2 uCenter;uniform vec2 uSpan;uniform float uDetail;uniform float uAngle;
        varying vec2 vUv;
        void main(){
          vec2 local=vUv-.5;
          vec2 d=vec2(cos(uAngle)*local.x-sin(uAngle)*local.y,sin(uAngle)*local.x+cos(uAngle)*local.y);
          float r=length(d)*2.;
          vec3 room=texture2D(uRoom,uCenter+d*uSpan*(.94+.12*r*r)).rgb;
          vec2 paperUv=vec2(.5+d.x*.94,d.y*1.76+.5);
          vec3 edge=texture2D(uEvidence,vec2(.97,clamp(paperUv.y,.045,.955))).rgb;
          float inside=smoothstep(.025,.09,paperUv.y)*(1.-smoothstep(.91,.975,paperUv.y));
          vec3 paper=mix(edge,texture2D(uEvidence,paperUv).rgb,inside);
          vec3 color=mix(room,paper,uDetail);
          float shine=pow(clamp(1.-abs(vUv.y+vUv.x*.33-.80)*19.,0.,1.),2.)*.075;
          color=mix(color,vec3(1.),shine);
          color*=1.-.07*smoothstep(.8,1.,r);
          gl_FragColor=vec4(color,1.);
          #include <colorspace_fragment>
        }`});
      const lens=mesh(new T.CircleGeometry(1.375,96),glass);lens.position.z=.075;lens.castShadow=false;
      const shadow=new T.Mesh(new T.PlaneGeometry(100,100),new T.ShadowMaterial({opacity:.17}));shadow.position.z=-.65;shadow.receiveShadow=true;scene.add(shadow);
      const times=[0,14,28,52,78,112,138,150,169,205,238,270,308,370,405,449];
      const draw=(f:number)=>{
        const x=outro?at(f,[0,35,55,179],[1510,1380,1390,1390]):at(f,times,[650,740,710,1260,1030,970,1850,1210,430,430,540,1450,1320,1320,1430,2030]);
        const y=outro?at(f,[0,35,55,179],[1150,465,495,495]):at(f,times,[1420,550,450,450,530,515,170,525,625,625,580,385,490,490,490,1270]);
        const radius=outro?at(f,[0,40,60,179],[180,285,275,275]):at(f,times,[410,310,265,190,150,116,70,104,118,118,90,165,265,265,240,290]);
        const z=at(f,[0,28,112,270,308],[2,.8,0,1.5,2]);
        const viewH=2*(20-z)*Math.tan(T.MathUtils.degToRad(20));
        prop.position.set((x-960)/1080*viewH,(540-y)/1080*viewH,z);
        prop.scale.setScalar(radius/1080*viewH/1.5);
        prop.rotation.set(at(f,[0,28,78,138,205,308],[.6,.06,.13,-.1,.04,.035]),at(f,[0,28,78,138,205,308],[-.85,.13,-.1,.2,-.12,.07]),at(f,[0,28,52,112,169,270,308,405,449],[-.9,-.46,.21,-.38,-.34,.16,-.1,-.04,.7]));
        if(outro)prop.rotation.set(at(f,[0,40,70],[.3,.08,.04]),at(f,[0,40,70],[-.3,.12,.08]),at(f,[0,40,70],[-.45,-.08,-.12]));
        uniforms.uAngle.value=prop.rotation.z;
        const focus=outro?1:phase(f,52,80);
        uniforms.uCenter.value.set(.594+(.113-.594)*focus,.59+(.495-.59)*focus);
        uniforms.uDetail.value=outro?0:phase(f,270,298);
        renderer.render(scene,camera);
      };
      const dispose=()=>{scene.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});for(const material of [gold,bronze,grip,glass])material.dispose();image.dispose();evidence.dispose();environment.dispose();renderer.dispose();};
      if(abandoned){dispose();return;}
      stage.current={draw,dispose};draw(current.current);continueRender(handle);
    };
    make().catch(error=>cancelRender(error));
    return()=>{abandoned=true;stage.current?.dispose();stage.current=null;};
  },[handle,outro]);
  useLayoutEffect(()=>{stage.current?.draw(frame);},[frame]);
  return <canvas ref={canvas} width={1920} height={1080} style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}}/>;
};
