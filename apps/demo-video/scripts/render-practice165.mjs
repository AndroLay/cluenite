// Versioned local render. Empty live slots are intentional in this template.
import {spawnSync} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {chromium} from '@playwright/test';

const root=resolve(import.meta.dirname,'..');
const output=process.argv.find(v=>v.endsWith('.mp4'))||'out/Cluenite-Practice-Demo-165s-Template-v1.mp4';
if(existsSync(resolve(root,output)))throw new Error('Choose a new version; preserve the existing MP4.');
const frames=process.argv.find(v=>v.startsWith('--frames='));
const media=JSON.parse(readFileSync(join(root,'src/practice165/media.json'),'utf8'));
if(media.live.segments.some(s=>s.src)&&!media.live.provenance)throw new Error('Live media requires its real capture provenance.');
if(media.live.segments.reduce((s,v)=>s+v.seconds,0)!==40)throw new Error('The live slot must remain exactly 40 seconds.');
const result=spawnSync(process.execPath,[join(root,'node_modules/@remotion/cli/remotion-cli.js'),'render','src/practice165/entry.tsx','CluenitePractice165',output,
 '--concurrency=2','--crf=16','--image-format=png','--pixel-format=yuv420p','--color-space=bt709','--sample-rate=48000','--audio-bitrate=192k',
 '--offthreadvideo-cache-size-in-bytes=134217728','--media-cache-size-in-bytes=268435456','--log=error','--browser-executable='+chromium.executablePath(),...(frames?[frames]:[])],
 {cwd:root,stdio:'inherit',windowsHide:true});
process.exitCode=result.status??1;
if(result.status===0){mkdirSync(join(root,'out/practice165-delivery'),{recursive:true});writeFileSync(join(root,'out/practice165-delivery/last-render.json'),JSON.stringify({at:new Date().toISOString(),output,frames:frames||'0-4949',media},null,2));}
