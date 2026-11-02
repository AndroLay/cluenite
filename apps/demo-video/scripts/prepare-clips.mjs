// Encodes only completed, real UI takes. Retiming removes capture/automation dead
// time; it is an editorial cut, not a latency or gameplay speed measurement.
import {readFileSync,readdirSync,mkdirSync,copyFileSync,writeFileSync,existsSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const DEST=join(ROOT,'public',process.env.CLUENITE_CLIP_SET||'film');
const TARGET={opening:5,room:6,'find-window':4,'find-note':3.5,'find-clock':4.5,'find-register':5.2,'search-combo':6,'red-herring':8.5,link:10,timeline:12,lie:7.5,verdict:5.5,reveal:20,report:5,menu:5,m01:5.5,landing:5};
export async function prepareClips(rawDir){
  const raw=resolve(rawDir);
  if(!raw.startsWith(join(ROOT,'out')+'\\')&&!raw.startsWith(join(ROOT,'out')+'/'))throw new Error('Capture must be inside this project out directory.');
  const manifest=JSON.parse(readFileSync(join(raw,'markers.json'),'utf8'));
  let video=join(raw,'sample-ui.webm');
  if(!existsSync(video)){
    const candidates=readdirSync(join(raw,'video')).filter(x=>x.endsWith('.webm'));
    if(candidates.length!==1)throw new Error('Expected exactly one source recording.');
    video=join(raw,'video',candidates[0]);
  }
  mkdirSync(join(DEST,'stills'),{recursive:true});
  const records=[];
  for(const shot of manifest.shots){
    if(TARGET[shot.id]===undefined)continue;
    const target=TARGET[shot.id];
    const speed=target/shot.duration;
    const filter=`setpts=${speed}*(PTS-STARTPTS),fps=30,tpad=stop_mode=clone:stop_duration=1,trim=duration=${target},format=yuv420p`;
    const r=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-ss',String(shot.start),'-i',video,'-t',String(shot.duration),'-vf',filter,'-an','-c:v','libx264','-threads','2','-preset','fast','-crf','17','-movflags','+faststart',join(DEST,shot.id+'.mp4')],{encoding:'utf8'});
    if(r.status!==0)throw new Error('Encode '+shot.id+': '+r.stderr.slice(-500));
    copyFileSync(join(raw,'shots',shot.id+'.png'),join(DEST,'stills',shot.id+'.png'));
    records.push({id:shot.id,sourceStart:shot.start,sourceDuration:shot.duration,editedDuration:target,source:raw.slice(ROOT.length+1),kind:'Actual local application capture; editorial retiming'});
  }
  writeFileSync(join(DEST,'clip-manifest.json'),JSON.stringify({capturedAt:manifest.capturedAt,label:manifest.label,clips:records},null,2));
  console.log(JSON.stringify({encoded:records.length,destination:DEST.slice(ROOT.length+1),source:raw.slice(ROOT.length+1)}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await prepareClips(process.argv[2]);
