<script setup lang="ts">
import { computed, ref } from "vue";
import GameShell from "./GameShell.vue";
import SiteIcon from "./SiteIcon.vue";
import { reduceMotion, resetSiteSettings, siteSettings } from "./settings";
import { playUi } from "./uiSound";

// Settings saved in this browser: sound, motion, and text size. Each choice applies at once and previews itself.

type MotionChoice = "system" | "full" | "reduced";
const motionChoice = computed<MotionChoice>(() =>
  siteSettings.reduceMotion === null ? "system" : siteSettings.reduceMotion ? "reduced" : "full",
);
const note = ref("");

function setSound(on: boolean): void {
  siteSettings.soundOn = on;
  if (on) playUi("success");
}

function setMotion(choice: MotionChoice): void {
  siteSettings.reduceMotion = choice === "system" ? null : choice === "reduced";
  playUi("hover");
}

function setText(size: "standard" | "large"): void {
  siteSettings.textSize = size;
  playUi("hover");
}

function restore(): void {
  resetSiteSettings();
  note.value = "Back to the defaults: sound on, motion follows your system, standard text.";
}
</script>

<template>
  <GameShell :focus-x="0.97" :focus-y="0.3" dim="strong">
    <header class="st-head">
      <p class="gs-eyebrow" data-enter style="--i: 0">Settings</p>
      <h1 class="gs-h1" data-enter style="--i: 1">Make it comfortable</h1>
      <p class="gs-lede" data-enter style="--i: 2">Changes apply right away and stay in this browser.</p>
    </header>

    <div class="st-grid">
      <section class="st-card gs-card" aria-labelledby="st-sound" data-enter style="--i: 3">
        <span class="st-icon"><SiteIcon :name="siteSettings.soundOn ? 'sound-on' : 'sound-off'" size="26px" /></span>
        <h2 id="st-sound" class="gs-h3">Sound and music</h2>
        <p>Room sounds, music, and the clicks in the menus.</p>
        <div class="st-seg" role="group" aria-labelledby="st-sound">
          <button type="button" :aria-pressed="siteSettings.soundOn" @click="setSound(true)">On</button>
          <button type="button" :aria-pressed="!siteSettings.soundOn" @click="setSound(false)">Off</button>
        </div>
        <button type="button" class="gs-btn gs-btn--ghost st-test" :disabled="!siteSettings.soundOn" @click="playUi('success')">
          <SiteIcon name="play" /> Play a test sound
        </button>
      </section>

      <section class="st-card gs-card" aria-labelledby="st-motion" data-enter style="--i: 4">
        <span class="st-icon"><SiteIcon name="sparkle" size="26px" /></span>
        <h2 id="st-motion" class="gs-h3">Motion</h2>
        <p>Rain, lamps, and moving characters. Reduced motion keeps every scene still.</p>
        <div class="st-seg" role="group" aria-labelledby="st-motion">
          <button type="button" :aria-pressed="motionChoice === 'system'" @click="setMotion('system')">My system</button>
          <button type="button" :aria-pressed="motionChoice === 'full'" @click="setMotion('full')">Full</button>
          <button type="button" :aria-pressed="motionChoice === 'reduced'" @click="setMotion('reduced')">Reduced</button>
        </div>
        <p class="st-now">Now: {{ reduceMotion ? "reduced motion" : "full motion" }}</p>
      </section>

      <section class="st-card gs-card" aria-labelledby="st-text" data-enter style="--i: 5">
        <span class="st-icon"><SiteIcon name="book" size="26px" /></span>
        <h2 id="st-text" class="gs-h3">Text size</h2>
        <p>Larger text on the site pages.</p>
        <div class="st-seg" role="group" aria-labelledby="st-text">
          <button type="button" :aria-pressed="siteSettings.textSize === 'standard'" @click="setText('standard')">
            Standard
          </button>
          <button type="button" :aria-pressed="siteSettings.textSize === 'large'" @click="setText('large')">Large</button>
        </div>
        <p class="st-preview">The clock stopped at 20:52.</p>
      </section>
    </div>

    <div class="st-foot" data-enter style="--i: 6">
      <button type="button" class="gs-btn gs-btn--ghost" @click="restore"><SiteIcon name="restart" /> Restore defaults</button>
      <p class="gs-muted" role="status">{{ note }}</p>
    </div>
    <p class="st-later" data-enter style="--i: 7">
      Coming later: high contrast, color-blind markers, and captions for sounds. The OBS overlay keeps its own look.
    </p>
  </GameShell>
</template>

<style scoped>
.st-head {
  margin-bottom: 26px;
}
.st-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.st-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 22px;
}
.st-card > p {
  margin: 0;
  color: #cdbca1;
  font-size: 14px;
}
.st-icon {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  margin-bottom: 6px;
  border: 1px solid #a77a48;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #4a3220, #1a110b);
  color: var(--gs-gold);
}
.st-seg {
  display: flex;
  gap: 4px;
  margin-top: 10px;
  padding: 4px;
  border: 1px solid #ffffff1f;
  border-radius: 999px;
  background: #0b0705cc;
}
.st-seg button {
  flex: 1;
  min-height: 42px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--gs-text);
  font: 600 14px/1 var(--gs-sans);
  cursor: pointer;
  transition: background-color 200ms ease-out;
}
.st-seg button[aria-pressed="true"] {
  background: linear-gradient(180deg, #f2d199, #c99a52);
  color: #1a1008;
}
.st-test {
  margin-top: 8px;
}
.st-now {
  margin: 4px 0 0;
  color: #bfae94;
  font-size: 13px;
}
.st-card > p.st-preview {
  margin: 10px 0 0;
  padding: 12px 14px;
  border-radius: 10px;
  background: #e9decb;
  color: #2a1d12;
  font-family: var(--gs-serif);
  font-size: 1.25em;
}
.st-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  margin-top: 22px;
}
.st-foot p {
  margin: 0;
}
.st-later {
  margin-top: 14px;
  color: #bfae94;
  font-size: 13px;
}
@media (max-width: 900px) {
  .st-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
