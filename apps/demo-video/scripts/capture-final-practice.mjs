// Capture normal UI actions at their real timing. CDP preserves paint timestamps;
// Playwright's independent 25 fps recording is retained as an original backup.
import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const out=join(root,'out/final-practice-'+new Date().toISOString().replace(/[:.]/g,'-'));
mkdirSync(join(out,'frames'),{recursive:true});mkdirSync(join(out,'video'),{recursive:true});
const browser=await chromium.launch();
const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1,recordVideo:{dir:join(out,'video'),size:{width:1920,height:1080}}});
const page=await context.newPage(),backup=page.video();
const frames=[],writes=[],marks=[],errors=[];let session,lastKept=-Infinity,epoch=0;
page.on('pageerror',e=>errors.push(e.message.slice(0,200)));
const wait=ms=>page.waitForTimeout(ms);
async function shot(id,seconds,action=async()=>{}){
 const start=(Date.now()-epoch)/1000;await action();
 await wait(Math.max(300,seconds*1000-(Date.now()-epoch-start*1000)));
 marks.push({id,start,end:(Date.now()-epoch)/1000});
 writeFileSync(join(out,'progress.json'),JSON.stringify({last:id,marks,frames:frames.length,errors},null,2));
 console.log(JSON.stringify({shot:id,frames:frames.length}));
}
async function tab(name){
 if(!await page.getByRole('tab',{name:new RegExp('^'+name)}).isVisible())await page.getByRole('button',{name:'Case file',exact:true}).click();
 await page.getByRole('tab',{name:new RegExp('^'+name)}).click();await wait(450);
}
async function command(value){
 await page.getByRole('button',{name:'Open command input',exact:true}).click();
 const input=page.locator('#sc-command-input');await input.fill(value);await wait(380);
 await input.press('Enter');await wait(500);
 if(await page.getByRole('button',{name:'Close command input',exact:true}).isVisible())await page.getByRole('button',{name:'Close command input',exact:true}).click();
}
async function challenge(claim,record){
 await page.locator('#sc-challenge-'+claim).selectOption(record);
 await page.locator('.sc-claim').filter({has:page.locator('#sc-challenge-'+claim)}).getByRole('button',{name:'Challenge',exact:true}).click();
}
try{
 await page.goto('http://127.0.0.1:5173/?view=quick',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Skip the intro',exact:true}).waitFor({timeout:25000});
 await page.locator('.sc-canvas canvas').waitFor();await page.evaluate(()=>document.fonts.ready);await wait(1000);
 await page.getByRole('button',{name:'Skip the intro',exact:true}).click();
 await page.locator('.sc[data-phase="investigating"]').waitFor();await wait(1800);
 session=await context.newCDPSession(page);epoch=Date.now();
 session.on('Page.screencastFrame',event=>{
  session.send('Page.screencastFrameAck',{sessionId:event.sessionId}).catch(()=>{});
  const timestamp=event.metadata.timestamp;if(!Number.isFinite(timestamp)||timestamp-lastKept<1/31)return;
  lastKept=timestamp;const name=String(frames.length).padStart(6,'0')+'.jpg';
  frames.push({file:'frames/'+name,timestamp});writes.push(writeFile(join(out,'frames',name),Buffer.from(event.data,'base64')));
 });
 await session.send('Page.startScreencast',{format:'jpeg',quality:98,maxWidth:1920,maxHeight:1080,everyNthFrame:1});
 await shot('room',2.5);
 // Native room coordinates are read from the authored case, never injected state.
 const objects=[['Window latch',200,418],['Mantel clock',1250,368],['Key register',1492,527],['Folded note',790,593],['Glass box',1092,382],['Guest book',1553,524],['Muddy gloves',372,776],['Umbrella',538,690],['Teacup',736,584],['Quill',858,562],['Chess knight',632,277],['Reading glass',268,584]];
 for(const [label,x,y] of objects){
  await shot('find-'+label.toLowerCase().replaceAll(' ','-'),label==='Window latch'?3.5:2.3,async()=>{
   const point=await page.locator('.sc-overlay').evaluate((el,p)=>{const r=el.getBoundingClientRect();return{x:r.x+p.x*r.width/1600,y:r.y+p.y*r.height/900};},{x,y});
   const surface=await page.locator('.sc-stage').boundingBox();
   if(point.x>surface.x+10&&point.x<surface.x+surface.width-10&&point.y>surface.y+10&&point.y<surface.y+surface.height-10){
    await page.mouse.move(point.x,point.y,{steps:14});await wait(180);await page.mouse.click(point.x,point.y);
   } else {
    await page.getByRole('button',{name:'Objects to find',exact:true}).click();
    const assist=page.getByRole('button',{name:'Assist',exact:true});if(await assist.getAttribute('aria-pressed')!=='true')await assist.click();
    await page.getByRole('button',{name:'Find '+label,exact:true}).click();
    if(await page.getByRole('button',{name:'Close Objects to find',exact:true}).count())await page.getByRole('button',{name:'Close Objects to find',exact:true}).click();
    else await page.keyboard.press('Escape');
   }
  });
 }
 // Record every remaining assisted find through the actual accessibility UI.
 if(await page.getByRole('button',{name:'Objects to find',exact:true}).count()){
  await page.getByRole('button',{name:'Objects to find',exact:true}).click();
  const assist=page.getByRole('button',{name:'Assist',exact:true});if(await assist.getAttribute('aria-pressed')!=='true')await assist.click();
  while(await page.locator('.sc-find-button').count()){await page.locator('.sc-find-button').first().click();await wait(800);}
  await page.keyboard.press('Escape');
 }
 await shot('wrong-lead',4.5,async()=>{await tab('Claims');await challenge('INTRUDER','MUD_PRINT');});
 await shot('disprove-gardener',4,async()=>{await challenge('INTRUDER','ROUND_CHALK');});
 await shot('link',6.5,async()=>{
  await tab('Board');await page.locator('#sc-panel-board button').filter({hasText:'KEY_OUT'}).first().click();await wait(650);
  await page.locator('#sc-panel-board button').filter({hasText:'CLOCK_STOP'}).first().click();await wait(650);
  await page.getByRole('button',{name:'Link selected (2/2)',exact:false}).click();
  await page.locator('.sc-deduction').last().scrollIntoViewIfNeeded();
 });
 await shot('timeline',7,async()=>{await tab('Timeline');await command('!order ROUND PEN DINNER KEY LIFT ALARM');});
 await shot('alibi',4.5,async()=>{await tab('Claims');await page.locator('#sc-challenge-LOCKED').scrollIntoViewIfNeeded();await challenge('LOCKED','KEY_OUT');});
 await shot('verdict',3,async()=>{await tab('Verdict');});
 await shot('reconstruction',24,async()=>{await page.getByRole('button',{name:'Accuse Ada Wren',exact:true}).click();await page.locator('.sc[data-phase="solved"]').waitFor();await page.mouse.move(1880,1030,{steps:12});});
 await page.screenshot({path:join(out,'resolved.png')});
 if(errors.length)throw new Error('Page error during capture');
}catch(error){
 writeFileSync(join(out,'failure.txt'),String(error.stack));await page.screenshot({path:join(out,'failure.png')}).catch(()=>{});throw error;
}finally{
 if(session)await session.send('Page.stopScreencast').catch(()=>{});
 await Promise.all(writes);await context.close();await backup.saveAs(join(out,'original-playwright.webm'));await browser.close();
 const manifest={recordedAt:new Date().toISOString(),type:'Actual local Practice Case; scripted chat; no Twitch or backend commands',epoch,frames,marks,pageErrors:errors,capture:'Chrome painted frames with native timestamps; no game-state injection; independent Playwright original retained'};
 writeFileSync(join(out,'manifest.json'),JSON.stringify(manifest,null,2));
 writeFileSync(join(root,'out/final-practice-current.json'),JSON.stringify({out,manifest:join(out,'manifest.json')},null,2));
 console.log(JSON.stringify({out,frames:frames.length,shots:marks.length,errors:errors.length}));
}
