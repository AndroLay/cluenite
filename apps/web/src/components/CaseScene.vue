<script setup lang="ts">
import type { QuickCaseView } from "../quickCase/viewModel";

// Decorative room for the case. The stage drives the detective's pose through CSS, and the room
// keeps moving on its own (rain, lamp flicker, drifting dust, a slow clock). The reveal stage adds
// one authored moment: a lightning flash, and the clock stops. Everything here is CSS, so it stops
// under prefers-reduced-motion. The stage label and hint carry the meaning, so this is hidden from AT.
defineProps<{
  stage: QuickCaseView["stage"];
  obs: boolean;
}>();
</script>

<template>
  <div class="scene" :class="{ 'is-obs': obs }" :data-stage="stage" aria-hidden="true">
    <svg viewBox="0 0 600 200" preserveAspectRatio="xMidYMid slice" focusable="false">
      <defs>
        <linearGradient id="scene-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#1d3449" />
          <stop offset="1" stop-color="#132334" />
        </linearGradient>
        <linearGradient id="scene-cone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#f5be70" stop-opacity="0.4" />
          <stop offset="1" stop-color="#f5be70" stop-opacity="0" />
        </linearGradient>
        <radialGradient id="scene-pool" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#f5be70" stop-opacity="0.22" />
          <stop offset="1" stop-color="#f5be70" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="scene-spill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#b8aaf5" stop-opacity="0.14" />
          <stop offset="1" stop-color="#b8aaf5" stop-opacity="0" />
        </linearGradient>
        <pattern id="scene-rain" width="30" height="60" patternUnits="userSpaceOnUse">
          <path d="M5 4 l-3 8 M20 18 l-3 8 M12 36 l-3 8 M26 44 l-3 8" />
        </pattern>
        <clipPath id="scene-window">
          <rect x="40" y="26" width="120" height="112" />
        </clipPath>
      </defs>

      <!-- Wall and floor -->
      <rect class="scene-wall" x="0" y="0" width="600" height="150" fill="url(#scene-wall)" />
      <rect x="0" y="146" width="600" height="5" fill="#223748" />
      <path class="scene-floor" d="M0 151 H600 V200 H0 Z" fill="#0c1826" />
      <path d="M300 151 L-100 200 M300 151 L60 200 M300 151 L200 200 M300 151 L400 200 M300 151 L540 200 M300 151 L700 200" stroke="#1b3145" stroke-width="1" />
      <!-- Light on the floor: a warm pool under the lamp, a cool spill from the window -->
      <ellipse cx="300" cy="182" rx="180" ry="24" fill="url(#scene-pool)" />
      <path d="M40 144 H160 L232 200 H-32 Z" fill="url(#scene-spill)" />

      <!-- Window with rain -->
      <rect x="40" y="26" width="120" height="112" fill="#0a1622" />
      <circle cx="136" cy="52" r="8" fill="#f4f0e6" opacity="0.7" />
      <g clip-path="url(#scene-window)">
        <rect class="scene-rain" x="40" y="-34" width="120" height="172" fill="url(#scene-rain)" stroke="none" />
      </g>
      <path d="M100 26 V138 M40 82 H160" stroke="#4e6a82" stroke-width="3" fill="none" />
      <rect x="32" y="138" width="136" height="6" fill="#2c4256" />
      <rect x="40" y="26" width="120" height="112" fill="none" stroke="#4e6a82" stroke-width="3" />

      <!-- Gallery frames -->
      <g>
        <rect x="430" y="30" width="62" height="44" fill="#0e1c2b" stroke="#f5be70" stroke-width="2.5" />
        <rect x="438" y="38" width="46" height="28" fill="#223748" />
        <path d="M440 62 L456 46 L470 58 L482 48 L482 64 Z" fill="#75d7bd" opacity="0.45" />
      </g>
      <g transform="rotate(-4 526 66)">
        <rect x="508" y="50" width="38" height="30" fill="#0e1c2b" stroke="#f5be70" stroke-width="2" />
        <rect x="514" y="56" width="26" height="18" fill="#b8aaf5" opacity="0.35" />
      </g>

      <!-- Wall clock: the hands turn slowly, and reveal stops them -->
      <g class="scene-clock">
        <circle cx="372" cy="62" r="14" fill="#0e1c2b" stroke="#f5be70" stroke-width="2" />
        <path class="scene-hand-hour" d="M372 62 V54" stroke="#f4f0e6" stroke-width="2" stroke-linecap="round" />
        <path class="scene-hand-minute" d="M372 62 L380 56" stroke="#f4f0e6" stroke-width="1.4" stroke-linecap="round" />
        <circle cx="372" cy="62" r="1.6" fill="#f5be70" />
      </g>

      <!-- Lamp and its light cone -->
      <g class="scene-cone-wrap">
        <path class="scene-cone" d="M300 52 L160 200 L440 200 Z" fill="url(#scene-cone)" />
      </g>
      <path d="M300 0 V28" stroke="#4e6a82" stroke-width="2" />
      <path d="M282 30 H318 L330 48 H270 Z" fill="#2c4256" />
      <circle cx="300" cy="50" r="5" fill="#f5be70" />

      <!-- Dust in the light -->
      <circle class="scene-mote" cx="236" cy="78" r="1.4" fill="#f4f0e6" />
      <circle class="scene-mote scene-mote-b" cx="290" cy="118" r="1.1" fill="#f4f0e6" />
      <circle class="scene-mote scene-mote-c" cx="352" cy="96" r="1.3" fill="#f4f0e6" />
      <circle class="scene-mote scene-mote-d" cx="262" cy="150" r="1" fill="#f4f0e6" />

      <!-- Second investigator, standing beside the desk in the lamp light. Turns the head on reveal. -->
      <g class="scene-partner">
        <path d="M246 180 L248 128 Q250 112 262 110 Q274 112 276 128 L278 180 Z" fill="#0f2033" stroke="#2c4256" stroke-width="1" />
        <rect x="257" y="104" width="10" height="9" fill="#0f2033" />
        <g class="scene-partner-head">
          <circle cx="262" cy="98" r="10.5" fill="#0f2033" stroke="#2c4256" stroke-width="1" />
        </g>
      </g>

      <!-- Evidence chips on the desk: gold found, teal verified, lilac theory -->
      <rect x="70" y="170" width="170" height="8" rx="2" fill="#0a1420" />
      <rect x="84" y="152" width="36" height="14" fill="#f5be70" opacity="0.9" transform="rotate(-6 102 159)" />
      <rect x="124" y="148" width="34" height="14" fill="#75d7bd" opacity="0.9" transform="rotate(4 141 155)" />
      <rect x="164" y="154" width="30" height="14" fill="#b8aaf5" opacity="0.85" transform="rotate(-2 179 161)" />

      <!-- Detective silhouette: head, body, and the arm that holds the magnifier -->
      <path class="scene-body" d="M448 200 L452 146 Q458 124 476 122 Q494 124 500 146 L506 200 Z" fill="#0a1420" />
      <rect x="471" y="112" width="12" height="14" fill="#0a1420" />
      <g class="scene-head">
        <circle cx="477" cy="106" r="13" fill="#0a1420" />
        <path d="M456 98 H498 L494 102 H460 Z" fill="#0a1420" />
        <path d="M466 98 Q477 80 488 98 Z" fill="#0a1420" />
      </g>
      <g class="scene-arm">
        <path d="M470 130 L524 118" stroke="#0a1420" stroke-width="7" stroke-linecap="round" fill="none" />
        <circle cx="530" cy="110" r="8" fill="none" stroke="#f5be70" stroke-width="2.5" />
        <path d="M536 116 L546 126" stroke="#f5be70" stroke-width="3" stroke-linecap="round" />
      </g>

      <!-- Lightning flash: silent until the reveal stage -->
      <rect class="scene-flash" x="0" y="0" width="600" height="200" fill="#b8aaf5" />
    </svg>
  </div>
