// Records the real public sample through its UI. No mocked network, injected game
// state, Twitch messages, or authentication is used. All viewers are the app's
// explicitly labeled scripted sample viewers.
import {chromium} from '@playwright/test';
import {mkdirSync, writeFileSync, renameSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW = join(ROOT, 'out', 'production-capture-' + new Date().toISOString().replace(/[:.]/g,'-'));
const DEST = join(ROOT, 'public', 'film');
const BASE = process.env.CLUENITE_WEB_URL ?? 'http://127.0.0.1:5175';
mkdirSync(join(RAW, 'shots'), {recursive: true});
mkdirSync(join(RAW, 'video'), {recursive: true});
mkdirSync(DEST, {recursive: true});

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: {width: 1920, height: 1080}, deviceScaleFactor: 1,
  recordVideo: {dir: join(RAW, 'video'), size: {width: 1920, height: 1080}},
});
const epoch = Date.now();
const page = await context.newPage();
const video = page.video();
const shots = [];
const errors = [];
page.on('pageerror', e => errors.push(e.message.slice(0, 180)));
const hold = ms => page.waitForTimeout(ms);
const tab = async name => {
  await page.getByRole('tab', {name: new RegExp('^' + name)}).click();
  await page.evaluate(() => window.scrollTo(0, 90));
  await hold(350);
};
async function shot(id, seconds, action = async () => {}) {
  const start = (Date.now() - epoch) / 1000;
  console.log('Capturing ' + id);
  await action();
  const spent = (Date.now() - epoch) / 1000 - start;
  await hold(Math.max(250, (seconds - spent) * 1000));
  const duration = (Date.now() - epoch) / 1000 - start;
  await page.screenshot({path: join(RAW, 'shots', id + '.png')});
  shots.push({id, start: Math.round(start * 1000) / 1000, duration: Math.round(duration * 1000) / 1000});
  writeFileSync(join(RAW, 'markers.json'), JSON.stringify({baseUrl: BASE, capturedAt: new Date().toISOString(), label: 'Playable local sample; scripted viewers; no Twitch connection', shots, errors}, null, 2));
}

// Design-space hit boxes come from the actual authored case. The DOM overlay
// shares the Pixi camera transform, so it locates real objects without changing state.
async function findObject(label, x, y) {
  await page.evaluate(() => window.scrollTo(0, 90));
  const point = await page.locator('.sc-overlay').evaluate((el, p) => {
    const r = el.getBoundingClientRect();
    return {x: r.x + p.x * r.width / 1600, y: r.y + p.y * r.height / 900};
  }, {x, y});
  await page.mouse.move(point.x, point.y, {steps: 3});
  await hold(180);
  const adjusted = await page.locator('.sc-overlay').evaluate((el, p) => {
    const r = el.getBoundingClientRect();
    return {x: r.x + p.x * r.width / 1600, y: r.y + p.y * r.height / 900};
  }, {x, y});
  const visible = await page.locator('.sc-stage').boundingBox();
  if (adjusted.x > visible.x+visible.width-5 || adjusted.x < visible.x+5) {
    // The real camera crops some objects at the room edge. Use the app's
    // accessible Assist affordance rather than clicking through the sidebar.
    await page.getByRole('button',{name:'Assist',exact:true}).click();
    await page.getByRole('button',{name:'Find '+label,exact:true}).click();
    await page.getByRole('button',{name:'Assist',exact:true}).click();
    await page.evaluate(() => window.scrollTo(0,90));
  } else await page.mouse.click(adjusted.x, adjusted.y);
  await page.locator('.sc-findbar li').filter({hasText: label}).locator('.visually-hidden').waitFor({state: 'attached', timeout: 3500});
}

async function challenge(id, record) {
  await page.locator('#sc-challenge-' + id).selectOption(record);
  const card = page.locator('.sc-claim').filter({has: page.locator('#sc-challenge-' + id)});
  await card.getByRole('button', {name: 'Challenge'}).click();
  await hold(700);
}

