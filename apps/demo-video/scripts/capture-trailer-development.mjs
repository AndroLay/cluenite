// Records actual source inspection and an actual local test process. This is
// development footage, not a reconstructed Codex conversation or production UI.
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const repo=resolve(root,'../..');
const out=join(root,'out/trailer150-development');
mkdirSync(join(out,'video'),{recursive:true});
const selections=[['rules','packages/cases/src/q01GalleryShadow.ts',51,66],
 ['guard','packages/engine/src/round.ts',906,918],
 ['twitch','apps/server/src/twitch/chatEnvelope.ts',49,73]];
const sources=Object.fromEntries(selections.map(([id,path,first,last])=>{
 const full=readFileSync(join(repo,path),'utf8');
 return[id,{path,first,code:full.split(/\r?\n/).slice(first-1,last).join('\n'),sha256:createHash('sha256').update(full).digest('hex')}];
}));
let output='',exitCode=null,child=null;const clients=new Set();
const publish=()=>{for(const res of clients)res.write('data: '+JSON.stringify({output,exitCode})+'\n\n');};
const html=`<!doctype html><html lang="en"><meta charset="utf-8"><title>Cluenite development recording</title>
<style>@font-face{font-family:Inter;src:url('/font')}*{box-sizing:border-box}body{margin:0;background:#100d0a;color:#e9decb;font-family:Inter,sans-serif}header{height:106px;display:flex;align-items:center;justify-content:space-between;padding:0 70px;border-bottom:1px solid #65432d}header b{font-size:30px;font-weight:500}header span{font-size:21px;color:#bfb19a}nav{display:flex;gap:12px;padding:24px 70px}button{background:#211811;border:1px solid #65432d;color:#e9decb;font:22px Inter;padding:14px 25px;cursor:pointer}button[aria-pressed=true]{border-color:#d9b681;color:#d9b681}#path{color:#d9b681;font:22px Consolas,monospace;margin:18px 70px}pre{font:30px/1.45 Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere;margin:28px 70px;max-height:760px;overflow:hidden}#log{font-size:24px;line-height:1.4}footer{position:fixed;bottom:20px;left:70px;font-size:18px;color:#bfb19a}em{color:#d9b681;font-style:normal}</style>
<header><b>Cluenite / Development</b><span>Actual local source and test execution</span></header>
<nav><button data-id="rules">Case rules</button><button data-id="guard">Proof guard</button><button data-id="twitch">Twitch / EventSub</button><button data-id="tests">Run engine tests</button></nav>
<div id="path"></div><pre id="code"></pre><pre id="log" hidden></pre><footer>Local development recording · no Codex conversation is recreated</footer>
<script>const sources=${JSON.stringify(sources).replaceAll('<','\\u003c')};const code=document.querySelector('#code'),log=document.querySelector('#log'),path=document.querySelector('#path');
function select(id){document.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.id===id));if(id==='tests'){code.hidden=true;log.hidden=false;path.textContent='node node_modules/vitest/vitest.mjs run tests/engine';fetch('/run',{method:'POST'});return}code.hidden=false;log.hidden=true;const s=sources[id];path.textContent=s.path;code.textContent=s.code;}
document.querySelectorAll('button').forEach(b=>b.onclick=()=>select(b.dataset.id));select('rules');const stream=new EventSource('/events');stream.onmessage=e=>{const d=JSON.parse(e.data);log.textContent=d.output;log.scrollTop=log.scrollHeight;if(d.exitCode!==null)document.documentElement.dataset.testExit=d.exitCode;};</script></html>`;
const server=createServer((req,res)=>{
 if(req.url==='/'){res.writeHead(200,{'Content-Type':'text/html'});res.end(html);return;}
 if(req.url==='/font'){res.writeHead(200,{'Content-Type':'font/woff2'});res.end(readFileSync(join(root,'public/fonts/inter-latin-400-normal.woff2')));return;}
 if(req.url==='/events'){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache'});clients.add(res);res.write('data: '+JSON.stringify({output,exitCode})+'\n\n');req.on('close',()=>clients.delete(res));return;}
 if(req.url==='/run'&&req.method==='POST'&&req.headers.origin==='http://127.0.0.1:5189'){
  if(!child){
   child=spawn(process.execPath,['node_modules/vitest/vitest.mjs','run','tests/engine','--reporter=verbose'],{cwd:repo,env:{...process.env,NO_COLOR:'1',CI:'1'},windowsHide:true,stdio:['ignore','pipe','pipe']});
   const append=data=>{output+=String(data).replace(/\x1b\[[0-9;]*m/g,'');publish();};
   child.stdout.on('data',append);child.stderr.on('data',append);
   child.on('exit',code=>{exitCode=code;writeFileSync(join(out,'engine-tests.log'),output);publish();});
  }
  res.end('Started actual local engine tests');return;
 }
 res.writeHead(404);res.end();
});
await new Promise((ok,bad)=>{server.once('error',bad);server.listen(5189,'127.0.0.1',ok);});
const browser=await chromium.launch();const context=await browser.newContext({viewport:{width:1920,height:1080},recordVideo:{dir:join(out,'video'),size:{width:1920,height:1080}}});
const epoch=Date.now(),page=await context.newPage(),video=page.video();const marks={};const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5189',{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
 marks.rules=(Date.now()-epoch)/1000;await page.waitForTimeout(5400);
 await page.getByRole('button',{name:'Proof guard'}).click();marks.guard=(Date.now()-epoch)/1000;await page.waitForTimeout(5400);
 await page.getByRole('button',{name:'Twitch / EventSub',exact:true}).click();marks.twitch=(Date.now()-epoch)/1000;await page.waitForTimeout(5400);
 await page.getByRole('button',{name:'Run engine tests'}).click();marks.tests=(Date.now()-epoch)/1000;
 await page.waitForFunction(()=>document.documentElement.dataset.testExit!==undefined,{timeout:60000});
 if(exitCode!==0)throw new Error('Actual engine tests failed: '+exitCode);
 marks.passed=(Date.now()-epoch)/1000;
 await page.screenshot({path:join(out,'tests-passed.png')});await page.waitForTimeout(7000);
 await page.close();await video.saveAs(join(out,'development.webm'));
 const report={recordedAt:new Date().toISOString(),type:'Actual local development recording',codexSessionRecording:false,marks,exitCode,sources,pageErrors:errors,command:'node node_modules/vitest/vitest.mjs run tests/engine --reporter=verbose'};
 writeFileSync(join(out,'manifest.json'),JSON.stringify(report,null,2));
 if(errors.length)throw new Error(errors.join('\n'));
 console.log(JSON.stringify({recorded:'development.webm',marks,exitCode}));
}finally{await context.close();await browser.close();for(const client of clients)client.end();await new Promise(ok=>server.close(ok));}
