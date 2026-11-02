<script setup lang="ts">
/* global SVGSVGElement, SVGElement, IntersectionObserver, ResizeObserver */
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from "vue";
import { gsap } from "gsap";
import { reduceMotion } from "./settings";
import type { CaseStage } from "../scene/caseStage";

// The vector illustration is also the sharp fallback. PixiJS animates its cached GPU layers during play.
const props = withDefaults(
  defineProps<{
    kind: "express" | "lighthouse";
    variant?: "hero" | "strip";
    /** Lamps out on the train; the light out at the lighthouse. */
    dark?: boolean;
    /** Lighthouse only: the Marigold on the rocks. */
    wreck?: boolean;
    paused?: boolean;
    progress?: number;
    connections?: number;
    shares?: number;
  }>(),
  { variant: "hero", dark: false, wreck: false, paused: false, progress: 0, connections: 0, shares: 0 },
);
const emit = defineEmits<{ lightning: [strength: number] }>();

const root = ref<SVGSVGElement | null>(null);
const host = ref<HTMLElement | null>(null);
const ready = ref(false);
const rendererState = ref("waiting-size");
let stage: CaseStage | null = null;
let disposed = false;
let starting = false;
let failed = false;
let startupResize: ResizeObserver | null = null;
// Gradient ids are unique per copy, so the cover scene and the case-bar strip never share a definition.
const uid = useId();
const id = (name: string): string => `${uid}-${name}`;
const url = (name: string): string => `url(#${id(name)})`;
let ctx: gsap.Context | null = null;
let loops: gsap.core.Animation[] = [];
let observer: IntersectionObserver | null = null;
let visible = true;

const viewBox = computed(() => {
  if (props.variant === "hero") return "0 0 1200 360";
  return props.kind === "express" ? "0 196 1200 136" : "0 70 1200 240";
});

// Ridges and waves are drawn 2400 units wide and tile every 1200, so a loop of -1200 never shows a seam.
function ridge(base: number, amps: readonly number[], period: number, bottom = 360): string {
  let d = `M0 ${bottom} L0 ${base}`;
  for (let i = 0; i < 2400 / period; i += 1) {
    const x = i * period;
    d += ` Q${x + period / 2} ${base - (amps[i % amps.length] ?? 0)} ${x + period} ${base}`;
  }
  return `${d} L2400 ${bottom} Z`;
}
function wave(base: number, amp: number, period: number): string {
  let d = `M0 360 L0 ${base}`;
  for (let i = 0; i < 2400 / period; i += 1) {
    const x = i * period;
    d += ` Q${x + period / 4} ${base - amp} ${x + period / 2} ${base} Q${x + (3 * period) / 4} ${base + amp} ${x + period} ${base}`;
  }
  return `${d} L2400 360 Z`;
}
const farHills = ridge(232, [44, 70, 30, 58, 82, 40], 200);
const nearHills = ridge(278, [26, 40, 18, 34], 150);
const poles = Array.from({ length: 9 }, (_, i) => i * 300);
const wires = (() => {
  let d = "M0 214";
  for (let i = 0; i < 8; i += 1) d += ` Q${i * 300 + 150} 232 ${(i + 1) * 300} 214`;
  return d;
})();
const stars = [
  [80, 40], [190, 86], [260, 30], [380, 64], [470, 22], [560, 92], [640, 44], [730, 18], [820, 76], [1080, 36],
  [1140, 90], [900, 26], [330, 110], [1010, 120],
] as const;
const carriages = [
  { x: 280, label: "6" },
  { x: 480, label: "7" },
] as const;
const wheelsAt = [304, 330, 420, 446, 504, 530, 620, 646, 694, 732, 776, 828, 880] as const;
const sparkAt = [318, 432, 516, 632, 712, 790, 846] as const;
const seaFar = wave(270, 3, 100);
const seaMid = wave(286, 5, 150);
const seaNear = wave(308, 7, 200);
const rain = Array.from({ length: 44 }, (_, i) => ({ x: (i * 97) % 1260, y: ((i * 53) % 90) - 90 }));
const rainRows = [0, 90, 180, 270, 360] as const;

function loop<T extends gsap.core.Animation>(animation: T): T {
  loops.push(animation);
  return animation;
}

