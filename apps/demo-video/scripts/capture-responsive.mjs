// Records real browser captures of the signed-out Cluenite public pages at 390 px and 1280 px,
// measures horizontal overflow per page, and composes one 1920x1080 clip for the S6 footage slot.
// Requires the web dev server at http://localhost:5173 (run `npm run dev` from the repo root).
// Run: node scripts/capture-responsive.mjs
// Raw clips, screenshots, and report.json go to out/raw/responsive/ (git-ignored).
// Output: public/footage/S6-responsive.mp4

import {chromium} from '@playwright/test';
import {mkdirSync, renameSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW_DIR = join(ROOT, 'out', 'raw', 'responsive');
const OUT_FILE = join(ROOT, 'public', 'footage', 'S6-responsive.mp4');
const BASE_URL = process.env.CLUENITE_WEB_URL ?? 'http://localhost:5173';

const ROUTES = ['/guide', '/settings', '/setup', '/coop'];
const PHONE = {name: 'phone', width: 390, height: 844};
const DESKTOP = {name: 'desktop', width: 1280, height: 800};

// Each route gets a fixed slot so both widths stay in step (4 x 8 s = 32 s, as in the plan).
const CLIP_SECONDS = 8;
const HOLD_MS = 1200;
const SCROLL_STEPS = 40;
const SCROLL_MS = 4500;

// Frame layout: phone (scaled to 720 px high) on the left, desktop (scaled to 1152x720) on the right.
// The phone stays above the lower-third caption band (caption starts near y=897).
const FRAME = {width: 1920, height: 1080, background: '0x120c08'};
const PHONE_BOX = {w: 332, h: 720, x: 198, y: 180};
const DESKTOP_BOX = {w: 1152, h: 720, x: 570, y: 180};

const run = (args) => {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...args], {encoding: 'utf8'});
  if (result.status !== 0) {
    console.error(`ffmpeg failed: ${result.stderr.trim()}`);
    process.exit(1);
  }
};

const captureRoute = async (browser, viewport, route) => {
  const slug = route.slice(1);
  const context = await browser.newContext({
    viewport: {width: viewport.width, height: viewport.height},
    deviceScaleFactor: 1,
    recordVideo: {dir: join(RAW_DIR, 'tmp'), size: {width: viewport.width, height: viewport.height}},
  });
  const page = await context.newPage();
  const video = page.video();

  await page.goto(BASE_URL + route, {waitUntil: 'load'});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(HOLD_MS);

  const metrics = await page.evaluate(() => {
    const root = document.documentElement;
    return {
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
      scrollHeight: root.scrollHeight,
      clientHeight: root.clientHeight,
    };
  });
  const finalPath = new URL(page.url()).pathname;
  await page.screenshot({path: join(RAW_DIR, 'shots', `${slug}-${viewport.name}.png`)});

  // Scroll slowly so the clip shows the full page, not only the first screen.
  const maxScroll = Math.max(0, metrics.scrollHeight - metrics.clientHeight);
  for (let step = 1; step <= SCROLL_STEPS; step++) {
    const top = Math.round((maxScroll * step) / SCROLL_STEPS);
    await page.evaluate((y) => window.scrollTo(0, y), top);
    await page.waitForTimeout(SCROLL_MS / SCROLL_STEPS);
  }

  await context.close();
  const clipPath = join(RAW_DIR, `${slug}-${viewport.name}.webm`);
  renameSync(await video.path(), clipPath);

  return {
    clipPath,
    finalPath,
    scrollWidth: metrics.scrollWidth,
    clientWidth: metrics.clientWidth,
    overflowPx: Math.max(0, metrics.scrollWidth - metrics.clientWidth),
  };
};

const composeRoute = (phoneClip, desktopClip, out) => {
  const filter = [
    `[0:v]tpad=stop_mode=clone:stop_duration=${CLIP_SECONDS},trim=0:${CLIP_SECONDS},setpts=PTS-STARTPTS,scale=-2:${PHONE_BOX.h}[p]`,
    `[1:v]tpad=stop_mode=clone:stop_duration=${CLIP_SECONDS},trim=0:${CLIP_SECONDS},setpts=PTS-STARTPTS,scale=${DESKTOP_BOX.w}:${DESKTOP_BOX.h}[d]`,
    `color=c=${FRAME.background}:s=${FRAME.width}x${FRAME.height}:r=30:d=${CLIP_SECONDS}[bg]`,
    `[bg][p]overlay=x=${PHONE_BOX.x}:y=${PHONE_BOX.y}[t]`,
    `[t][d]overlay=x=${DESKTOP_BOX.x}:y=${DESKTOP_BOX.y},format=yuv420p[v]`,
  ].join(';');
  run([
    '-y', '-i', phoneClip, '-i', desktopClip,
    '-filter_complex', filter, '-map', '[v]', '-an',
    '-r', '30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', out,
  ]);
};

const main = async () => {
  rmSync(RAW_DIR, {recursive: true, force: true});
  mkdirSync(join(RAW_DIR, 'shots'), {recursive: true});
  mkdirSync(join(RAW_DIR, 'tmp'), {recursive: true});

  const browser = await chromium.launch();
  const report = {baseUrl: BASE_URL, capturedAt: new Date().toISOString(), routes: []};
  const composites = [];

  try {
    for (const route of ROUTES) {
      const phone = await captureRoute(browser, PHONE, route);
      const desktop = await captureRoute(browser, DESKTOP, route);
      const composite = join(RAW_DIR, `composite-${route.slice(1)}.mp4`);
      composeRoute(phone.clipPath, desktop.clipPath, composite);
      composites.push(composite);
      report.routes.push({
        route,
        finalPath: desktop.finalPath,
        phone: {overflowPx: phone.overflowPx, scrollWidth: phone.scrollWidth, clientWidth: phone.clientWidth},
        desktop: {overflowPx: desktop.overflowPx, scrollWidth: desktop.scrollWidth, clientWidth: desktop.clientWidth},
      });
    }
  } finally {
    await browser.close();
  }

  const listPath = join(RAW_DIR, 'concat.txt');
  writeFileSync(listPath, composites.map((file) => `file '${file.replace(/\\/g, '/')}'`).join('\n'));
  mkdirSync(dirname(OUT_FILE), {recursive: true});
  run(['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', '-movflags', '+faststart', OUT_FILE]);

  writeFileSync(join(RAW_DIR, 'report.json'), JSON.stringify(report, null, 2));
  for (const entry of report.routes) {
    console.log(
      `${entry.route} -> ${entry.finalPath} | overflow 390: ${entry.phone.overflowPx}px | overflow 1280: ${entry.desktop.overflowPx}px`,
    );
  }
  console.log(`wrote ${OUT_FILE}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
