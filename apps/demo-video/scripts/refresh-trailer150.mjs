// One entry point for a new frontend media pack. No server or provider calls.
import {spawnSync} from 'node:child_process';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const value=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
const pack=value('--pack'),out=value('--out');
if(!out||!out.endsWith('.mp4'))throw new Error('Choose a new --out path ending in .mp4.');
if(existsSync(resolve(root,out)))throw new Error('Existing export preserved; choose a new --out.');
const run=(bin,args)=>{
 const result=spawnSync(bin,args,{cwd:root,stdio:'inherit',windowsHide:true});
 if(result.status!==0)process.exit(result.status??1);
};
run('python',['scripts/prepare-trailer150.py',...(pack?['--pack',pack]:[])]);
if(!existsSync(join(root,'public/trailer150/score.wav')))run('python',['scripts/compose-trailer150.py']);
run(process.execPath,['node_modules/typescript/bin/tsc','--noEmit']);
run(process.execPath,['scripts/render-trailer150.mjs',out]);
