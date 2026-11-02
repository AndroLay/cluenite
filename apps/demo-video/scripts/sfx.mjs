// Synthesizes the sound effects locally with ffmpeg (aevalsrc). No third-party samples.
// Run: node scripts/sfx.mjs
// Output: public/audio/sfx/*.wav, referenced by src/audio/Sfx.tsx.

import {spawnSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'public', 'audio', 'sfx');
const SAMPLE_RATE = 44100;

// Each effect: a sample expression in t (seconds), its length, and a short fade-out.
// Expressions contain no commas, so they pass through the filtergraph unescaped.
const EFFECTS = [
  {
    // Soft two-tone chime for a board update or the wordmark reveal.
    file: 'chime.wav',
    seconds: 1.2,
    expr: '(0.5*sin(2*PI*1318.5*t)+0.3*sin(2*PI*1975.5*t))*exp(-3.5*t)',
  },
  {
    // Short click for each tile or chat line appearing.
    file: 'tick.wav',
    seconds: 0.08,
    expr: 'sin(2*PI*2400*t)*exp(-90*t)',
  },
  {
    // Low thump with a small high click for the VERIFIED stamp.
    file: 'stamp.wav',
    seconds: 0.4,
    expr: '0.9*sin(2*PI*85*t)*exp(-16*t)+0.2*sin(2*PI*1200*t)*exp(-60*t)',
  },
];

mkdirSync(OUT_DIR, {recursive: true});

for (const effect of EFFECTS) {
  const out = join(OUT_DIR, effect.file);
  const fadeStart = Math.max(0, effect.seconds - 0.05).toFixed(3);
  const args = [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-f',
    'lavfi',
    '-i',
    `aevalsrc=${effect.expr}:s=${SAMPLE_RATE}:d=${effect.seconds}`,
    '-af',
    `volume=0.5,afade=t=out:st=${fadeStart}:d=0.05`,
    '-ac',
    '1',
    '-c:a',
    'pcm_s16le',
    out,
  ];
  const result = spawnSync('ffmpeg', args, {encoding: 'utf8'});
  if (result.status !== 0) {
    console.error(`ffmpeg failed for ${effect.file}: ${result.stderr.trim()}`);
    process.exit(1);
  }
  console.log(`wrote ${effect.file} (${effect.seconds}s)`);
}
