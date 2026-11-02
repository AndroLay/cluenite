<script setup lang="ts">
/* global Window */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import "./shell.css";
import SiteIcon from "./SiteIcon.vue";
import { account, checkAccount } from "./account";
import { reduceMotion, siteSettings } from "./settings";
import { playUi } from "./uiSound";
import type { HeroScene } from "../scene/heroScene";

// The game-style frame for the menu pages: a living scene behind everything (scene/heroScene.ts), a slim top bar
// with the way back to the main menu, the Twitch status, and the sound switch. The page draws first on a plain
// gradient; the scene loads when the browser is idle and fades in, so nothing waits on PixiJS.
const props = withDefaults(
  defineProps<{
    /** Show the back-to-menu control. The main menu itself turns it off. */
    back?: boolean;
    /** Which part of the scene stays in view, 0..1 on each axis. */
    focusX?: number;
    focusY?: number;
    /** How strongly the scene is dimmed behind the content. */
    dim?: "soft" | "medium" | "strong";
    /** Load the living scene. Game boards that draw their own scene turn it off and keep the gradient. */
    scene?: boolean;
    immersive?: boolean;
  }>(),
  { back: true, focusX: 0.86, focusY: 0.3, dim: "medium", scene: true, immersive: false },
);

const host = ref<HTMLDivElement | null>(null);
const sceneReady = ref(false);
let heroScene: HeroScene | null = null;
let disposed = false;

const status = computed(() => {
  const state = account.state;
  if (state.kind === "checking") return { tone: "wait", text: "Checking Twitch" };
  if (state.kind === "unreachable") return { tone: "error", text: "Server offline" };
  if (state.kind === "signed-in" && state.connected) {
    return { tone: state.chat === "listening" ? "on" : "wait", text: state.name };
  }
  return { tone: "off", text: "Connect Twitch" };
});

async function mountScene(): Promise<void> {
  const el = host.value;
  if (!el || disposed) return;
  try {
    const { createHeroScene } = await import("../scene/heroScene");
    const created = await createHeroScene(el, {
      reduced: reduceMotion.value,
      focusX: props.focusX,
      focusY: props.focusY,
    });
    if (disposed) {
      created.destroy();
      return;
    }
    heroScene = created;
    sceneReady.value = true;
  } catch {
    // Without WebGL the gradient backdrop stays; every control works without the scene.
  }
}

function toggleSound(): void {
  siteSettings.soundOn = !siteSettings.soundOn;
  if (siteSettings.soundOn) playUi("select");
}

onMounted(() => {
  void checkAccount();
  if (!props.scene) return;
  const start = (): void => void mountScene();
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
    .requestIdleCallback;
  if (idle) idle(start, { timeout: 700 });
  else window.setTimeout(start, 150);
});

watch(reduceMotion, (value) => heroScene?.setReducedMotion(value));

onBeforeUnmount(() => {
  disposed = true;
  heroScene?.destroy();
  heroScene = null;
});

defineExpose({
  pulse: (index: number) => heroScene?.pulse(index),
  connect: (a: number, b: number) => heroScene?.connect(a, b),
});
</script>

<template>
  <div class="gs" :class="{ 'is-immersive': immersive }" :data-dim="dim">
    <div class="gs-backdrop" aria-hidden="true">
      <div ref="host" class="gs-scene" :class="{ 'is-ready': sceneReady }"></div>
      <div class="gs-veil"></div>
    </div>

    <header v-if="!immersive" class="gs-bar">
      <a class="gs-brand" href="/dashboard" aria-label="Cluenite main menu" @click="playUi('back')">
        <span class="gs-mark"><SiteIcon name="search" :stroke="2.2" /></span>
        <span>Cluenite</span>
      </a>
      <a v-if="back" class="gs-back" href="/dashboard" @click="playUi('back')">
        <SiteIcon name="arrow-left" /> Main menu
      </a>
      <div class="gs-tools">
        <a class="gs-status" href="/connect" :data-tone="status.tone" :title="'Twitch: ' + status.text">
          <span class="gs-dot" aria-hidden="true"></span>
          <span class="gs-status-text">{{ status.text }}</span>
        </a>
        <button
          type="button"
          class="gs-icon-btn"
          :aria-pressed="siteSettings.soundOn"
          :aria-label="siteSettings.soundOn ? 'Sound on' : 'Sound off'"
          @click="toggleSound"
        >
          <SiteIcon :name="siteSettings.soundOn ? 'sound-on' : 'sound-off'" size="20px" />
        </button>
        <a class="gs-icon-btn" href="/settings" aria-label="Settings"><SiteIcon name="settings" size="20px" /></a>
      </div>
    </header>

    <div class="gs-main">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.gs.is-immersive { height: 100dvh; min-height: 0; overflow: hidden; }
.gs.is-immersive .gs-main { width: 100%; max-width: none; height: 100%; margin: 0; padding: 0; overflow: hidden; }
:global(body:has(.gs.is-immersive)) { overflow: hidden; }
</style>
