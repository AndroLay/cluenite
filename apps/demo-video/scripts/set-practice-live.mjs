// Relink one real OBS/Twitch run using five explicit chronological edit points.
// This script never opens Twitch, sends messages, or manufactures gameplay.
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const arg=key=>{const n=process.argv.indexOf(key);return n<0?undefined:process.argv[n+1];};
const file=arg('--file'),receipt=arg('--provenance'),points=arg('--in-points');
if(!file||!receipt||!points)throw new Error('Use --file RAW.mp4 --provenance MANIFEST.json --in-points 0,12,25,40,60. Each point is source seconds.');
const input=resolve(root,file),provenance=resolve(root,receipt);
if(!existsSync(input)||!existsSync(provenance))throw new Error('Source recording and original provenance must both exist.');
JSON.parse(readFileSync(provenance,'utf8'));
const inPoints=points.split(',').map(Number),seconds=[6,8,10,8,8];
if(inPoints.length!==5||inPoints.some(n=>!Number.isFinite(n)||n<0))throw new Error('Provide five finite nonnegative source times.');
if(inPoints.some((n,i)=>i>0&&n<inPoints[i-1]+seconds[i-1]))throw new Error('Use chronological non-overlapping selections from one round.');
const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_type,width,height','-of','json',input],{encoding:'utf8',windowsHide:true});
if(probe.status!==0)throw new Error('Cannot inspect the recording.');
const metadata=JSON.parse(probe.stdout),video=metadata.streams.find(v=>v.codec_type==='video');
if(video?.width!==1920||video.height!==1080)throw new Error('Use a native 1920x1080 composite with real chat and game both legible.');
if(inPoints.some((n,i)=>n+seconds[i]>Number(metadata.format.duration)+.02))throw new Error('A selected segment exceeds the real recording.');
if(process.argv.includes('--check')){console.log(JSON.stringify({valid:true,segments:5,seconds:40,modified:false}));process.exit(0);}
const hash=createHash('sha256').update(readFileSync(input)).digest('hex');
mkdirSync(join(root,'public/practice165/live'),{recursive:true});
const src='practice165/live/obs-'+hash.slice(0,12)+'.mp4',dest=join(root,'public',src);
if(!existsSync(dest)){
 const normalized=spawnSync('ffmpeg',['-hide_banner','-v','error','-i',input,'-map','0:v:0','-map','0:a:0?',
  '-vf','fps=30','-c:v','libx264','-crf','14','-preset','fast','-threads','2','-pix_fmt','yuv420p',
  '-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-movflags','+faststart',dest],{encoding:'utf8',windowsHide:true});
 if(normalized.status!==0)throw new Error(normalized.stderr.slice(-1600));
}
const path=join(root,'src/practice165/media.json'),media=JSON.parse(readFileSync(path,'utf8'));
media.live.provenance=receipt;media.live.captureType='recorded-twitch';
media.live.sourceSHA256=hash;
media.live.segments=media.live.segments.map((segment,i)=>({...segment,src,inPoint:inPoints[i]}));
writeFileSync(path,JSON.stringify(media,null,2)+'\n');
mkdirSync(join(root,'out/practice165-delivery'),{recursive:true});
const captions=readFileSync(join(root,'src/practice165/editorial.en.srt'),'utf8').replace('Reserved for one real Twitch and gameplay run.\nFinal recording pending; this slot is empty.','One real Twitch and gameplay round,\nedited chronologically from start to conclusion.');
writeFileSync(join(root,'out/practice165-delivery/editorial-live.en.srt'),captions);
console.log(JSON.stringify({linked:5,seconds:40,sourceSHA256:hash,renderRequired:true}));
