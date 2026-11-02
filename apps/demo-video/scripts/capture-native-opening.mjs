// Read-only native UI replay. No API, provider messages, credentials or saved games.
// The public case snapshots follow the previously verified Twitch command order.
import {createRequire} from 'node:module';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {chromium} from '@playwright/test';
import {applyCommand, createRound, toRoundSnapshot} from '../../../packages/engine/src/index.ts';
import {Q01_GALLERY_SHADOW} from '../../../packages/cases/src/q01GalleryShadow.ts';

const root=resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo=resolve(root, '../..');
const work=join(root, 'out/native-opening-v3');
const assets=join(root,'public/submission/native-opening');
mkdirSync(work, {recursive:true});
mkdirSync(assets,{recursive:true});
mkdirSync(join(work,'video'), {recursive:true});
const webRequire=createRequire(join(repo,'apps/web/package.json'));
const {createServer}=await import(pathToFileURL(webRequire.resolve('vite')).href);
const {default:vue}=await import(pathToFileURL(webRequire.resolve('@vitejs/plugin-vue')).href);
const {default:tailwind}=await import(pathToFileURL(webRequire.resolve('@tailwindcss/vite')).href);
const manifest=JSON.parse(readFileSync(join(root,'out/live-capture-2026-11-02T15-44-56-890Z/manifest.json'),'utf8'));
const receipt=manifest.messages.find(m=>m.command==='!look CAM');
if(!receipt?.eventSubReceipt) throw new Error('Verified Twitch receipt missing.');
let state=createRound(Q01_GALLERY_SHADOW,{sessionId:'native-replay-q01',source:'simulation'});
const before=toRoundSnapshot(state,0);
const after=applyCommand(state,'!look CAM',1000);
if(after.result.code!=='ACCEPTED_NEW') throw new Error('Replay command failed.');
const snapshots={before,after:toRoundSnapshot(after.state,1000),notice:after.result.message};
writeFileSync(join(work,'snapshots.json'),JSON.stringify(snapshots,null,2));
const fsUrl=p=>'/@fs/'+p.replaceAll('\\','/');
writeFileSync(join(work,'index.html'),'<!doctype html><html lang="en"><meta charset="utf-8"><title>Cluenite native UI replay</title><div id="app"></div><script type="module" src="/main.ts"></script></html>');
writeFileSync(join(work,'main.ts'),`
import {createApp,h,ref,nextTick} from 'vue';
import QuickCaseOverlay from '${fsUrl(join(repo,'apps/web/src/components/QuickCaseOverlay.vue'))}';
import {quickCaseFromSnapshot} from '${fsUrl(join(repo,'apps/web/src/quickCase/viewModel.ts'))}';
import '${fsUrl(join(repo,'apps/web/src/style.css'))}';
import snapshots from './snapshots.json';
const view=ref(quickCaseFromSnapshot(snapshots.before));
view.value.timer.running=false;
const notice=ref(null);
createApp({setup(){return ()=>h(QuickCaseOverlay,{view:view.value,muted:true,notice:notice.value});}}).mount('#app');
window.nativeReplay={reset:async()=>{view.value=quickCaseFromSnapshot(snapshots.before);view.value.timer.running=false;notice.value=null;await nextTick();},inspect:async()=>{view.value=quickCaseFromSnapshot(snapshots.after);view.value.timer.running=false;notice.value={tone:'ok',text:snapshots.notice};await nextTick();},ready:()=>!!document.querySelector('.qc-scene canvas')};
const style=document.createElement('style');
style.textContent='html,body{width:1200px;margin:0;overflow:hidden}body{padding:0;background:#100d0a}#app{width:1200px}.qc{border-radius:0}.qc-badge{font-size:13px!important}.qc-clue-body{line-height:1.5}';
document.head.append(style);
`);
const server=await createServer({configFile:false,root:work,envFile:false,
  plugins:[vue(),tailwind()],logLevel:'error',
  resolve:{alias:{vue:webRequire.resolve('vue/dist/vue.runtime.esm-bundler.js')}},
  server:{host:'127.0.0.1',port:5188,strictPort:true,fs:{allow:[repo]}}});
await server.listen();
const browser=await chromium.launch();
const errors=[];
const context=await browser.newContext({viewport:{width:1200,height:1750},deviceScaleFactor:3,
  recordVideo:{dir:join(work,'video'),size:{width:1200,height:1750}}});
const videoEpoch=Date.now();
const page=await context.newPage();
page.on('pageerror',e=>errors.push(e.message));
const video=page.video();
try {
  await page.goto('http://127.0.0.1:5188',{waitUntil:'networkidle'});
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>window.nativeReplay?.ready(),{timeout:20000});
  await page.waitForTimeout(1600);
  const boxes=await page.evaluate(()=>Object.fromEntries(['.qc','.qc-scene','.qc-question','.qc-clues','.qc-evidence'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return[s,{x:r.x,y:r.y,w:r.width,h:r.height}]})));
  await page.screenshot({path:join(work,'before.png')});
  const epoch=Date.now();
  writeFileSync(join(work,'capture-start.json'),JSON.stringify({epoch,boxes}));
  await page.waitForTimeout(4500);
  const acceptedAt=(Date.now()-epoch)/1000;
  await page.evaluate(()=>window.nativeReplay.inspect());
  await page.waitForTimeout(3000);
  await page.screenshot({path:join(work,'after.png')});
  await page.waitForTimeout(1500);
  await page.setViewportSize({width:390,height:1200});
  await page.addStyleTag({content:'html,body{width:390px!important;overflow:visible!important}#app{width:390px!important}'});
  await page.waitForTimeout(500);
  await page.locator('.qc-clue').first().screenshot({path:join(assets,'cam-open.png')});
  await page.locator('.qc-evidence-card').first().screenshot({path:join(assets,'evidence.png')});
  await page.evaluate(()=>window.nativeReplay.reset());
  await page.waitForTimeout(600);
  await page.locator('.qc-clue').first().screenshot({path:join(assets,'cam-sealed.png')});
  await page.locator('.qc-clue').nth(1).screenshot({path:join(assets,'access-sealed.png')});
  await page.locator('.qc-clue').nth(2).screenshot({path:join(assets,'schedule-sealed.png')});
  await page.close();
  await video.saveAs(join(work,'native-replay.webm'));
  writeFileSync(join(work,'provenance.json'),JSON.stringify({
    type:'Native UI replay, not a new Twitch recording',
    component:'apps/web/src/components/QuickCaseOverlay.vue',
    observedInput:receipt.command,verifiedEventSubReceipt:true,
    acceptedAt,deviceScaleFactor:3,videoOffset:(epoch-videoEpoch)/1000,boxes,pageErrors:errors,externalCalls:false,
    sourceManifest:'out/live-capture-2026-11-02T15-44-56-890Z/manifest.json'
  },null,2));
  if(errors.length)throw new Error(errors.join('\n'));
  console.log(JSON.stringify({captured:'native-opening-v3',boxes,acceptedAt}));
} finally {await context.close();await browser.close();await server.close();}
