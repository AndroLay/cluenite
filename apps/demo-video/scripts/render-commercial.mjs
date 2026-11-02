import {chromium} from '@playwright/test';
import {spawnSync} from 'node:child_process';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdirSync} from 'node:fs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
mkdirSync(join(root,'out'),{recursive:true});
const result=spawnSync(process.execPath,[
  join(root,'node_modules','@remotion','cli','remotion-cli.js'),
  'render','src/index.ts','ClueniteCommercial','out/Cluenite-Demo-90s-v1.mp4',
  '--concurrency=2','--crf=16','--sample-rate=48000','--audio-bitrate=192K',
  '--color-space=bt709','--image-format=png','--offthreadvideo-cache-size-in-bytes=134217728','--log=error',
  '--browser-executable='+(process.env.CLUENITE_CHROME||chromium.executablePath()),
],{cwd:root,stdio:'inherit'});
process.exitCode=result.status??1;
