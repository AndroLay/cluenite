<script setup lang="ts">
/* global HTMLButtonElement, KeyboardEvent, ResizeObserver */
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import SiteIcon from "./SiteIcon.vue";

const props = withDefaults(defineProps<{
  title: string;
  label?: string;
  panel?: string | null;
  panelTitle?: string;
  intro?: boolean;
  cinematic?: boolean;
}>(), { label: "", panel: null, panelTitle: "Case file", intro: false, cinematic: false });
const emit = defineEmits<{ "close-panel": [] }>();
const root = ref<HTMLElement | null>(null);
const headerElement = ref<HTMLElement | null>(null);
const dockElement = ref<HTMLElement | null>(null);
let chromeObserver: ResizeObserver | undefined;
function measureChrome(): void {
  root.value?.style.setProperty("--workspace-header-measured", `${headerElement.value?.getBoundingClientRect().height ?? 0}px`);
  root.value?.style.setProperty("--workspace-dock-measured", `${dockElement.value?.getBoundingClientRect().height ?? 0}px`);
}
function observeChrome(): void {
  chromeObserver?.disconnect();
  chromeObserver = new ResizeObserver(measureChrome);
  if (headerElement.value) chromeObserver.observe(headerElement.value);
  if (dockElement.value) chromeObserver.observe(dockElement.value);
  measureChrome();
}
watch(() => props.intro, async () => { await nextTick(); observeChrome(); });
const panelClose = ref<HTMLButtonElement | null>(null);
const fullscreenNotice = ref("");
const isFullscreen = ref(false);
function fullscreenChanged(): void { isFullscreen.value = !!document.fullscreenElement; }
let returnFocus: HTMLElement | null = null;

watch(() => props.panel, async (value, previous) => {
  if (value && !previous) {
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    await nextTick();
    panelClose.value?.focus();
  } else if (!value && previous) {
    await nextTick();
    if (returnFocus?.isConnected && !returnFocus.matches(":disabled")) returnFocus.focus();
    else root.value?.querySelector<HTMLButtonElement>(".workspace-dock button")?.focus();
  }
});

function onKey(event: KeyboardEvent): void {
  if (event.key === "Escape" && props.panel) {
    if (document.querySelector("dialog[open]") || root.value?.querySelector(".workspace-composer")) return;
    event.stopPropagation();
    emit("close-panel");
  }
}
onMounted(() => { window.addEventListener("keydown", onKey); document.addEventListener("fullscreenchange", fullscreenChanged); fullscreenChanged(); observeChrome(); });
onBeforeUnmount(() => { window.removeEventListener("keydown", onKey); document.removeEventListener("fullscreenchange", fullscreenChanged); chromeObserver?.disconnect(); });

async function fullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await root.value?.requestFullscreen();
  } catch {
    fullscreenNotice.value = "Fullscreen is unavailable. The game still uses the browser window.";
  }
}
</script>

<template>
  <section ref="root" class="game-workspace" :class="{ 'has-panel': panel, 'is-intro': intro, 'is-cinematic': cinematic }" :data-workspace="intro ? undefined : 'game'">
    <header v-if="!intro" ref="headerElement" class="workspace-header">
      <a class="workspace-menu" href="/play" aria-label="Back to cases"><SiteIcon name="arrow-left" size="20px" /></a>
      <slot name="header">
        <div class="workspace-identity"><h1>{{ title }}</h1><span v-if="label">{{ label }}</span></div>
      </slot>
      <div class="workspace-actions"><slot name="actions" /><button type="button" class="workspace-fullscreen" aria-label="Toggle fullscreen" :aria-pressed="isFullscreen" :title="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'" @click="fullscreen"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" /></svg></button></div>
    </header>
    <div class="workspace-body">
      <div class="workspace-surface"><slot /></div>
      <aside v-if="panel" class="workspace-panel" role="dialog" :aria-label="panelTitle" aria-modal="false">
        <header><h2>{{ panelTitle }}</h2><button ref="panelClose" type="button" :aria-label="`Close ${panelTitle}`" @click="emit('close-panel')"><SiteIcon name="close" size="20px" /></button></header>
        <div class="workspace-panel-content"><slot name="panel" /></div>
      </aside>
    </div>
    <div v-if="$slots.composer" class="workspace-composer"><slot name="composer" /></div>
    <nav v-if="!intro" ref="dockElement" class="workspace-dock" aria-label="Investigation tools"><slot name="tools" /></nav>
    <slot name="notifications" />
    <p v-if="fullscreenNotice" class="workspace-announcement" role="status">{{ fullscreenNotice }}</p>
  </section>
