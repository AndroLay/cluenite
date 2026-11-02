<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import SiteIcon from "./SiteIcon.vue";

const props = withDefaults(defineProps<{
  entry: { id: string | number; title: string; text: string; code?: string; image?: string | null } | null;
  kind?: "discovery" | "crew";
  action?: string;
}>(), { kind: "discovery", action: "" });
const emit = defineEmits<{ inspect: [] }>();
const visible = ref(false);
const held = ref(false);
let timer: number | undefined;
let deadline = 0;
let remaining = 7000;
function schedule(): void {
  window.clearTimeout(timer);
  deadline = Date.now() + remaining;
  timer = window.setTimeout(() => { visible.value = false; }, remaining);
}
function hold(): void { if (held.value) return; held.value = true; remaining = Math.max(500, deadline - Date.now()); window.clearTimeout(timer); }
function release(): void { if (!held.value) return; held.value = false; schedule(); }
watch(() => props.entry?.id, () => {
  window.clearTimeout(timer);
  visible.value = !!props.entry;
  held.value = false;
  remaining = props.kind === "crew" ? 4800 : 7000;
  if (visible.value) schedule();
}, { immediate: true });
onBeforeUnmount(() => window.clearTimeout(timer));
</script>

<template>
  <aside v-if="visible && entry" :key="entry.id" class="game-notification" :class="[`is-${kind}`, { 'is-held': held }]" :role="kind === 'discovery' ? 'status' : undefined" :aria-live="kind === 'discovery' ? 'polite' : 'off'" :aria-label="kind === 'discovery' ? 'New discovery' : 'Crew activity'" @pointerenter="hold" @pointerleave="release" @focusin="hold" @focusout="release">
    <span class="notification-symbol" aria-hidden="true"><SiteIcon :name="kind === 'discovery' ? 'search' : 'chat'" /></span>
    <div class="notification-copy"><span class="notification-kind">{{ kind === 'discovery' ? 'Evidence found' : 'Working together' }}<code v-if="entry.code">{{ entry.code }}</code></span><h2>{{ entry.title }}</h2><div v-if="entry.image || $slots.art" class="notification-art"><slot name="art"><img :src="entry.image ?? ''" alt="" /></slot></div><p>{{ entry.text }}</p><button v-if="action" type="button" @click="emit('inspect')">{{ action }} <SiteIcon name="arrow-right" /></button></div>
    <span class="notification-lifetime" aria-hidden="true"></span>
  </aside>
</template>

<style scoped>
.game-notification { position: fixed; z-index: 12; top: calc(var(--workspace-header-measured, 118px) + 20px); left: max(20px, env(safe-area-inset-left)); display: flex; align-items: flex-start; gap: 12px; width: min(320px, calc(100vw - 40px)); padding: 18px 18px 16px; overflow: hidden; border: 1px solid #bc945451; border-radius: 12px; color: #f4e5ca; background: #20160cc4; box-shadow: 0 14px 36px #0005; backdrop-filter: blur(12px); font-family: var(--font-body); pointer-events: none; animation: discovery-pass 7s cubic-bezier(.16,1,.3,1) both; }
.notification-symbol { display: grid; place-items: center; flex: 0 0 28px; height: 28px; color: #efc77e; border: 1px solid #bd935760; border-radius: 50%; }
.notification-copy { flex: 1; min-width: 0; }
.notification-kind { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 12px; color: #ddbd87; font-size: 10px; }
.notification-kind code { font-size: 9px; opacity: .8; }
h2 { margin: 5px 0 8px; font: 600 26px/1.1 var(--font-display); }
p { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; margin: 0; color: #e1cfb0; font-size: 12px; line-height: 1.65; }
.notification-art { float: left; width: 68px; height: 68px; margin: 0 12px 6px 0; }
.notification-art :deep(img), .notification-art :deep(svg) { width: 100%; height: 100%; object-fit: contain; }
button { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; margin: 7px 0 -5px; padding: 6px 0; border: 0; color: #f1d49d; background: transparent; font: 600 12px var(--font-body); cursor: pointer; pointer-events: auto; }
button:focus-visible { outline: 2px solid #efd09b; outline-offset: 3px; }
.notification-lifetime { position: absolute; inset: auto 0 0; height: 2px; background: #d8ae68; transform-origin: left; animation: discovery-life 7s linear both; }
.is-crew { top: auto; bottom: calc(var(--workspace-dock-measured, var(--workspace-dock-space, 76px)) + 12px); padding: 12px 16px; width: min(320px, calc(100vw - 40px)); animation-duration: 4.8s; background: #20160bd1; }
.is-crew h2 { font: 600 13px/1.3 var(--font-body); margin: 4px 0; color: #f1d39e; }
.is-crew .notification-kind { font-size: 9px; }
.is-crew .notification-symbol { background: #9c683330; }
.is-crew p { -webkit-line-clamp: 2; }
.is-crew .notification-lifetime { animation-duration: 4.8s; }
.is-held, .is-held .notification-lifetime { animation-play-state: paused; }
@keyframes discovery-pass { 0% { opacity: 0; transform: translateX(-28px); } 7%, 90% { opacity: 1; transform: none; } 100% { opacity: 0; transform: translateX(-12px); } }
@keyframes discovery-life { to { transform: scaleX(0); } }
@media(max-width: 760px) { .game-notification { top: calc(var(--workspace-header-measured, 138px) + 12px); left: 12px; width: min(290px, calc(100vw - 24px)); padding: 14px; } .is-crew { top: auto; bottom: calc(var(--workspace-dock-measured, var(--workspace-dock-space, 76px)) + 8px); } h2 { font-size: 23px; } }
@media(max-height: 560px) { .game-notification.is-discovery { top: calc(var(--workspace-header-measured, 70px) + 12px); padding: 12px; width: min(280px, calc(100vw - 24px)); } .notification-art { width: 42px; height: 42px; } h2 { font-size: 22px; } p { -webkit-line-clamp: 2; } .is-crew { display: none; } }
@media(prefers-reduced-motion: reduce) { .game-notification, .notification-lifetime { animation: none; } }
:global(html[data-motion="reduced"]) .game-notification, :global(html[data-motion="reduced"]) .notification-lifetime { animation: none; }
@media(prefers-reduced-transparency: reduce) { .game-notification { background: #20160cf5; backdrop-filter: none; } }
</style>