</template>

<style scoped>
/* Room scene. Aspect ratio is fixed so the card height does not jump between stages. */
.scene {
  position: relative;
  width: 100%;
  overflow: hidden;
  border: 1px solid rgba(78, 106, 130, 0.6);
  border-radius: var(--radius-slip);
  background: var(--case-bg);
  aspect-ratio: 3 / 1;
}
.scene svg {
  display: block;
  width: 100%;
  height: 100%;
}

/* Stage poses. Angles are rotations of the magnifier arm around the shoulder, and head tilts
   around the neck. A short ease-out move reads as a reaction rather than a snap. */
.scene-arm {
  transform-origin: 470px 130px;
  transition: transform 700ms var(--ease-out-expo);
}
.scene-head {
  transform-origin: 477px 110px;
  transition: transform 700ms var(--ease-out-expo);
}
.scene[data-stage="observe"] .scene-arm { transform: rotate(-28deg); }
.scene[data-stage="observe"] .scene-head { transform: rotate(-6deg); }
.scene[data-stage="connect"] .scene-arm { transform: rotate(8deg); }
.scene[data-stage="connect"] .scene-head { transform: rotate(4deg); }
.scene[data-stage="challenge"] .scene-arm { transform: rotate(-50deg); }
.scene[data-stage="challenge"] .scene-head { transform: rotate(-9deg); }
.scene[data-stage="reveal"] .scene-arm { transform: rotate(-14deg); }
.scene[data-stage="reveal"] .scene-head { transform: rotate(-2deg); }