try {
  await page.goto(BASE + '/?view=quick', {waitUntil: 'load'});
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.sc-canvas canvas').waitFor();
  await hold(900);
  await shot('opening', 5);
  await shot('room', 6, async () => {
    await page.getByRole('button', {name: 'Skip the intro', exact: true}).click();
    await page.locator('.sc[data-phase="investigating"]').waitFor();
    await page.evaluate(() => window.scrollTo(0, 90));
    await page.mouse.move(1300, 970, {steps: 12});
  });
  await shot('find-window', 5.2, () => findObject('Window latch', 220, 436));
  await shot('find-note', 4.8, () => findObject('Folded note', 815, 606));
  await shot('find-clock', 5.2, () => findObject('Mantel clock', 1286, 416));
  await shot('find-register', 5.2, () => findObject('Key register', 1520, 539));
  await shot('search-combo', 10, async () => {
    for (const [label,x,y] of [
      ['Glass box',1134,418], ['Guest book',1576,535], ['Muddy gloves',411,793],
      ['Umbrella',558,768], ['Teacup',757,596], ['Quill',872,586],
      ['Chess knight',644,294], ['Reading glass',292,593],
    ]) { await findObject(label,x,y); await hold(500); }
  });
  await shot('red-herring', 11, async () => {
    await tab('Claims');
    await challenge('INTRUDER', 'MUD_PRINT');
    await hold(2200);
    await challenge('INTRUDER', 'ROUND_CHALK');
    await page.locator('.sc-claim').filter({hasText:'INTRUDER'}).getByText('Disproven', {exact:true}).waitFor();
  });
  await shot('link', 13, async () => {
    await tab('Board');
    await page.locator('#sc-panel-board button').filter({hasText:'KEY_OUT'}).click();
    await hold(600);
    await page.locator('#sc-panel-board button').filter({hasText:'CLOCK_STOP'}).click();
    await hold(800);
    await page.getByRole('button', {name:'Link selected (2/2)',exact:false}).click();
    await page.locator('.sc-deduction').filter({hasText:'The box opened while the key was out'}).waitFor();
    await page.locator('.sc-deduction').last().scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, 90));
  });
  await shot('timeline', 18, async () => {
    await tab('Timeline');
    await page.getByRole('button',{name:'Check the order',exact:true}).click();
    await hold(1600);
    const current = ['ALARM','LIFT','ROUND','KEY','DINNER','PEN'];
    for (const [target,id] of ['ROUND','PEN','DINNER','KEY','LIFT','ALARM'].entries()) {
      let index=current.indexOf(id);
      while (index>target) {
        await page.getByRole('button',{name:'Move '+id+' earlier',exact:true}).click();
        [current[index-1],current[index]]=[current[index],current[index-1]];
        index--; await hold(200);
      }
    }
    await page.getByRole('button',{name:'Check the order',exact:true}).click();
    await hold(1200);
    await page.evaluate(() => window.scrollTo(0, 90));
  });
  await shot('lie', 10, async () => {
    await tab('Claims');
    await page.locator('#sc-challenge-LOCKED').scrollIntoViewIfNeeded();
    await hold(1400);
    await challenge('LOCKED','KEY_OUT');
    await page.locator('.sc-claim').filter({hasText:'LOCKED'}).getByText('Disproven',{exact:true}).waitFor();
    await page.evaluate(() => window.scrollTo(0, 90));
  });
  await shot('verdict', 7, async () => {
    await tab('Verdict');
    await page.getByRole('button',{name:'Accuse Tomas Reed',exact:true}).click();
    await hold(2400);
    await page.getByRole('button',{name:'Accuse Ada Wren',exact:true}).scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, 90));
  });
  await shot('reveal', 24, async () => {
    await page.getByRole('button',{name:'Accuse Ada Wren',exact:true}).click();
    await page.locator('.sc[data-phase="solved"]').waitFor();
    await page.evaluate(() => window.scrollTo(0, 90));
    await page.mouse.move(1800,1020,{steps:12});
  });
  await shot('report', 5, async () => {
    await page.getByRole('heading',{name:'Case report',exact:true}).waitFor();
    await page.evaluate(() => window.scrollTo(0,90));
  });
  await shot('menu', 6, async () => {
    await page.goto(BASE+'/play', {waitUntil:'load'});
    await page.evaluate(() => document.fonts.ready);
  });
  await shot('m01', 7, async () => {
    await page.goto(BASE+'/?view=mystery', {waitUntil:'load'});
    await page.evaluate(() => document.fonts.ready);
  });
  await shot('landing', 5, async () => {
    await page.goto(BASE+'/', {waitUntil:'load'});
    await page.evaluate(() => document.fonts.ready);
  });
  if (errors.length) throw new Error('Page errors during capture: ' + errors.join('; '));
} catch (e) {
  writeFileSync(join(RAW,'capture-failure.txt'), String(e.stack));
  await page.screenshot({path:join(RAW,'failure.png')}).catch(()=>{});
  throw e;
} finally {
  await context.close();
  await browser.close();
}
const rawFile = join(RAW,'sample-ui.webm');
renameSync(await video.path(),rawFile);
const {prepareClips}=await import('./prepare-clips.mjs');
await prepareClips(RAW);
console.log(JSON.stringify({captured:shots.length,errors:errors.length,output:'public/'+(process.env.CLUENITE_CLIP_SET||'film'),source:'real local public sample UI'}));
