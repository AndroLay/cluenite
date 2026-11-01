<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { ClueStatus, QuickStage } from "../quickCase/viewModel";
import type { CaseScene } from "../scene/caseScene";

// Decorative room for the case, drawn with PixiJS. The stage drives the detective's pose, and the room
// keeps moving on its own (rain, lamp flicker, drifting dust, a slow clock). Clue statuses light the case
// files on the desk: locked stays dark, unlocked turns to paper, and linked adds a teal strip and a thread
// between the linked files. The reveal stage adds one authored moment: a lightning flash, and the clock
// stops. Under prefers-reduced-motion the scene paints once and does not animate. The stage label, clue
// labels, and hints carry the meaning, so this is hidden from AT.
const props = defineProps<{
  stage: QuickStage;
  clues: ClueStatus[];
  obs: boolean;
}>();

const host = ref<HTMLDivElement | null>(null);
let scene: CaseScene | null = null;
let disposed = false;

onMounted(async () => {
  const el = host.value;
  if (!el) return;
  try {
    // Loaded on demand so PixiJS stays out of the initial bundle; the card is usable without it.
    const { createCaseScene } = await import("../scene/caseScene");
    const created = await createCaseScene(el, props.stage);
    if (disposed) {
      created.destroy();
      return;
    }
    scene = created;
    // The stage or clues may have changed while the renderer was starting.
    scene.setStage(props.stage);
    scene.setClues(props.clues);
  } catch (error) {
    // No WebGL, or the renderer failed to start: the card keeps its background, and the stage text
    // still explains the state.
    console.warn("Case scene could not start", error);
  }
});

watch(
  () => props.stage,
  (stage) => scene?.setStage(stage),
);

// Keyed on the joined statuses, so a parent that rebuilds the array each render does not re-tween.
watch(
  () => props.clues.join(","),
  () => scene?.setClues(props.clues),
);

onBeforeUnmount(() => {
  disposed = true;
  scene?.destroy();
  scene = null;
});
</script>

<template>
  <div ref="host" class="scene" :class="{ 'is-obs': obs }" :data-stage="stage" aria-hidden="true" />
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
.scene :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}

/* OBS: same room, shorter so the board stays readable over gameplay. */
.scene.is-obs {
  aspect-ratio: 4 / 1;
}
</style>
