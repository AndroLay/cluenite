// Records real browser captures of two public app screens that need no Twitch session:
// the Quick Case sample (plays in the browser, scripted chat) and the M01 visual preview (not playable).
// The video labels both as a sample or preview, never as a live round.
// Requires the web dev server at http://localhost:5173 (run `npm run dev` from the repo root).
// Run: node scripts/capture-sample.mjs
// Raw clips go to out/raw/sample/ (git-ignored).
// Output: public/footage/S4-sample.mp4 and public/footage/S4-preview.mp4

import {chromium} from '@playwright/test';
import {mkdirSync, renameSync, rmSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW_DIR = join(ROOT, 'out', 'raw', 'sample');
const FOOTAGE_DIR = join(ROOT, 'public', 'footage');
const BASE_URL = process.env.CLUENITE_WEB_URL ?? 'http://localhost:5173';

// 16:9 viewport, so the 1600x900 capture scales to 1920x1080 without letterboxing.
const VIEWPORT = {width: 1600, height: 900};
const SAMPLE_FINDS = ['Folded note', 'Glass box', 'Mantel clock', 'Key register'];

const run = (args) => {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...args], {encoding: 'utf8'});
  if (result.status !== 0) {
    console.error(`ffmpeg failed: ${result.stderr.trim()}`);
    process.exit(1);
  }
};

const recordScreen = async (browser, name, play) => {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    recordVideo: {dir: join(RAW_DIR, 'tmp'), size: VIEWPORT},
  });
  const page = await context.newPage();
  const video = page.video();
  try {
    await play(page);
  } finally {
    await context.close();
  }
  const clipPath = join(RAW_DIR, `${name}.webm`);
  renameSync(await video.path(), clipPath);
  return clipPath;
};

// Opens the sample, then clicks a few hidden objects so the notebook and score visibly change.
const playSample = async (page) => {
  await page.goto(`${BASE_URL}/?view=quick`, {waitUntil: 'load'});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2000);
  await page.getByRole('button', {name: 'Open the case'}).click();
  await page.waitForTimeout(2500);
  let clicked = 0;
  for (const label of SAMPLE_FINDS) {
    const item = page.getByRole('button', {name: label}).first();
    if (await item.isVisible().catch(() => false)) {
      await item.click();
      clicked += 1;
    }
    await page.waitForTimeout(1800);
  }
  if (clicked === 0) throw new Error('No sample find button was clickable; the capture would show nothing.');
  await page.waitForTimeout(1500);
  console.log(`sample: clicked ${clicked} of ${SAMPLE_FINDS.length} finds`);
};

// Holds on the M01 preview, then scrolls it top to bottom at a readable pace.
const scrollPreview = async (page) => {
  await page.goto(`${BASE_URL}/?view=mystery`, {waitUntil: 'load'});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2000);
  const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  const steps = 40;
  for (let step = 1; step <= steps; step++) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round((Math.max(0, maxScroll) * step) / steps));
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(1000);
};

const transcode = (clipPath, out, seconds) => {
  run([
    '-y', '-i', clipPath, '-t', String(seconds),
    '-vf', 'scale=1920:1080:flags=lanczos,fps=30,format=yuv420p',
    '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-movflags', '+faststart', out,
  ]);
};

const main = async () => {
  rmSync(RAW_DIR, {recursive: true, force: true});
  mkdirSync(join(RAW_DIR, 'tmp'), {recursive: true});
  mkdirSync(FOOTAGE_DIR, {recursive: true});

  const browser = await chromium.launch();
  try {
    const sampleClip = await recordScreen(browser, 'sample', playSample);
    const previewClip = await recordScreen(browser, 'preview', scrollPreview);
    transcode(sampleClip, join(FOOTAGE_DIR, 'S4-sample.mp4'), 20);
    transcode(previewClip, join(FOOTAGE_DIR, 'S4-preview.mp4'), 12);
  } finally {
    await browser.close();
  }
  console.log('wrote public/footage/S4-sample.mp4 and public/footage/S4-preview.mp4');
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
