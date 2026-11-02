import {chromium} from '@playwright/test';
import {spawnSync} from 'node:child_process';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdirSync} from 'node:fs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
mkdirSync(join(root,'out'),{recursive:true});
const result=spawnSync(process.execPath,[
  join(root,'node_modules','@remotion','cli','remotion-cli.js'),
  'render','src/index.ts','ClueniteFilm','out/Cluenite-Demo-2026-11-02.mp4',
  '--concurrency=2','--crf=18','--sample-rate=48000','--log=error',
  '--browser-executable='+ (process.env.CLUENITE_CHROME||chromium.executablePath()),
],{cwd:root,stdio:'inherit'});
process.exitCode=result.status??1;
