<script setup lang="ts">
import { useId } from "vue";
import type { CardArtKind } from "../sampleCase/boardCases";

// Line illustrations for the board cards, drawn on a 120 x 84 grid in the Brown Noir palette. Each one shows the
// clue's telling detail (the cut string, the 21:43 punch, the short wick), so a turned card reads at a glance.
defineProps<{ kind: CardArtKind }>();
// Each copy gets its own gradient ids, so a hidden copy never breaks the gradients of the visible ones.
const uid = useId();
const pearl = `${uid}-pearl`;
const brass = `${uid}-brass`;
const flame = `${uid}-flame`;
</script>

<template>
  <svg class="card-art" viewBox="0 0 120 84" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient :id="pearl" cx="0.35" cy="0.3" r="0.75">
        <stop offset="0" stop-color="#fffaf0" />
        <stop offset="0.55" stop-color="#e6dccb" />
        <stop offset="1" stop-color="#a99a86" />
      </radialGradient>
      <linearGradient :id="brass" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#f2d199" />
        <stop offset="1" stop-color="#9c6f35" />
      </linearGradient>
      <radialGradient :id="flame" cx="0.5" cy="0.7" r="0.6">
        <stop offset="0" stop-color="#fff2c4" />
        <stop offset="0.6" stop-color="#f0a040" />
        <stop offset="1" stop-color="#f0a04000" />
      </radialGradient>
    </defs>

    <!-- Cut clasp: a pearl string ending in two clean cut ends. -->
    <g v-if="kind === 'clasp'" fill="none" stroke-linecap="round">
      <path d="M14 22 C34 60 58 66 74 54" stroke="#d8c7a8" stroke-width="1.6" />
      <circle v-for="(p, i) in [[20, 33], [26, 43], [33, 51], [41, 57], [50, 60], [59, 60], [67, 57]]" :key="i" :cx="p[0]" :cy="p[1]" r="4.4" :fill="`url(#${pearl})`" stroke="#8d7c66" stroke-width="0.6" />
      <path d="M80 50 L92 41" stroke="#d8c7a8" stroke-width="1.6" />
      <path d="M76 56 l6 -9 M88 45 l6 -9" stroke="#e7bf7c" stroke-width="1.2" stroke-dasharray="2 2" />
      <rect x="92" y="30" width="16" height="10" rx="2" :fill="`url(#${brass})`" transform="rotate(-24 100 35)" />
      <path d="M70 22 l10 10 M80 22 l-10 10" stroke="#e59a8a" stroke-width="1.4" />
    </g>

    <!-- Punched ticket with the 21:43 stamp. -->
    <g v-else-if="kind === 'ticket'">
      <path d="M18 18 h84 v14 a6 6 0 0 0 0 12 v22 h-84 v-22 a6 6 0 0 0 0 -12 z" fill="#efe1c4" stroke="#8d6a3c" stroke-width="1" />
      <path d="M40 18 v48" stroke="#8d6a3c" stroke-width="0.8" stroke-dasharray="2 2" />
      <text x="24" y="47" fill="#7a5530" font-size="7" font-family="Georgia, serif" transform="rotate(-90 28 44)">NIGHT EXP</text>
      <text x="48" y="34" fill="#5a3d20" font-size="8.5" font-family="Georgia, serif">COMPARTMENT 7</text>
      <rect x="48" y="40" width="44" height="18" rx="3" fill="none" stroke="#b5402f" stroke-width="1.4" transform="rotate(-6 70 49)" />
      <text x="54" y="53.5" fill="#b5402f" font-size="11" font-weight="700" font-family="Georgia, serif" transform="rotate(-6 70 49)">21:43</text>
      <circle cx="96" cy="26" r="3.2" fill="#1a1008" />
    </g>

    <!-- Stopped pocket watch at 21:42. -->
    <g v-else-if="kind === 'watch'">
      <path d="M60 10 v6" :stroke="`url(#${brass})`" stroke-width="3" stroke-linecap="round" />
      <circle cx="60" cy="10" r="4" fill="none" stroke="#c99a52" stroke-width="1.6" />
      <circle cx="60" cy="46" r="29" :fill="`url(#${brass})`" />
      <circle cx="60" cy="46" r="24" fill="#f3ead6" stroke="#7a5530" stroke-width="0.8" />
      <g stroke="#5a3d20" stroke-width="1.2" stroke-linecap="round">
        <path v-for="h in 12" :key="h" :d="`M60 25 v3`" :transform="`rotate(${h * 30} 60 46)`" />
      </g>
      <path d="M60 46 L49 39" stroke="#2a1b11" stroke-width="2.2" stroke-linecap="round" />
      <path d="M60 46 L67 24" stroke="#2a1b11" stroke-width="1.4" stroke-linecap="round" transform="rotate(42 60 46)" />
      <circle cx="60" cy="46" r="1.8" fill="#2a1b11" />
      <path d="M44 34 L58 50 L52 62" fill="none" stroke="#ffffffaa" stroke-width="0.8" />
      <path d="M58 50 L76 44" fill="none" stroke="#ffffffaa" stroke-width="0.8" />
    </g>

    <!-- One loose pearl in the shadow under a seat. -->
    <g v-else-if="kind === 'pearl'">
      <path d="M8 30 h104 v8 h-104 z" fill="#4a2e1a" />
      <path d="M8 38 h104" stroke="#2a1b11" stroke-width="2" />
      <path d="M14 38 v16 M106 38 v16" stroke="#6b4426" stroke-width="3" />
      <ellipse cx="66" cy="68" rx="26" ry="5" fill="#00000066" />
      <circle cx="66" cy="60" r="9" :fill="`url(#${pearl})`" stroke="#8d7c66" stroke-width="0.6" />
      <circle cx="62.5" cy="56.5" r="2.4" fill="#ffffff" />
      <path d="M20 70 h20 M86 70 h18" stroke="#7a5530" stroke-width="1" stroke-dasharray="3 3" />
    </g>

    <!-- A magician's deck, fanned. -->
    <g v-else-if="kind === 'cards'">
      <g v-for="(r, i) in [-30, -15, 0, 15, 30]" :key="i" :transform="`rotate(${r} 60 74)`">
        <rect x="46" y="18" width="28" height="40" rx="3" fill="#f3ead6" stroke="#7a5530" stroke-width="0.8" />
        <rect x="49" y="21" width="22" height="34" rx="2" fill="none" stroke="#b5402f" stroke-width="0.7" />
      </g>
      <text x="51" y="32" fill="#b5402f" font-size="9" font-family="Georgia, serif">A</text>
      <path d="M60 36 c-4 -6 -10 0 0 8 c10 -8 4 -14 0 -8z" fill="#b5402f" />
    </g>

    <!-- Brass ticket punch with a hollow handle. -->
    <g v-else-if="kind === 'punch'">
      <path d="M20 58 C30 30 52 22 70 30 L64 40 C50 36 38 42 32 60 z" :fill="`url(#${brass})`" stroke="#6b4426" stroke-width="0.8" />
      <path d="M70 30 L96 22 L100 30 L72 42 z" fill="#c99a52" stroke="#6b4426" stroke-width="0.8" />
      <path d="M96 22 l8 -2 l-2 10 z" fill="#e7e2d6" stroke="#8d7c66" stroke-width="0.6" />
      <ellipse cx="44" cy="46" rx="7" ry="4" fill="#2a1b11" transform="rotate(-30 44 46)" />
      <circle cx="40" cy="48" r="2" :fill="`url(#${pearl})`" />
      <circle cx="46" cy="44" r="2" :fill="`url(#${pearl})`" />
      <path d="M22 66 q6 4 12 0 M84 50 q4 4 10 0" fill="none" stroke="#e7bf7c" stroke-width="1" stroke-linecap="round" />
    </g>

    <!-- Lighthouse lamp with a wick cut far too short. -->
    <g v-else-if="kind === 'lamp'">
      <path d="M38 14 h44 l-6 10 h-32 z" fill="#3a2616" stroke="#c99a52" stroke-width="1" />
      <path d="M44 24 h32 v38 h-32 z" fill="#f3ead61a" stroke="#c99a52" stroke-width="1" />
      <path d="M50 24 v38 M60 24 v38 M70 24 v38" stroke="#c99a5255" stroke-width="0.8" />
      <ellipse cx="60" cy="52" rx="12" ry="9" :fill="`url(#${flame})`" />
      <rect x="57" y="54" width="6" height="4" fill="#2a1b11" />
      <path d="M56 54 h8" stroke="#e59a8a" stroke-width="1.2" />
      <path d="M40 62 h40 l4 8 h-48 z" fill="#4a2e1a" stroke="#c99a52" stroke-width="1" />
      <path d="M88 44 h16 M88 40 l8 -4 M88 48 l8 4" stroke="#e59a8a" stroke-width="1.2" stroke-linecap="round" />
    </g>

    <!-- Keeper's log, open, with the 21:30 visitor line. -->
    <g v-else-if="kind === 'logbook'">
      <path d="M16 20 q22 -6 44 4 q22 -10 44 -4 v46 q-22 -6 -44 4 q-22 -10 -44 -4 z" fill="#efe1c4" stroke="#7a5530" stroke-width="1" />
      <path d="M60 24 v46" stroke="#7a5530" stroke-width="0.8" />
      <g stroke="#a88a62" stroke-width="0.8">
        <path d="M22 32 h32 M22 40 h32 M22 48 h28 M22 56 h30" />
        <path d="M66 32 h32 M66 56 h28" />
      </g>
      <path d="M64 41 h36 v9 h-36 z" fill="#e7bf7c55" />
      <text x="66" y="48" fill="#5a3d20" font-size="6.5" font-family="Georgia, serif">21:30 Capt. Rook</text>
    </g>

    <!-- Salt-stiff boot print on the stairs. -->
    <g v-else-if="kind === 'boot'">
      <path d="M8 62 h26 v-12 h26 v-12 h26 v-12 h26" fill="none" stroke="#6b4426" stroke-width="2" />
      <g transform="rotate(-18 62 46)">
        <path d="M50 30 c0 -10 22 -10 22 0 v12 c0 6 -22 6 -22 0 z" fill="#d8d2c4cc" />
        <path d="M52 50 c0 -4 18 -4 18 0 v6 c0 6 -18 6 -18 0 z" fill="#d8d2c4cc" />
        <path d="M54 30 h14 M54 35 h14 M54 40 h14" stroke="#8d7c66" stroke-width="0.8" />
      </g>
      <text x="82" y="74" fill="#e7bf7c" font-size="9" font-weight="700" font-family="Georgia, serif">11</text>
      <circle cx="32" cy="44" r="1.2" fill="#ffffffaa" />
      <circle cx="40" cy="70" r="1" fill="#ffffffaa" />
    </g>

    <!-- Oil tins, every one full. -->
    <g v-else-if="kind === 'oil'">
      <g v-for="(x, i) in [18, 46, 74]" :key="i">
        <rect :x="x" y="26" width="26" height="40" rx="3" fill="#6b4426" stroke="#c99a52" stroke-width="1" />
        <rect :x="x + 9" y="20" width="8" height="6" rx="1" fill="#c99a52" />
        <rect :x="x + 3" y="34" width="20" height="10" fill="#efe1c4" />
        <text :x="x + 6" y="42" fill="#5a3d20" font-size="6.5" font-family="Georgia, serif">FULL</text>
        <path :d="`M${x + 3} 56 h20`" stroke="#e7bf7c" stroke-width="1.6" />
      </g>
    </g>

    <!-- Tide table: the Teeth dry from 23:00 to 23:20 only. -->
    <g v-else-if="kind === 'tide'">
      <rect x="10" y="12" width="100" height="62" rx="3" fill="#efe1c4" stroke="#7a5530" stroke-width="1" />
      <path d="M16 56 C30 30 44 30 58 50 S86 70 104 36" fill="none" stroke="#3f6b7a" stroke-width="2" />
      <path d="M16 48 h88" stroke="#b5402f" stroke-width="0.9" stroke-dasharray="3 2" />
      <rect x="52" y="20" width="16" height="48" fill="#b5402f22" />
      <text x="46" y="18" fill="#b5402f" font-size="6.5" font-family="Georgia, serif">23:00–23:20</text>
      <path d="M54 60 l4 -6 l3 4 l3 -5 l3 7" fill="#2a1b11" />
    </g>

    <!-- Harbour radio set with the 23:02 call. -->
    <g v-else-if="kind === 'radio'">
      <rect x="14" y="26" width="92" height="44" rx="6" fill="#3a2616" stroke="#c99a52" stroke-width="1" />
      <rect x="22" y="34" width="46" height="18" rx="2" fill="#f0c97a33" stroke="#c99a52" stroke-width="0.8" />
      <path d="M26 46 h38" stroke="#e7bf7c" stroke-width="0.8" />
      <path d="M44 38 v12" stroke="#e59a8a" stroke-width="1.4" />
      <circle cx="84" cy="44" r="9" :fill="`url(#${brass})`" />
      <circle cx="84" cy="44" r="3" fill="#3a2616" />
      <path d="M30 26 L20 10" stroke="#c99a52" stroke-width="1.4" />
      <path d="M26 12 a10 10 0 0 1 8 6 M28 6 a16 16 0 0 1 12 10" fill="none" stroke="#e7bf7c" stroke-width="1" />
      <text x="24" y="64" fill="#e7bf7c" font-size="8" font-family="Georgia, serif">23:02</text>
    </g>

    <!-- Cargo manifest stamped with the strongbox weight. -->
    <g v-else-if="kind === 'manifest'">
      <path d="M24 10 h58 l14 14 v52 h-72 z" fill="#efe1c4" stroke="#7a5530" stroke-width="1" />
      <path d="M82 10 v14 h14" fill="none" stroke="#7a5530" stroke-width="1" />
      <g stroke="#a88a62" stroke-width="0.8">
        <path d="M32 26 h40 M32 34 h52 M32 42 h46 M32 66 h30" />
      </g>
      <g transform="rotate(-10 62 56)">
        <rect x="44" y="47" width="40" height="17" rx="3" fill="none" stroke="#b5402f" stroke-width="1.4" />
        <text x="50" y="60" fill="#b5402f" font-size="11" font-weight="700" font-family="Georgia, serif">4 kg</text>
      </g>
    </g>

    <!-- Lifeboat on its falls, lowered early. -->
    <g v-else-if="kind === 'boat'">
      <path d="M30 8 v26 M90 8 v26" stroke="#c99a52" stroke-width="1.2" />
      <path d="M20 34 h80 l-10 18 h-60 z" fill="#b5402f" stroke="#2a1b11" stroke-width="1" />
      <path d="M26 40 h68" stroke="#efe1c4" stroke-width="2" />
      <path d="M8 64 q8 -6 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0" fill="none" stroke="#3f6b7a" stroke-width="2" />
      <path d="M8 72 q8 -6 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0" fill="none" stroke="#3f6b7a88" stroke-width="1.5" />
      <text x="44" y="30" fill="#e7bf7c" font-size="8" font-family="Georgia, serif">23:05</text>
    </g>
  </svg>
</template>

<style scoped>
.card-art {
  display: block;
  width: 100%;
  height: auto;
}
</style>