</template>

<style scoped>
.game-workspace { --workspace-line: #83603b75; height: 100dvh; min-height: 0; width: 100%; display: grid; grid-template-rows: auto minmax(0, 1fr) auto; overflow: hidden; background: #110d09; color: #efe2cd; font-family: var(--font-body); }
.game-workspace.is-intro { display: block; height: auto; overflow: visible; background: transparent; }
.game-workspace:fullscreen { position: fixed; inset: 0; width: 100vw; height: 100dvh; min-width: 0; min-height: 0; max-width: none; max-height: none; margin: 0; padding: 0; border: 0; }
.is-intro .workspace-body, .is-intro .workspace-surface { display: block; overflow: visible; }
.workspace-header { display: flex; align-items: center; gap: 14px; min-height: 64px; padding: 8px 18px; border-bottom: 1px solid var(--workspace-line); background: #1b140e; }
.workspace-menu, .workspace-fullscreen, .workspace-panel > header button { display: grid; place-items: center; flex: 0 0 44px; width: 44px; height: 44px; padding: 0; color: #e8c58e; border: 1px solid var(--workspace-line); border-radius: 8px; background: #2a1e14; cursor: pointer; }
.workspace-identity { min-width: 0; flex: 1; }
.workspace-identity h1 { margin: 0; font: 600 clamp(19px, 2.1vw, 27px)/1.08 var(--font-display); }
.workspace-identity span { color: #c8b395; font-size: 11px; }
.workspace-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }
.workspace-body { display: grid; grid-template-columns: minmax(0, 1fr); min-height: 0; overflow: hidden; }
.has-panel .workspace-body { grid-template-columns: minmax(0, 1fr) min(390px, 36%); }
.workspace-surface { min-width: 0; min-height: 0; position: relative; overflow: hidden; }
.workspace-panel { min-width: 0; min-height: 0; display: grid; grid-template-rows: auto minmax(0, 1fr); background: #20160f; border-left: 1px solid var(--workspace-line); }
.workspace-panel > header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--workspace-line); }
.workspace-panel h2 { margin: 0; font: 600 25px var(--font-display); }
.workspace-panel-content { min-height: 0; overflow: auto; overscroll-behavior: contain; padding: 16px; }
.workspace-dock { display: flex; justify-content: center; gap: 8px; padding: 10px max(12px, env(safe-area-inset-right)) max(10px, env(safe-area-inset-bottom)); border-top: 1px solid var(--workspace-line); background: #1c140e; overflow-x: auto; }
.workspace-dock :deep(button) { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; flex-shrink: 0; padding: 9px 18px; color: #dcc9ab; background: #2b1f15; border: 1px solid #82603b70; border-radius: 8px; font: 600 12px var(--font-body); cursor: pointer; }
.workspace-dock :deep(button[aria-pressed=true]) { background: #e1bc7b; border-color: #e1bc7b; color: #26190e; }
.workspace-dock :deep(button:disabled) { opacity: .45; cursor: default; }
.workspace-header :deep(button:focus-visible), .workspace-menu:focus-visible, .workspace-dock :deep(button:focus-visible), .workspace-panel button:focus-visible { outline: 2px solid #f0ce97; outline-offset: 3px; }
.workspace-announcement { position: absolute; inset: auto 20px 80px; max-width: 60ch; padding: 12px 16px; background: #2d2016; color: #ead8b9; border: 1px solid #ab7e46; z-index: 20; }
.is-cinematic { --workspace-header-space: 72px; --workspace-dock-space: calc(76px + env(safe-area-inset-bottom, 0px)); position: relative; isolation: isolate; grid-template-columns: minmax(0, 1fr); }
.is-cinematic .workspace-body { grid-area: 1 / 1 / -1 / -1; position: relative; grid-template-columns: minmax(0, 1fr); }
.is-cinematic .workspace-header { grid-area: 1 / 1; z-index: 5; align-self: start; min-height: 60px; padding: 8px 20px; border: 0; background: linear-gradient(#130e09eb, #130e09b3 65%, #130e0940); }
.is-cinematic .workspace-menu, .is-cinematic .workspace-fullscreen { background: #281c1080; border-color: #c69a5a45; }
.is-cinematic .workspace-identity { text-shadow: 0 2px 8px #0009; }
.is-cinematic .workspace-dock { grid-area: 3 / 1; z-index: 5; align-self: end; align-items: center; gap: 24px; padding: 8px 20px max(8px, env(safe-area-inset-bottom)); border: 0; background: linear-gradient(#130e0940, #130e09c7 55%, #130e09eb); }
.is-cinematic .workspace-dock :deep(button) { min-width: 44px; min-height: 44px; padding: 8px 16px; border-color: transparent; color: #f0dfc3; background: #2c2015a6; }
.is-cinematic .workspace-dock :deep(button[aria-pressed=true]) { border-color: #d6b07570; color: #fff0d3; background: #755326b8; }
.is-cinematic .workspace-dock :deep(button:hover:not(:disabled)), .is-cinematic .workspace-menu:hover, .is-cinematic .workspace-fullscreen:hover { background: #78572aab; }
.is-cinematic .workspace-panel { position: absolute; z-index: 4; top: var(--workspace-header-space); right: 20px; bottom: var(--workspace-dock-space); width: min(360px, calc(100% - 40px)); border: 1px solid #bd93574a; border-radius: 12px; background: #21170edb; box-shadow: 0 16px 48px #0006; }
.is-cinematic .workspace-panel > header { padding: 8px 16px; }
.is-cinematic .workspace-panel-content { padding: 16px 20px 20px; }
.workspace-composer { position: absolute; z-index: 6; right: 20px; bottom: var(--workspace-dock-space, 76px); width: min(460px, calc(100% - 40px)); }
@supports (backdrop-filter: blur(1px)) { .is-cinematic .workspace-header, .is-cinematic .workspace-dock { backdrop-filter: blur(8px); } .is-cinematic .workspace-panel { backdrop-filter: blur(16px); } }
@media (max-width: 760px) { .workspace-header { min-height: 58px; gap: 8px; padding: 6px 10px; } .workspace-fullscreen { display: none; } .workspace-dock { justify-content: flex-start; gap: 6px; } .workspace-dock :deep(button) { padding: 9px 12px; gap: 6px; } .has-panel .workspace-body { grid-template-columns: minmax(0, 1fr); } .has-panel .workspace-surface { display: none; } .workspace-panel { border-left: 0; } }
@media (max-width: 760px) {
  .is-cinematic { --workspace-header-space: 64px; --workspace-dock-space: calc(72px + env(safe-area-inset-bottom, 0px)); }
  .is-cinematic .workspace-header { min-height: 58px; gap: 8px; padding: 6px 12px; }
  .is-cinematic .workspace-dock { gap: 8px; justify-content: flex-start; padding: 8px 12px max(8px, env(safe-area-inset-bottom)); }
  .is-cinematic .workspace-dock :deep(button) { padding: 8px 10px; gap: 6px; }
  .is-cinematic .workspace-panel { top: var(--workspace-header-space); right: 12px; bottom: var(--workspace-dock-space); width: calc(100% - 24px); background: #21170ef2; }
  .is-cinematic .workspace-panel-content { padding: 12px 16px 16px; }
  .workspace-composer { right: 12px; width: calc(100% - 24px); }
}
@media (prefers-reduced-transparency: reduce) { .is-cinematic .workspace-header, .is-cinematic .workspace-dock, .is-cinematic .workspace-panel { background: #1c140ef7; backdrop-filter: none; } }
@media (max-width: 760px) { .workspace-fullscreen { display: grid; } }
</style>
