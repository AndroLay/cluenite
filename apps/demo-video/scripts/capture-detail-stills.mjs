// High-density screenshots of real local UI, through the app's normal controls.
// These support editorial close-ups; no app state is injected or network mocked.
import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync,copyFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';

const root=resolve('.');
const dest=join(root,'public','motion-ui');
const evidence=join(root,'out','detail-capture-'+Date.now());
for(const p of [dest,evidence])mkdirSync(p,{recursive:true});
const browser=await chromium.launch();
const recording=process.argv.includes('--record');
const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:2,recordVideo:recording?{dir:join(evidence,'video'),size:{width:1920,height:1080}}:undefined});
const epoch=Date.now();
const page=await context.newPage();
const video=page.video();
let recordStart=0,recordEnd=0;
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
const boxes={};
async function save(name,locator){
  const path=join(evidence,name+'.png');
  if(locator){boxes[name]=await locator.boundingBox();await locator.screenshot({path});}
  else await page.screenshot({path});
  copyFileSync(path,join(dest,name+'.png'));
}
try{
  await page.goto((process.env.CLUENITE_WEB_URL||'http://127.0.0.1:5175')+'/?view=quick',{waitUntil:'load'});
  await page.evaluate(()=>document.fonts.ready);
  await page.getByRole('button',{name:'Skip the intro',exact:true}).click();
  await page.locator('.sc[data-phase="investigating"]').waitFor();
  await page.evaluate(()=>window.scrollTo(0,90));
  await page.mouse.move(1800,1000);
  await save('room');
  recordStart=(Date.now()-epoch)/1000;
  await page.waitForTimeout(500);
  const point=()=>page.locator('.sc-overlay').evaluate(el=>{const r=el.getBoundingClientRect();return{x:r.x+220*r.width/1600,y:r.y+436*r.height/900};});
  const before=await point();
  await page.mouse.move(before.x,before.y,{steps:3});
  await page.waitForTimeout(250);
  const target=await point();
  await page.mouse.click(target.x,target.y);
  await page.locator('.sc-findbar li').filter({hasText:'Window latch'}).locator('.visually-hidden').waitFor({state:'attached'});
  await page.getByRole('tab',{name:/^Board/}).click();
  await page.evaluate(()=>window.scrollTo(0,90));
  await page.mouse.move(1800,1020);
  await page.waitForTimeout(900);
  recordEnd=(Date.now()-epoch)/1000;
  await save('window-board');
  for(const [name,id] of [['mud','MUD_PRINT'],['round','ROUND_CHALK']])await save(name,page.locator('.sc-record').filter({hasText:id}));
  if(process.argv.includes('--full')){
  await page.getByRole('button',{name:'Assist',exact:true}).click();
  for(const name of ['Mantel clock','Key register','Glass box','Folded note','Guest book','Muddy gloves','Umbrella','Teacup','Quill','Chess knight','Reading glass'])await page.getByRole('button',{name:'Find '+name,exact:true}).click();
  await page.getByRole('button',{name:'Assist',exact:true}).click();
  await page.getByRole('tab',{name:/^Board/}).click();
  await page.evaluate(()=>window.scrollTo(0,90));
  for(const [name,id] of [['clock','CLOCK_STOP'],['key','KEY_OUT']])await save(name,page.locator('.sc-record').filter({hasText:id}));
  await save('board');
  await page.locator('.sc-record').filter({hasText:'CLOCK_STOP'}).click();
  await page.locator('.sc-record').filter({hasText:'KEY_OUT'}).click();
  await page.getByRole('button',{name:'Link selected (2/2)',exact:true}).click();
  await page.locator('.sc-deduction').filter({hasText:'The box opened while the key was out'}).waitFor();
  await page.evaluate(()=>window.scrollTo(0,90));
  await page.waitForTimeout(300);
  await save('linked');
  await save('deduction',page.locator('.sc-deduction').filter({hasText:'The box opened while the key was out'}));
  if(process.argv.includes('--ending')){
    const selectTab=async name=>{
      await page.getByRole('tab',{name:new RegExp('^'+name)}).click();
      await page.evaluate(()=>window.scrollTo(0,90));
    };
    const challenge=async(id,record)=>{
      await page.locator('#sc-challenge-'+id).selectOption(record);
      await page.locator('.sc-claim').filter({has:page.locator('#sc-challenge-'+id)}).getByRole('button',{name:'Challenge',exact:true}).click();
      await page.locator('.sc-claim').filter({hasText:id}).getByText('Disproven',{exact:true}).waitFor();
      await page.evaluate(()=>window.scrollTo(0,90));
    };
    await selectTab('Claims');
    await challenge('INTRUDER','ROUND_CHALK');
    await save('intruder-result',page.locator('.sc-claim').filter({hasText:'INTRUDER'}));
    await selectTab('Timeline');
    const order=['ALARM','LIFT','ROUND','KEY','DINNER','PEN'];
    for(const [target,id] of ['ROUND','PEN','DINNER','KEY','LIFT','ALARM'].entries()){
      let index=order.indexOf(id);
      while(index>target){
        await page.getByRole('button',{name:'Move '+id+' earlier',exact:true}).click();
        [order[index-1],order[index]]=[order[index],order[index-1]];
        index--;
      }
    }
    await page.getByRole('button',{name:'Check the order',exact:true}).click();
    await page.evaluate(()=>window.scrollTo(0,90));
    await save('timeline-result');
    await selectTab('Claims');
    await challenge('LOCKED','KEY_OUT');
    await save('locked-result',page.locator('.sc-claim').filter({hasText:'LOCKED'}));
    await selectTab('Verdict');
    await page.getByRole('button',{name:'Accuse Ada Wren',exact:true}).click();
    await page.locator('.sc-twist').waitFor({state:'visible',timeout:45000});
    await page.evaluate(()=>window.scrollTo(0,90));
    await save('coat-result');
    await save('coat-line',page.locator('.sc-twist'));
  }
  }
  if(errors.length)throw new Error('Page errors during screenshot capture');
  const manifest={capturedAt:new Date().toISOString(),viewport:{width:1920,height:1080},deviceScaleFactor:2,label:'Actual local public sample; scripted viewers; normal canvas find; remaining finds use Assist only with --full',boxes,errors,evidence,recordStart,recordEnd};
  writeFileSync(join(dest,'manifest.json'),JSON.stringify(manifest,null,2));
  writeFileSync(join(evidence,'manifest.json'),JSON.stringify(manifest,null,2));
  if(recording)writeFileSync(join(dest,'window-find-source.json'),JSON.stringify(manifest,null,2));
  console.log(JSON.stringify({captured:Object.keys(boxes),errors:errors.length,evidence}));
}catch(e){await page.screenshot({path:join(evidence,'failure.png')}).catch(()=>{});throw e;}
finally{await context.close();await browser.close();}
if(recording&&video){
  const duration=recordEnd-recordStart;
  const result=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-ss',String(recordStart),'-i',await video.path(),'-vf',`setpts=${4/duration}*(PTS-STARTPTS),fps=30,tpad=stop_mode=clone:stop_duration=2,trim=duration=4,format=yuv420p`,'-t','4','-an','-c:v','libx264','-threads','2','-preset','fast','-crf','17','-movflags','+faststart',join(dest,'window-find.mp4')],{encoding:'utf8'});
  if(result.status!==0)throw new Error('Detail video encode failed: '+result.stderr.slice(-300));
}