function buildExpress(): void {
  loop(gsap.to(".bs-far", { x: -1200, duration: 80, ease: "none", repeat: -1 }));
  loop(gsap.to(".bs-near", { x: -1200, duration: 28, ease: "none", repeat: -1 }));
  loop(gsap.to(".bs-poles", { x: -300, duration: 1.6, ease: "none", repeat: -1 }));
  loop(gsap.to(".bs-sleepers", { strokeDashoffset: -48, duration: 0.3, ease: "none", repeat: -1 }));
  loop(gsap.to(".bs-train", { y: -1.5, duration: 0.17, ease: "sine.inOut", yoyo: true, repeat: -1 }));
  loop(gsap.to(".bs-spokes", { rotation: -360, transformOrigin: "50% 50%", duration: 0.6, ease: "none", repeat: -1 }));
  loop(gsap.to(".bs-star", { opacity: 0.25, duration: 1.8, ease: "sine.inOut", stagger: { each: 0.33, yoyo: true, repeat: -1 } }));
  gsap.utils.toArray<SVGElement>(".bs-puff").forEach((puff, i) => {
    loop(
      gsap.fromTo(
        puff,
        { x: 0, y: 0, scale: 0.5, opacity: 0.55, transformOrigin: "50% 50%" },
        { x: -170, y: -80, scale: 2.6, opacity: 0, duration: 2.6, ease: "power1.out", repeat: -1, delay: i * 0.52 },
      ),
    );
  });
  loop(gsap.to(".bs-spark", { opacity: 0.15, duration: 0.07, ease: "none", stagger: { each: 0.05, yoyo: true, repeat: -1 } }));
  loop(gsap.to(".bs-w7", { opacity: 0.78, duration: 1.4, ease: "sine.inOut", yoyo: true, repeat: -1 }));
}

function buildLighthouse(): void {
  gsap.set(".bs-beam", { svgOrigin: "180 98" });
  loop(gsap.to(".bs-beam", { scaleX: -1, duration: 3.2, ease: "sine.inOut", yoyo: true, repeat: -1 }));
  loop(gsap.to(".bs-wave1", { x: -1200, duration: 26, ease: "none", repeat: -1 }));
  loop(gsap.to(".bs-wave2", { x: -1200, duration: 15, ease: "none", repeat: -1 }));
  loop(gsap.to(".bs-wave3", { x: -1200, duration: 9, ease: "none", repeat: -1 }));
  loop(gsap.to(".bs-cloud", { x: -140, duration: 36, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 4 }));
  loop(gsap.to(".bs-rain", { y: 90, duration: 0.42, ease: "none", repeat: -1 }));
  loop(gsap.to(".bs-ship", { rotation: 2.4, y: 2.5, svgOrigin: "985 290", duration: 2.2, ease: "sine.inOut", yoyo: true, repeat: -1 }));
  loop(gsap.to(".bs-foam", { opacity: 0.2, duration: 1.1, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 0.4 }));
  if (props.variant === "hero") {
    loop(
      gsap
        .timeline({ repeat: -1, repeatDelay: 8.5, delay: 3 })
        .to(".bs-flash", { opacity: 0.45, duration: 0.05 })
        .call(() => emit("lightning", 0.8))
        .to(".bs-flash", { opacity: 0, duration: 0.22 })
        .to(".bs-flash", { opacity: 0.28, duration: 0.04 })
        .to(".bs-flash", { opacity: 0, duration: 0.5 }),
    );
  }
}

function applyDark(instant: boolean): void {
  const d = instant || reduceMotion.value ? 0 : 1;
  if (props.kind === "express") {
    gsap.to(".bs-tunnel", { opacity: props.dark ? 1 : 0, duration: (props.dark ? 0.9 : 0.6) * d, ease: "power2.inOut" });
    gsap.to(".bs-window", { fill: props.dark ? "#1b130d" : "#f0c97a", duration: 0.18 * d, delay: (props.dark ? 0.7 : 0.25) * d });
    gsap.to(".bs-headlamp", { opacity: props.dark ? 0 : 1, duration: 0.2 * d, delay: (props.dark ? 0.7 : 0.2) * d });
    gsap.to(".bs-sparks", { opacity: props.dark ? 1 : 0, duration: 0.3 * d, delay: (props.dark ? 0.8 : 0) * d });
  } else {
    gsap.to(".bs-beam-wrap", { opacity: props.dark ? 0 : 1, duration: 0.7 * d });
    gsap.to(".bs-lamp-glow", { opacity: props.dark ? 0.04 : 1, duration: 0.7 * d });
    gsap.to(".bs-lamp", { fill: props.dark ? "#2d2219" : "#f5d59e", duration: 0.5 * d });
  }
}

