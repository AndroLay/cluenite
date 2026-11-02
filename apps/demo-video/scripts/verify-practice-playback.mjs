// Normal-speed browser playback verification of the actual exported MP4.
// Muted playback is deliberate: this does not certify human audio listening.
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {chromium} from '@playwright/test';

const root=resolve(import.meta.dirname,'..');
const file=resolve(root,process.argv[2]||'out/Cluenite-Practice-Demo-165s-Template-v1.mp4');
const out=resolve(root,process.argv[3]||'out/practice165-playback-v1');
mkdirSync(out,{recursive:false});
const bytes=readFileSync(file),sha256=createHash('sha256').update(bytes).digest('hex');
const server=createServer((req,res)=>{
 if(req.url==='/film.mp4'){
  const range=/bytes=(\d+)-(\d*)/.exec(req.headers.range||'');
  const start=range?Number(range[1]):0,end=range&&range[2]?Math.min(Number(range[2]),bytes.length-1):bytes.length-1;
  if(start>end||start>=bytes.length){res.writeHead(416);res.end();return;}
  res.writeHead(range?206:200,{'Content-Type':'video/mp4','Content-Length':end-start+1,'Accept-Ranges':'bytes',...(range?{'Content-Range':`bytes ${start}-${end}/${bytes.length}`}:{})});
  res.end(bytes.subarray(start,end+1));return;
 }
 if(req.url!=='/'){res.writeHead(404);res.end();return;}
 res.writeHead(200,{'Content-Type':'text/html'});
 res.end('<!doctype html><html lang="en"><meta charset="utf-8"><title>Cluenite export playback verification</title><style>html,body{margin:0;background:#100d0a;width:100%;height:100%;overflow:hidden}video{width:100%;height:100%;object-fit:contain}button{position:absolute;inset:40%;font:24px sans-serif}</style><video playsinline muted preload="auto" src="/film.mp4"></video><button>Play current export</button><script>const v=document.querySelector("video");window.events=[];for(const name of ["stalled","waiting","error","ended"]){v.addEventListener(name,()=>window.events.push({name,time:v.currentTime}));}document.querySelector("button").onclick=async e=>{e.target.remove();v.playbackRate=1;await v.play();};</script></html>');
});
await new Promise((ok,bad)=>{server.once('error',bad);server.listen(0,'127.0.0.1',ok);});
const browser=await chromium.launch();const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const sampleTimes=[7,14,26,38,48,60,76,85,90,130,140,150,160];
const screenshots=[];const started=Date.now();let playbackStart=0,last={};
try{
 await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'load'});
 await page.getByRole('button',{name:'Play current export'}).click();playbackStart=Date.now();
 for(;;){
  last=await page.evaluate(()=>{const v=document.querySelector('video');return {time:v.currentTime,duration:v.duration,ended:v.ended,playbackRate:v.playbackRate,muted:v.muted,error:v.error?{code:v.error.code,message:v.error.message}:null,quality:v.getVideoPlaybackQuality().toJSON?.()||{totalVideoFrames:v.getVideoPlaybackQuality().totalVideoFrames,droppedVideoFrames:v.getVideoPlaybackQuality().droppedVideoFrames}};});
  writeFileSync(join(out,'progress.json'),JSON.stringify({wallSeconds:(Date.now()-playbackStart)/1000,...last}));
  if(last.error)throw new Error('Browser media error: '+JSON.stringify(last.error));
  while(sampleTimes.length&&last.time>=sampleTimes[0]){
   const at=sampleTimes.shift(),name='playback-'+String(at).padStart(3,'0')+'.png';
   await page.screenshot({path:join(out,name)});screenshots.push({file:name,observedTime:last.time});
  }
  if(last.ended)break;
  if(Date.now()-playbackStart>185000)throw new Error('Normal-speed playback did not finish within 185 seconds.');
  await page.waitForTimeout(1000);
 }
 const events=await page.evaluate(()=>window.events);
 const report={sha256,file,recordedAt:new Date().toISOString(),status:errors.length?'page-errors':'pass',
  coverage:'Automated normal-speed browser playback; actual video presentation at 1280x720, sampled screenshots; no complete human visual or audio-listening approval',
  wallSeconds:(Date.now()-playbackStart)/1000,totalTaskSeconds:(Date.now()-started)/1000,...last,events,pageErrors:errors,screenshots};
 writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2));
 if(errors.length)throw new Error('Page errors in playback verification.');
 console.log(JSON.stringify({status:report.status,ended:last.ended,playbackRate:last.playbackRate,wallSeconds:report.wallSeconds,quality:last.quality,sha256}));
}finally{await context.close();await browser.close();await new Promise(ok=>server.close(ok));}
