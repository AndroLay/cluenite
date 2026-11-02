// Assemble bounded local render parts, retaining the unmodified render outputs.
// Exact frame trims replace the four-second editorial repair without GOP cuts.
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,renameSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const parts=['01-opening.mp4','02-investigation.mp4','03-reconstruction-repair.mp4'].map(x=>join(root,'out','commercial-parts-v1',x));
const expected=[630,2070,480];
for(const [i,file] of parts.entries()){
  if(!existsSync(file))throw new Error('Missing completed render part: '+file);
  const result=spawnSync('ffprobe',['-v','error','-show_entries','stream=codec_type,width,height,avg_frame_rate,nb_frames','-of','json',file],{encoding:'utf8'});
  if(result.status!==0)throw new Error('Cannot inspect '+file);
  const stream=JSON.parse(result.stdout).streams.find(s=>s.codec_type==='video');
  if(stream?.width!==1920||stream.height!==1080||stream.avg_frame_rate!=='30/1'||Number(stream.nb_frames)!==expected[i])throw new Error('Unexpected frame contract in '+file);
}
const output=join(root,'out','Cluenite-Demo-90s-v1.mp4');
if(existsSync(output))throw new Error('Preserve the existing master; choose a new version before assembling again.');
const temporary=join(root,'out','Cluenite-Demo-90s-v1-assembling.mp4');
const score=join(root,'public','commercial','score.wav');
const filter='[1:v]split=2[body][ending];[0:v]setpts=PTS-STARTPTS[a];[body]trim=start_frame=0:end_frame=1200,setpts=PTS-STARTPTS[b];[2:v]setpts=PTS-STARTPTS[c];[ending]trim=start_frame=1680:end_frame=2070,setpts=PTS-STARTPTS[d];[a][b][c][d]concat=n=4:v=1:a=0[v]';
const result=spawnSync('ffmpeg',[
  '-hide_banner','-loglevel','error','-y',
  '-i',parts[0],'-i',parts[1],'-i',parts[2],'-i',score,
  '-filter_complex',filter,'-map','[v]','-map','3:a:0',
  '-c:v','libx264','-crf','14','-preset','medium','-threads','4',
  '-r','30','-fps_mode','cfr','-pix_fmt','yuv420p',
  '-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709',
  '-c:a','aac','-b:a','192k','-ar','48000','-ac','2',
  '-t','90','-movflags','+faststart',temporary,
],{encoding:'utf8',maxBuffer:1024*1024});
if(result.status!==0)throw new Error('Master assembly failed: '+result.stderr.slice(-1800));
renameSync(temporary,output);
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
writeFileSync(join(root,'out','commercial-master-manifest.json'),JSON.stringify({
  createdAt:new Date().toISOString(),composition:'ClueniteCommercial',frames:2700,fps:30,
  output:output.slice(root.length+1),sha256:hash(output),
  parts:parts.map((file,i)=>({file:file.slice(root.length+1),frames:expected[i],sha256:hash(file)})),
  frameAssembly:[{part:0,start:0,endExclusive:630},{part:1,start:0,endExclusive:1200},{part:2,start:0,endExclusive:480},{part:1,start:1680,endExclusive:2070}],
  score:{file:'public/commercial/score.wav',sha256:hash(score)},
  encoding:'1080p30 H.264 CRF 14, yuv420p BT.709; AAC 192 kb/s stereo 48 kHz; final exact-frame assembly retains original parts',
},null,2));
console.log(JSON.stringify({output:output.slice(root.length+1),frames:2700,duration:90}));