function applyWreck(instant: boolean): void {
  if (props.kind !== "lighthouse") return;
  const d = instant || reduceMotion.value ? 0 : 1;
  gsap.to(".bs-ship-pos", {
    x: props.wreck ? -170 : 0,
    rotation: props.wreck ? -8 : 0,
    svgOrigin: "985 296",
    duration: 2.6 * d,
    ease: "power2.inOut",
  });
  gsap.to(".bs-ship-window", { fill: props.wreck ? "#3a2616" : "#f0c97a", duration: 0.3 * d, delay: 2 * d, stagger: 0.25 * d });
}

function setPlaying(on: boolean): void {
  for (const animation of loops) {
    if (on && !props.paused && !document.hidden && !reduceMotion.value) animation.play();
    else animation.pause();
  }
}
function visibilityChanged(): void { setPlaying(visible); }
async function startGpu(): Promise<void> {
  if (starting || stage || failed || disposed || !host.value || !root.value) return;
  const rect = host.value.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return;
  starting = true;
  rendererState.value = "loading";
  try {
    const { createCaseStage } = await import("../scene/caseStage");
    if (disposed || !host.value || !root.value) return;
    const created = await createCaseStage(host.value, { theme: props.kind, artwork: root.value, paused: props.paused, reduced: reduceMotion.value, dark: props.dark, wreck: props.wreck, onLightning: strength => emit("lightning", strength) });
    if (disposed) { created.destroy(); return; }
    stage = created; stage.state({ paused: props.paused, reduced: reduceMotion.value, dark: props.dark, wreck: props.wreck }); ready.value = true; rendererState.value = "pixi";
  } catch (error) { failed = true; rendererState.value = "fallback"; console.warn("Illustrated scene is using its vector fallback", error); if (!disposed) build(); }
}

function build(): void {
  ctx?.revert();
  loops = [];
  const el = root.value;
  if (!el) return;
  ctx = gsap.context(() => {
    if (!reduceMotion.value) {
      if (props.kind === "express") buildExpress();
      else buildLighthouse();
    }
    applyDark(true);
    applyWreck(true);
  }, el);
  setPlaying(visible);
}

onMounted(() => {
  document.addEventListener("visibilitychange", visibilityChanged);
  void startGpu();
  if (host.value) { startupResize = new ResizeObserver(() => { void startGpu(); }); startupResize.observe(host.value); }
  if (root.value && "IntersectionObserver" in window) {
    observer = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      setPlaying(visible);
      if (visible) void startGpu();
    });
    observer.observe(root.value);
  }
});
watch(reduceMotion, reduced => { stage?.state({ reduced }); if (failed) build(); });
watch(() => props.paused, paused => { stage?.state({ paused }); setPlaying(visible); });
watch(() => props.progress, (value, before) => { if (value > before) stage?.cue({ kind: "clue", point: { x: .54, y: .62 } }); });
watch(() => props.connections, (value, before) => { if (value > before) stage?.cue({ kind: "proof" }); });
watch(() => props.shares, (value, before) => { if (value > before) stage?.cue({ kind: "share" }); });
watch(
  () => props.dark,
  dark => { stage?.state({ dark }); ctx?.add(() => applyDark(false)); },
);
watch(
  () => props.wreck,
  wreck => { stage?.state({ wreck }); ctx?.add(() => applyWreck(false)); },
);
onBeforeUnmount(() => {
  disposed = true;
  startupResize?.disconnect();
  stage?.destroy(); stage = null;
  document.removeEventListener("visibilitychange", visibilityChanged);
  observer?.disconnect();
  ctx?.revert();
  ctx = null;
  loops = [];
});
</script>

