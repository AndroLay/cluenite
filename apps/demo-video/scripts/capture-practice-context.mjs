// Captures the real public mode selection. No account or game state is injected.
import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const out=join(root,'out/practice165-context');
mkdirSync(join(out,'video'),{recursive:true});
const browser=await chromium.launch();
const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:2,recordVideo:{dir:join(out,'video'),size:{width:1920,height:1080}}});
const page=await context.newPage();const video=page.video();const errors=[];
page.on('pageerror',error=>errors.push(error.message.slice(0,180)));
try{
 await page.goto('http://127.0.0.1:5173/play#practice',{waitUntil:'networkidle',timeout:20000});
 await page.evaluate(()=>document.fonts.ready);
 await page.locator('#practice').scrollIntoViewIfNeeded();
 await page.mouse.move(1870,1030);
 await page.waitForTimeout(1200);
 await page.screenshot({path:join(out,'mode-selection.png')});
 const box=await page.locator('#practice').boundingBox();
 const startedAt=new Date().toISOString();
 await page.waitForTimeout(10000);
 await page.close();await video.saveAs(join(out,'mode-selection.webm'));
 writeFileSync(join(out,'manifest.json'),JSON.stringify({startedAt,url:'http://127.0.0.1:5173/play#practice',captureType:'Public local mode selection',viewport:[1920,1080],deviceScaleFactor:2,box,errors,externalMutation:false},null,2));
 if(errors.length)throw new Error('Mode capture has page errors: '+errors.join('; '));
 console.log(JSON.stringify({captured:'mode-selection',errors:0}));
}finally{await context.close();await browser.close();}
