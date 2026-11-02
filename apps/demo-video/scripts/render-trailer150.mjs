// Uses only installed tooling. --frames allows a bounded motion study.
import {spawnSync} from 'node:child_process';
import {existsSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const output=process.argv.find(v=>v.endsWith('.mp4'))||'out/Cluenite-Trailer-150s-Template-v1.mp4';
if(existsSync(join(root,output)))throw new Error('Preserve existing export: choose a new output filename.');
const frames=process.argv.find(v=>v.startsWith('--frames='));
const args=[join(root,'node_modules/@remotion/cli/remotion-cli.js'),'render','src/trailer150/entry.tsx','ClueniteTrailer150',output,
 '--concurrency=2','--crf=16','--image-format=png','--pixel-format=yuv420p','--color-space=bt709','--sample-rate=48000',
 '--offthreadvideo-cache-size-in-bytes=134217728','--media-cache-size-in-bytes=268435456',
 '--log=error','--browser-executable='+chromium.executablePath(),...(frames?[frames]:[])];
const result=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit',windowsHide:true});
process.exitCode=result.status??1;
if(result.status===0){
 mkdirSync(join(root,'out/trailer150-delivery'),{recursive:true});
 writeFileSync(join(root,'out/trailer150-delivery/last-render.json'),JSON.stringify({at:new Date().toISOString(),output,frames:frames||'0-4499',editorial:JSON.parse(readFileSync(join(root,'src/trailer150/edit.generated.json'),'utf8'))},null,2));
}