<template>
  <div class="board-scene" :class="[`is-${variant}`, { 'is-ready': ready }]" :data-renderer="rendererState" aria-hidden="true">
  <div ref="host" class="board-scene-gpu"></div>
  <svg
    ref="root"
    class="board-scene-fallback"
    :class="`is-${variant}`"
    :viewBox="viewBox"
    preserveAspectRatio="xMidYMid slice"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient :id="id('sky')" x1="0" x2="0" y1="0" y2="1">
        <stop v-if="kind === 'express'" offset="0" stop-color="#0c0a16" />
        <stop v-if="kind === 'express'" offset="1" stop-color="#2e1c12" />
        <stop v-if="kind === 'lighthouse'" offset="0" stop-color="#080a12" />
        <stop v-if="kind === 'lighthouse'" offset="1" stop-color="#1c1b24" />
      </linearGradient>
      <radialGradient :id="id('moon-glow')">
        <stop offset="0" stop-color="#f3e6c4" stop-opacity="0.35" />
        <stop offset="1" stop-color="#f3e6c4" stop-opacity="0" />
      </radialGradient>
      <linearGradient :id="id('headlamp')" x1="0" x2="1">
        <stop offset="0" stop-color="#f5d59e" stop-opacity="0.55" />
        <stop offset="1" stop-color="#f5d59e" stop-opacity="0" />
      </linearGradient>
      <linearGradient :id="id('beam')" x1="0" x2="1">
        <stop offset="0" stop-color="#f8e2b0" stop-opacity="0.75" />
        <stop offset="1" stop-color="#f8e2b0" stop-opacity="0" />
      </linearGradient>
      <radialGradient :id="id('lamp-glow')">
        <stop offset="0" stop-color="#ffe7b0" stop-opacity="0.9" />
        <stop offset="1" stop-color="#ffe7b0" stop-opacity="0" />
      </radialGradient>
      <linearGradient :id="id('sea')" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="#132029" />
        <stop offset="1" stop-color="#05080b" />
      </linearGradient>
    </defs>

    <rect x="0" y="0" width="1200" height="360" :fill="url('sky')" />

    <!-- The Night Express -->
    <g v-if="kind === 'express'">
      <circle cx="980" cy="72" r="96" :fill="url('moon-glow')" />
      <circle cx="980" cy="72" r="24" fill="#f3e6c4" />
      <circle cx="972" cy="66" r="5" fill="#e3d4b0" />
      <circle v-for="(s, i) in stars" :key="i" class="bs-star" :cx="s[0]" :cy="s[1]" :r="i % 3 === 0 ? 1.6 : 1.1" fill="#f3e6c4" />
      <path class="bs-far" :d="farHills" fill="#1d1418" />
      <path class="bs-near" :d="nearHills" fill="#140d0c" />
      <g class="bs-poles">
        <path :d="wires" fill="none" stroke="#2c201a" stroke-width="1" />
        <g v-for="x in poles" :key="x">
          <rect :x="x - 2" y="208" width="4" height="110" fill="#2c201a" />
          <rect :x="x - 12" y="212" width="24" height="3" fill="#2c201a" />
        </g>
      </g>
      <rect x="0" y="316" width="1200" height="44" fill="#0b0706" />
      <path class="bs-sleepers" d="M0 324 H1200" stroke="#2a1d16" stroke-width="7" stroke-dasharray="10 14" />
      <path d="M0 317 H1200" stroke="#5a463a" stroke-width="2.5" />

      <!-- The tunnel: the world outside the windows goes black. -->
      <rect class="bs-tunnel" x="0" y="0" width="1200" height="360" fill="#030202" opacity="0" />

      <g class="bs-train">
        <path class="bs-headlamp" d="M922 262 L1200 214 L1200 318 Z" :fill="url('headlamp')" />
        <g v-for="c in carriages" :key="c.x">
          <rect :x="c.x" y="232" width="190" height="64" rx="6" fill="#5a2a1c" />
          <rect :x="c.x" y="226" width="190" height="10" rx="5" fill="#3a1a12" />
          <rect :x="c.x" y="282" width="190" height="4" fill="#c99a52" />
          <rect
            v-for="w in 5"
            :key="w"
            class="bs-window"
            :class="{ 'bs-w7': c.label === '7' && w === 3 }"
            :x="c.x + 14 + (w - 1) * 34"
            y="246"
            width="24"
            height="24"
            rx="3"
            fill="#f0c97a"
          />
          <text :x="c.x + 172" y="279" fill="#e7bf7c" font-size="11" font-family="Georgia, serif">{{ c.label }}</text>
          <rect :x="c.x + 190" y="276" width="10" height="4" fill="#2a1b11" />
          <path :d="`M${c.x + 5} 240H${c.x + 185}M${c.x + 5} 289H${c.x + 185}`" stroke="#e2b475" stroke-width="1" opacity=".45" />
          <path v-for="panel in 5" :key="`panel-${panel}`" :d="`M${c.x + 10 + (panel - 1) * 34} 274h28v12h-28z`" fill="#3f2119" stroke="#8b5734" stroke-width=".8" />
          <g v-for="passenger in [0, 2, 4]" :key="`passenger-${passenger}`" fill="#66402a" opacity=".7"><circle :cx="c.x + 26 + passenger * 34" cy="257" r="3" /><path :d="`M${c.x + 20 + passenger * 34} 270v-5q6-7 12 0v5z`" /></g>
          <path :d="`M${c.x + 8} 233q80-8 174 0`" stroke="#b18353" stroke-width="1" opacity=".6" />
        </g>
        <rect x="680" y="252" width="66" height="44" rx="4" fill="#211a1a" />
        <rect x="750" y="220" width="62" height="76" rx="4" fill="#1e1a1c" />
        <rect class="bs-window" x="764" y="234" width="22" height="20" rx="2" fill="#f0c97a" />
        <rect x="806" y="246" width="106" height="42" rx="18" fill="#2a2426" />
        <rect x="836" y="246" width="5" height="42" fill="#c99a52" />
        <rect x="870" y="246" width="5" height="42" fill="#c99a52" />
        <rect x="878" y="218" width="16" height="30" fill="#1e1a1c" />
        <rect x="874" y="214" width="24" height="6" fill="#2a2426" />
        <rect x="910" y="282" width="14" height="10" fill="#1e1a1c" />
        <circle cx="918" cy="262" r="5" fill="#f5d59e" />
        <path d="M811 254H906M811 280H906M757 226H806" stroke="#b6915f" opacity=".55" stroke-width="1" />
        <path d="M748 293H906M687 258H738" stroke="#080707" stroke-width="3" />
        <circle cx="852" cy="261" r="7" fill="#171719" stroke="#a3804f" stroke-width="1.5" />
        <path d="M852 254v14m-7-7h14" stroke="#a3804f" stroke-width="1" />
        <g class="bs-steam">
          <circle v-for="p in 5" :key="p" class="bs-puff" cx="886" cy="206" r="10" fill="#cfc4b4" opacity="0.4" />
        </g>
        <g v-for="(x, i) in wheelsAt" :key="i">
          <circle :cx="x" cy="304" :r="i >= 10 ? 15 : 12" fill="#120c0a" stroke="#5a463a" stroke-width="2" />
          <g class="bs-spokes">
            <path :d="`M${x - 9} 304 H${x + 9} M${x} 295 V313`" stroke="#5a463a" stroke-width="2" />
            <circle :cx="x" cy="304" r="3" fill="#c99a52" />
          </g>
        </g>
      </g>
      <g class="bs-sparks" opacity="0">
        <g v-for="(x, i) in sparkAt" :key="i">
          <circle class="bs-spark" :cx="x" cy="317" r="2.4" fill="#ffb347" />
          <circle class="bs-spark" :cx="x + 8" cy="314" r="1.4" fill="#ffd27a" />
        </g>
      </g>
    </g>

    <!-- Greyhaven Point -->
    <g v-else>
      <g fill="#24222c">
        <ellipse class="bs-cloud" cx="320" cy="54" rx="220" ry="34" opacity="0.7" />
        <ellipse class="bs-cloud" cx="760" cy="40" rx="260" ry="30" opacity="0.6" />
        <ellipse class="bs-cloud" cx="1080" cy="86" rx="200" ry="28" opacity="0.55" />
        <ellipse class="bs-cloud" cx="560" cy="110" rx="180" ry="20" opacity="0.4" />
      </g>
      <g class="bs-beam-wrap">
        <path class="bs-beam" d="M180 92 L1300 0 L1300 200 L180 104 Z" :fill="url('beam')" />
      </g>
      <rect x="0" y="262" width="1200" height="98" :fill="url('sea')" />
      <path class="bs-wave1" :d="seaFar" fill="#0f1a21" />
      <g class="bs-rocks" fill="#0a0807" stroke="#2b2622" stroke-width="1">
        <path d="M640 296 L662 262 L678 288 L702 250 L722 286 L744 258 L768 292 L790 272 L814 296 Z" />
      </g>
      <g class="bs-foam" fill="#d8e2e8">
        <ellipse cx="664" cy="292" rx="16" ry="2" opacity="0.5" />
        <ellipse cx="736" cy="294" rx="20" ry="2" opacity="0.4" />
        <ellipse cx="800" cy="295" rx="14" ry="2" opacity="0.45" />
      </g>
      <g class="bs-ship-pos">
        <g class="bs-ship">
          <path d="M900 270 L1072 270 L1052 296 L920 296 Z" fill="#2a1f1a" />
          <path d="M904 276 H1068" stroke="#c99a52" stroke-width="1.5" />
          <rect x="956" y="246" width="56" height="24" fill="#3a2a22" />
          <rect v-for="w in 4" :key="w" class="bs-ship-window" :x="960 + (w - 1) * 13" y="253" width="7" height="7" fill="#f0c97a" />
          <rect x="1022" y="232" width="12" height="22" fill="#1a1210" />
          <path d="M984 246 V196 M984 204 L1010 212 L984 216" stroke="#3a2a22" stroke-width="2.5" fill="none" />
          <text x="1006" y="289" fill="#e7bf7c" font-size="9" font-family="Georgia, serif" letter-spacing="1">MARIGOLD</text>
        </g>
      </g>
      <path class="bs-wave2" :d="seaMid" fill="#0c151b" opacity="0.92" />
      <path class="bs-wave3" :d="seaNear" fill="#070c10" />
      <g class="bs-foreground">
      <path d="M0 360 L0 226 Q58 198 120 212 L232 220 Q284 240 304 282 L336 360 Z" fill="#100c0a" />
      <path d="M0 271Q95 228 155 252T282 295M15 303Q116 268 228 306M45 333Q172 300 294 337" fill="none" stroke="#645344" stroke-width="2" opacity=".4" />
      <path d="M25 251l14-17m38 5 8-14m142 37 17-8m-98 53 16-9m103 27 13-3" stroke="#8b795e" stroke-width="1" opacity=".4" />
      <circle class="bs-lamp-glow" cx="180" cy="98" r="70" :fill="url('lamp-glow')" />
      <polygon points="146,240 214,240 202,120 158,120" fill="#e8dfd0" />
      <polygon points="152,214 208,214 205,194 155,194" fill="#8a2f22" />
      <polygon points="157,166 203,166 201,148 159,148" fill="#8a2f22" />
      <path d="M153 237 163 123H172L165 237Z" fill="#fff2c3" opacity=".28" />
      <path d="M197 122 209 237H199L190 122Z" fill="#392d29" opacity=".22" />
      <path v-for="brick in 7" :key="`brick-${brick}`" :d="`M${160 - brick} ${133 + brick * 14}h${40 + brick * 2}`" stroke="#64584a" stroke-width=".7" opacity=".3" />
      <rect x="174" y="214" width="14" height="26" rx="7" fill="#342a24" stroke="#a18a68" stroke-width="1" />
      <path d="M174 239h15M182 221v16" stroke="#1c1916" stroke-width="2" />
      <path d="M92 245v-23h43v23z" fill="#584338" stroke="#a07f55" stroke-width="1" />
      <path d="m85 223 28-17 29 17z" fill="#2c2422" stroke="#81684a" stroke-width="1" />
      <rect x="99" y="229" width="9" height="10" fill="#b7a170" opacity=".55" /><rect x="117" y="229" width="10" height="16" fill="#211b18" />
      <rect x="150" y="112" width="60" height="8" fill="#2a1f1a" />
      <path d="M150 112 V104 H210 V112" fill="none" stroke="#2a1f1a" stroke-width="2" />
      <rect class="bs-lamp" x="164" y="84" width="32" height="20" fill="#f5d59e" />
      <path d="M172 84 V104 M188 84 V104" stroke="#2a1f1a" stroke-width="1.5" />
      <polygon points="158,84 202,84 180,64" fill="#2a1f1a" />
      </g>
      <g class="bs-rain" stroke="#9fb3c2" stroke-width="1" opacity="0.35">
        <template v-for="row in rainRows" :key="row">
          <path v-for="(r, i) in rain" :key="`${row}-${i}`" :d="`M${r.x} ${r.y + row} l-6 16`" />
        </template>
      </g>
      <rect class="bs-flash" x="0" y="0" width="1200" height="360" fill="#e8eef5" opacity="0" />
    </g>
  </svg>
  </div>
</template>

<style scoped>
.board-scene {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
}
.board-scene-gpu, .board-scene-fallback, .board-scene-gpu :deep(canvas) { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.is-ready .board-scene-fallback { visibility: hidden; }
</style>
