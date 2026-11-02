<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { reduceMotion } from "../site/settings";
import type { CaseStage, SceneObject, ScenePoint } from "../scene/caseStage";

const props = defineProps<{ mode: "quick" | "mystery" | "coop"; team: string | null; objects: SceneObject[]; overlay: boolean; running: boolean; focus: ScenePoint | null; cue: { id: number; label: string; kind: "clue" | "share" | "proof"; point?: ScenePoint } | null }>();
const emit = defineEmits<{ pick: [id: string] }>();
const host = ref<HTMLElement | null>(null);
const ready = ref(false);
const theme = computed(() => props.mode === "quick" ? "gallery" : props.mode === "mystery" ? "festival" : "signal");
let stage: CaseStage | null = null;
let disposed = false;
onMounted(async () => {
  try {
    const { createCaseStage } = await import("../scene/caseStage");
    if (!host.value || disposed) return;
    const created = await createCaseStage(host.value, { theme: theme.value, objects: props.objects, onPick: id => emit("pick", id), team: props.team, paused: !props.running, reduced: reduceMotion.value });
    if (disposed) { created.destroy(); return; }
    stage = created; ready.value = true;
    stage.state({ paused: !props.running, reduced: reduceMotion.value, overlay: props.overlay });
    stage.objects(props.objects);
    stage.focus(props.focus);
  } catch { /* The vector scene and semantic clue controls remain usable without WebGL. */ }
});
watch(() => props.running, running => stage?.state({ paused: !running }));
watch(reduceMotion, reduced => stage?.state({ reduced }));
watch(() => props.focus, point => stage?.focus(point));
watch(() => props.overlay, overlay => stage?.state({ overlay }));
watch(() => props.cue?.id, () => { if (props.cue) stage?.cue(props.cue); });
watch(() => props.objects, objects => stage?.objects(objects), { deep: true });
onBeforeUnmount(() => { disposed = true; stage?.destroy(); stage = null; });
</script>

<template>
  <div ref="host" class="case-atmosphere" :class="{ 'is-ready': ready, 'is-overlay': overlay }" aria-hidden="true">
    <svg class="case-scene-fallback" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="fallback-room" x2="0" y2="1"><stop stop-color="#30252c"/><stop offset="1" stop-color="#100e10"/></linearGradient></defs><rect width="1600" height="900" fill="url(#fallback-room)"/><g v-if="mode !== 'coop'" fill="#35291f" stroke="#a7804a" stroke-width="3"><path d="M0 50 420 130H1180L1600 50M0 490H1600M0 620H1600" fill="none"/><rect v-for="x in [200, 610, 1020]" :key="x" :x="x" y="170" width="270" height="280" rx="100" fill="#171d23"/><path d="M0 900 800 480 1600 900M250 900 800 480 1350 900M500 900 800 480 1100 900" fill="none"/></g><g v-else><path d="M0 400H1600V900H0Z" fill="#172f3a"/><path v-for="y in [430, 490, 570, 680]" :key="y" :d="`M0 ${y} Q400 ${y - 40} 800 ${y} T1600 ${y}`" fill="none" stroke="#75918c" stroke-opacity=".4" stroke-width="3"/><path d="M80 0V640M530 0V640M1070 0V640M1520 0V640M0 640H1600" stroke="#72513a" stroke-width="18"/><circle cx="1190" cy="220" r="48" fill="#d7d4b2"/></g></svg>
  </div>
</template>

<style scoped>
.case-atmosphere { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.case-atmosphere svg, .case-atmosphere :deep(canvas) { position: absolute; inset: 0; width: 100%; height: 100%; }
.case-atmosphere :deep(canvas) { pointer-events: auto; touch-action: pan-y; }
.case-atmosphere.is-ready .case-scene-fallback, .case-atmosphere.is-overlay .case-scene-fallback { visibility: hidden; }
.case-atmosphere.is-overlay :deep(canvas) { pointer-events: none; }
.case-atmosphere.is-overlay { z-index: 4; }
</style>
