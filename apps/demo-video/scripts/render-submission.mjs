import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {chromium} from '@playwright/test';

const root=resolve(import.meta.dirname,'..');
const script=JSON.parse(readFileSync(resolve(root,'src/submission/script.json'),'utf8'));
const media=JSON.parse(readFileSync(resolve(root,'src/submission/media.json'),'utf8'));
const problems=[];
if(script.durationSeconds!==175||script.fps!==30)problems.push('Required duration: 175 seconds at 30 fps.');
script.segments.forEach((s,i)=>{if(s.start!==(i===0?0:script.segments[i-1].end))problems.push('Non-contiguous segment '+s.id);});
if(script.segments.at(-1).end!==175)problems.push('Last segment must end at 2:55.');
for(const[id,shot]of Object.entries(media))if(shot.required&&(!shot.file||!existsSync(resolve(root,'public',shot.file))))problems.push(id+': '+shot.description);
if(problems.length){console.error(JSON.stringify({status:'capture_pending',duration:175,problems},null,2));process.exitCode=2;}
else if(process.argv.includes('--check'))console.log(JSON.stringify({status:'capture_paths_present',duration:175,note:'Provenance and normal-speed review still required.'}));
else {
  const result=spawnSync(process.execPath,[resolve(root,'node_modules/@remotion/cli/remotion-cli.js'),'render','src/index.ts','ClueniteSubmission175','out/Cluenite-Submission-2m55-v1.mp4','--concurrency=2','--crf=16','--color-space=bt709','--image-format=png','--log=error','--browser-executable='+chromium.executablePath()],{cwd:root,stdio:'inherit'});
  process.exitCode=result.status??1;
}