/* Lamp light is brighter once the case reveals. */
.scene-cone-wrap {
  opacity: 0.8;
  transition: opacity 600ms var(--ease-out-expo);
}
.scene[data-stage="reveal"] .scene-cone-wrap { opacity: 1; }

.scene-cone {
  animation: lamp-flicker 7s steps(1, end) infinite;
}
.scene-rain {
  animation: rain-fall 1.1s linear infinite;
}
.scene-body {
  transform-origin: 477px 200px;
  animation: breathe 5s ease-in-out infinite;
}
.scene-mote {
  animation: mote-drift 9s ease-in-out infinite alternate;
}
.scene-mote-b { animation-duration: 11s; animation-delay: -3s; }
.scene-mote-c { animation-duration: 8s; animation-delay: -5s; }
.scene-mote-d { animation-duration: 12s; animation-delay: -7s; }

@keyframes lamp-flicker {
  0%, 100% { opacity: 1; }
  38% { opacity: 1; }
  40% { opacity: 0.6; }
  42% { opacity: 1; }
  71% { opacity: 0.9; }
  73% { opacity: 1; }
}

@keyframes rain-fall {
  from { transform: translateY(0); }
  to { transform: translateY(60px); }
}

@keyframes breathe {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(1.012); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes lightning {
  0% { opacity: 0; }
  4% { opacity: 0.5; }
  9% { opacity: 0.1; }
  16% { opacity: 0.38; }
  30% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes mote-drift {
  from { transform: translate(0, 0); opacity: 0.2; }
  50% { opacity: 0.9; }
  to { transform: translate(14px, -20px); opacity: 0.2; }
}

/* Second investigator: breathes in place, and turns the head toward the board on reveal. */
.scene-partner {
  transform-origin: 262px 180px;
  animation: breathe 6s ease-in-out infinite;
}
.scene-partner-head {
  transform-origin: 262px 110px;
  transition: transform 700ms var(--ease-out-expo);
}
.scene[data-stage="reveal"] .scene-partner-head { transform: rotate(-7deg); }

/* Wall clock: the hands turn slowly, and stop when the case is solved. */
.scene-hand-minute {
  transform-origin: 372px 62px;
  animation: spin 60s linear infinite;
}
.scene-hand-hour {
  transform-origin: 372px 62px;
  animation: spin 720s linear infinite;
}
.scene[data-stage="reveal"] .scene-hand-minute,
.scene[data-stage="reveal"] .scene-hand-hour {
  animation-play-state: paused;
}

/* Reveal: one lightning flash across the room, the only one-off motion in the scene. */
.scene-flash {
  opacity: 0;
  pointer-events: none;
}
.scene[data-stage="reveal"] .scene-flash {
  animation: lightning 1.8s linear 0.3s 1 both;
}

/* OBS: same room, shorter so the board stays readable over gameplay. */
.scene.is-obs {
  aspect-ratio: 4 / 1;
}

@media (prefers-reduced-motion: reduce) {
  .scene,
  .scene * {
    animation: none !important;
    transition: none !important;
  }
}
</style>
