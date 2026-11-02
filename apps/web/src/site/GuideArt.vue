<script setup lang="ts">
/* global SVGSVGElement, IntersectionObserver, Element */
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { gsap } from "gsap";
import { reduceMotion } from "./settings";

// Small animated drawings for the guide, one per step of a case. Each loops a short GSAP timeline while it is on
// screen, and shows its last frame under reduced motion. They are decorative; the text next to them carries the
// meaning.
const props = defineProps<{ kind: "open" | "search" | "link" | "theory" | "close" }>();

const root = ref<SVGSVGElement | null>(null);
let timeline: gsap.core.Timeline | null = null;
let observer: IntersectionObserver | null = null;

function q(selector: string): Element[] {
  return root.value ? Array.from(root.value.querySelectorAll(selector)) : [];
}

function build(loop: boolean): gsap.core.Timeline {
  const tl = gsap.timeline({
    repeat: loop ? -1 : 0,
    repeatDelay: 1.4,
    paused: true,
    defaults: { ease: "power3.out" },
  });
  switch (props.kind) {
    case "open":
      tl.set(q(".flap"), { scaleY: 1, transformOrigin: "50% 100%" })
        .set(q(".photo"), { y: 30, opacity: 0 })
        .set(q(".stamp"), { scale: 2.2, opacity: 0, transformOrigin: "50% 50%" })
        .to(q(".flap"), { scaleY: 0.12, duration: 0.7, ease: "power2.inOut" }, 0.3)
        .to(q(".photo"), { y: 0, opacity: 1, duration: 0.6 }, 0.8)
        .to(q(".stamp"), { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(2.4)" }, 1.4);
      break;
    case "search":
      tl.set(q(".bubble"), { x: 120, y: 10, opacity: 0, scale: 0.8, transformOrigin: "50% 50%" })
        .set(q(".hot"), { opacity: 0 })
        .set(q(".spark"), { scale: 0, opacity: 0, transformOrigin: "50% 50%" })
        .set(q(".plus"), { y: 0, opacity: 0 })
        .to(q(".bubble"), { x: 0, y: 0, opacity: 1, scale: 1, duration: 0.6 }, 0.2)
        .to(q(".bubble"), { x: -96, y: 28, scale: 0.4, opacity: 0, duration: 0.5, ease: "power2.in" }, 1.2)
        .to(q(".hot"), { opacity: 1, duration: 0.2 }, 1.6)
        .to(q(".spark"), { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(3)" }, 1.65)
        .to(q(".plus"), { y: -16, opacity: 1, duration: 0.5 }, 1.7)
        .to(q(".plus"), { opacity: 0, duration: 0.4 }, 2.5);
      break;
    case "link":
      tl.set(q(".thread"), { strokeDashoffset: 160 })
        .set(q(".linked"), { scale: 0.6, opacity: 0, transformOrigin: "50% 50%" })
        .set(q(".card-b"), { y: -10, opacity: 0 })
        .to(q(".card-b"), { y: 0, opacity: 1, duration: 0.5 }, 0.2)
        .to(q(".thread"), { strokeDashoffset: 0, duration: 0.9, ease: "power2.inOut" }, 0.8)
        .to(q(".linked"), { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(2.4)" }, 1.7);
      break;
    case "theory":
      tl.set(q(".poll"), { attr: { width: 116 } })
        .set(q(".pct-hi"), { opacity: 1 })
        .set(q(".pct-lo"), { opacity: 0 })
        .set(q(".record"), { x: 80, opacity: 0 })
        .set(q(".stamp"), { scale: 2.2, opacity: 0, transformOrigin: "50% 50%" })
        .to(q(".record"), { x: 0, opacity: 1, duration: 0.6 }, 0.4)
        .to(q(".poll"), { attr: { width: 12 }, duration: 0.9, ease: "power2.inOut" }, 1.1)
        .to(q(".pct-hi"), { opacity: 0, duration: 0.2 }, 1.2)
        .to(q(".pct-lo"), { opacity: 1, duration: 0.2 }, 1.6)
        .to(q(".stamp"), { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(2.4)" }, 1.9);
      break;
    case "close":
      tl.set(q(".who"), { opacity: 1 })
        .set(q(".who-hit"), { scale: 1, transformOrigin: "50% 100%" })
        .set(q(".stamp"), { scale: 2.4, opacity: 0, rotation: -14, transformOrigin: "50% 50%" })
        .set(q(".dust"), { scale: 0, opacity: 0, transformOrigin: "50% 50%" })
        .to(q(".who-miss"), { opacity: 0.25, duration: 0.5, stagger: 0.2 }, 0.4)
        .to(q(".who-hit"), { scale: 1.08, duration: 0.4 }, 1)
        .to(q(".stamp"), { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(2.6)" }, 1.4)
        .to(q(".dust"), { scale: 1, opacity: 1, duration: 0.35, stagger: 0.04 }, 1.5)
        .to(q(".dust"), { opacity: 0, duration: 0.5 }, 2.1);
      break;
  }
  return tl;
}

function start(): void {
  timeline?.kill();
  observer?.disconnect();
  // Under reduced motion the timeline runs once, straight to its last frame.
  timeline = build(!reduceMotion.value);
  if (reduceMotion.value) {
    timeline.progress(1).pause();
    return;
  }
  observer = new IntersectionObserver((entries) => {
    if (!timeline) return;
    if (entries.some((entry) => entry.isIntersecting)) timeline.play();
    else timeline.pause();
  });
  if (root.value) observer.observe(root.value);
}

onMounted(start);
watch(reduceMotion, start);
onBeforeUnmount(() => {
  observer?.disconnect();
  timeline?.kill();
  timeline = null;
});
</script>

<template>
  <svg ref="root" class="ga" viewBox="0 0 320 180" aria-hidden="true" focusable="false">
    <rect x="0" y="0" width="320" height="180" rx="14" class="ga-bg" />

    <g v-if="kind === 'open'">
      <rect x="92" y="54" width="136" height="96" rx="6" fill="#6b4a2c" />
      <rect x="92" y="44" width="56" height="18" rx="4" fill="#6b4a2c" />
      <g class="photo">
        <rect x="112" y="40" width="96" height="70" rx="3" fill="#e9decb" />
        <circle cx="160" cy="68" r="12" fill="#3a2a1d" />
        <path d="M134 104c4-14 14-20 26-20s22 6 26 20Z" fill="#3a2a1d" />
      </g>
      <rect class="flap" x="92" y="66" width="136" height="84" rx="6" fill="#8d6134" />
      <g class="stamp">
        <rect x="190" y="104" width="94" height="30" rx="4" fill="none" stroke="#c24a35" stroke-width="3" />
        <text x="237" y="125" text-anchor="middle" class="ga-stamp-text">CASE</text>
      </g>
    </g>

    <g v-else-if="kind === 'search'">
      <g class="grid">
        <rect v-for="n in 12" :key="n" :x="28 + ((n - 1) % 4) * 46" :y="30 + Math.floor((n - 1) / 4) * 42" width="44" height="40" rx="3" class="cell" />
      </g>
      <rect class="hot" x="120" y="72" width="44" height="40" rx="3" fill="#e7bf7c33" stroke="#f0c98a" stroke-width="2" />
      <path class="spark" d="M142 80c1.2 6 3.2 8 9 9c-5.8 1-7.8 3-9 9c-1.2-6-3.2-8-9-9c5.8-1 7.8-3 9-9Z" fill="#ffe2a8" />
      <text class="plus ga-plus" x="142" y="70" text-anchor="middle">+150</text>
      <g class="bubble">
        <rect x="222" y="40" width="84" height="30" rx="15" fill="#2a1b11" stroke="#a77a48" />
        <text x="264" y="60" text-anchor="middle" class="ga-code">!look C2</text>
      </g>
    </g>

    <g v-else-if="kind === 'link'">
      <g>
        <rect x="40" y="46" width="96" height="66" rx="3" fill="#e9decb" transform="rotate(-4 88 79)" />
        <rect x="52" y="62" width="60" height="5" rx="2" fill="#6b4a30" opacity=".6" />
        <rect x="52" y="74" width="72" height="5" rx="2" fill="#6b4a30" opacity=".4" />
        <circle cx="88" cy="52" r="6" fill="#b8402f" />
      </g>
      <g class="card-b">
        <rect x="186" y="70" width="96" height="66" rx="3" fill="#e9decb" transform="rotate(5 234 103)" />
        <text x="234" y="108" text-anchor="middle" class="ga-time">20:52</text>
        <circle cx="234" cy="76" r="6" fill="#b8402f" />
      </g>
      <path class="thread" d="M88 52 Q160 96 234 76" fill="none" stroke="#c24a35" stroke-width="3" stroke-dasharray="160" />
      <g class="linked">
        <rect x="118" y="132" width="84" height="26" rx="13" fill="#1f2a17" stroke="#9fd49a" />
        <text x="160" y="150" text-anchor="middle" class="ga-ok">Linked</text>
      </g>
    </g>

    <g v-else-if="kind === 'theory'">
      <rect x="30" y="34" width="170" height="86" rx="6" fill="#e3cdb2" />
      <rect x="30" y="34" width="170" height="5" fill="#b8402f" />
      <text x="44" y="62" class="ga-claim">“The gardener</text>
      <text x="44" y="80" class="ga-claim">climbed in.”</text>
      <rect x="44" y="96" width="116" height="8" rx="4" fill="#c4ab8b" />
      <rect class="poll" x="44" y="96" width="116" height="8" rx="4" fill="#c24a35" />
      <text class="pct-hi ga-pct" x="186" y="104" text-anchor="end">58%</text>
      <text class="pct-lo ga-pct" x="186" y="104" text-anchor="end">6%</text>
      <g class="record">
        <rect x="214" y="52" width="82" height="58" rx="3" fill="#e9decb" />
        <rect x="224" y="64" width="56" height="5" rx="2" fill="#6b4a30" opacity=".6" />
        <rect x="224" y="76" width="44" height="5" rx="2" fill="#6b4a30" opacity=".4" />
        <rect x="224" y="88" width="50" height="5" rx="2" fill="#6b4a30" opacity=".4" />
      </g>
      <g class="stamp">
        <rect x="66" y="124" width="140" height="32" rx="4" fill="none" stroke="#c24a35" stroke-width="3" />
        <text x="136" y="146" text-anchor="middle" class="ga-stamp-text">DISPROVEN</text>
      </g>
    </g>

    <g v-else>
      <g class="who who-miss">
        <circle cx="84" cy="70" r="16" fill="#3a2a1d" />
        <path d="M58 128c3-24 13-36 26-36s23 12 26 36Z" fill="#3a2a1d" />
      </g>
      <g class="who who-hit">
        <circle cx="160" cy="66" r="17" fill="#e7bf7c" />
        <path d="M132 128c3-26 14-38 28-38s25 12 28 38Z" fill="#e7bf7c" />
      </g>
      <g class="who who-miss">
        <circle cx="236" cy="70" r="16" fill="#3a2a1d" />
        <path d="M210 128c3-24 13-36 26-36s23 12 26 36Z" fill="#3a2a1d" />
      </g>
      <circle v-for="n in 8" :key="n" class="dust" :cx="160 + Math.cos(n * 0.785) * 70" :cy="78 + Math.sin(n * 0.785) * 46" r="3" fill="#ffe2a8" />
      <g class="stamp">
        <rect x="88" y="128" width="144" height="34" rx="4" fill="#120c08cc" stroke="#c24a35" stroke-width="3" />
        <text x="160" y="151" text-anchor="middle" class="ga-stamp-text">CASE CLOSED</text>
      </g>
    </g>
  </svg>
</template>

<style scoped>
.ga {
  display: block;
  width: 100%;
  height: auto;
}
.ga-bg {
  fill: #140d09;
  stroke: #ffffff14;
}
.cell {
  fill: #1f150e;
  stroke: #d9b68126;
}
.ga-stamp-text {
  fill: #c24a35;
  font: 700 17px/1 "Cluenite Inter", Inter, sans-serif;
  letter-spacing: 0.12em;
}
.ga-plus {
  fill: #ffe2a8;
  font: 700 15px/1 "Cluenite Inter", Inter, sans-serif;
}
.ga-code {
  fill: #f4e6cf;
  font: 600 13px/1 Consolas, "Courier New", monospace;
}
.ga-time {
  fill: #2d1d12;
  font: 600 22px/1 "Cluenite EB Garamond", Georgia, serif;
}
.ga-ok {
  fill: #c9ecc4;
  font: 700 13px/1 "Cluenite Inter", Inter, sans-serif;
}
.ga-claim {
  fill: #2d1d12;
  font: 500 17px/1 "Cluenite EB Garamond", Georgia, serif;
}
.ga-pct {
  fill: #5a3a22;
  font: 700 13px/1 "Cluenite Inter", Inter, sans-serif;
}
</style>
