<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { reduceMotion } from "../site/settings";
import type { CaseStage, ScenePoint } from "../scene/caseStage";

const props = defineProps<{ mode: "quick" | "mystery" | "coop"; team: string | null; image: string; overlay: boolean; running: boolean; focus: ScenePoint | null; cue: { id: number; label: string; kind: "clue" | "share" | "proof"; point?: ScenePoint } | null }>();
const host = ref<HTMLElement | null>(null);
const ready = ref(false);
const theme = computed(() => props.mode === "quick" ? "gallery" : props.mode === "mystery" ? "festival" : "signal");
let stage: CaseStage | null = null;
let disposed = false;
onMounted(async () => {
  try {
    const { createCaseStage } = await import("../scene/caseStage");
    if (!host.value || disposed) return;
    const created = await createCaseStage(host.value, { theme: theme.value, background: props.image, team: props.team, paused: !props.running, reduced: reduceMotion.value });
    if (disposed) { created.destroy(); return; }
    stage = created; ready.value = true;
    stage.state({ paused: !props.running, reduced: reduceMotion.value, overlay: props.overlay });
    stage.focus(props.focus);
  } catch { /* The sharp image remains available when GPU rendering cannot start. */ }
});
watch(() => props.running, running => stage?.state({ paused: !running }));
watch(reduceMotion, reduced => stage?.state({ reduced }));
watch(() => props.focus, point => stage?.focus(point));
watch(() => props.overlay, overlay => stage?.state({ overlay }));
watch(() => props.cue?.id, () => { if (props.cue) stage?.cue(props.cue); });
onBeforeUnmount(() => { disposed = true; stage?.destroy(); stage = null; });
</script>

<template>
  <div ref="host" class="case-atmosphere" :class="{ 'is-ready': ready, 'is-overlay': overlay }" aria-hidden="true">
    <img :src="image" alt="" />
  </div>
</template>

<style scoped>
.case-atmosphere { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.case-atmosphere img, .case-atmosphere :deep(canvas) { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.case-atmosphere.is-ready img, .case-atmosphere.is-overlay img { visibility: hidden; }
.case-atmosphere.is-overlay { z-index: 4; }
</style>
