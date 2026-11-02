// Render selected current composition frames with one reusable local browser.
import {bundle} from '@remotion/bundler';
import {openBrowser,selectComposition,renderStill} from '@remotion/renderer';
import {chromium} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';

const destination=resolve(process.argv[2]||'out/review-stills-v2');
const frames=(process.argv[3]||'80,240,380,670,1050,1500,1990,2290,2470,2680,2910,3100,3250,3400,3520,3710,3779').split(',').map(Number);
const id=process.argv[4]||'ClueniteFilm';
mkdirSync(destination,{recursive:true});
const browserExecutable=process.env.CLUENITE_CHROME||chromium.executablePath();
const serveUrl=await bundle({entryPoint:resolve(process.argv[5]||'src/index.ts'),onProgress:()=>{}});
const browser=await openBrowser('chrome',{browserExecutable,logLevel:'error'});
try {
  const composition=await selectComposition({serveUrl,id,puppeteerInstance:browser,logLevel:'error'});
  for(const frame of frames){
    await renderStill({serveUrl,composition,puppeteerInstance:browser,frame,output:resolve(destination,`${String(frame).padStart(4,'0')}.png`),imageFormat:'png',logLevel:'error'});
  }
  console.log(JSON.stringify({frames,destination}));
} finally {
  await browser.close({silent:true});
}
