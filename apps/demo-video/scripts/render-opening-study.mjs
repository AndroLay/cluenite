import {spawnSync} from 'node:child_process';
import {copyFileSync,mkdirSync,readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const assets=join(root,'public/submission/native-opening');
mkdirSync(assets,{recursive:true});
const sound=spawnSync('python',['scripts/compose-opening-score.py'],{cwd:root,encoding:'utf8',windowsHide:true});
if(sound.status!==0)throw new Error(sound.stderr.slice(-1200));
const provenance=JSON.parse(readFileSync(join(root,'out/native-opening-v3/provenance.json'),'utf8'));
const room=spawnSync('ffmpeg',['-hide_banner','-v','error','-y','-ss',String(provenance.videoOffset),'-t','4.4','-i',join(root,'out/native-opening-v3/native-replay.webm'),
  '-vf','crop=1200:500:0:120,scale=1920:800:flags=lanczos,pad=1920:1080:0:0:color=0x100d0a,tpad=stop_mode=clone:stop_duration=1,fps=30',
  '-an','-t','4.5','-frames:v','135','-c:v','libx264','-crf','16','-preset','fast','-threads','2',join(assets,'native-room.mp4')],{cwd:root,encoding:'utf8',windowsHide:true});
if(room.status!==0)throw new Error(room.stderr.slice(-1200));
const ff=spawnSync('ffmpeg',['-hide_banner','-v','error','-y',
  '-ss','16.8367','-t','7.8','-i',join(root,'out/live-capture-2026-11-02T15-44-56-890Z/q01-overlay.webm'),
  '-f','lavfi','-i','color=c=0x100d0a:s=540x204:r=30:d=7.8',
  '-filter_complex','[0:v]setpts=PTS-STARTPTS,crop=540:204:24:852,colorkey=0xffffff:0.04:0.01[fg];[1:v][fg]overlay=shortest=1,fps=30,format=yuv420p[out]',
  '-map','[out]','-an','-c:v','libx264','-crf','16','-preset','fast','-threads','2',join(assets,'obs-proof.mp4')
],{cwd:root,encoding:'utf8',windowsHide:true});
if(ff.status!==0)throw new Error(ff.stderr.slice(-1500));
const args=[join(root,'node_modules/@remotion/cli/remotion-cli.js'),
  'render','src/submission/opening-study-entry.tsx','ClueniteOpeningStudy',
  process.argv[2]||'out/Cluenite-First-30s-v5.mp4','--concurrency=2','--crf=16',
  '--sample-rate=48000','--log=error','--browser-executable='+chromium.executablePath()];
const check=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit',windowsHide:true});
process.exitCode=check.status??1;
