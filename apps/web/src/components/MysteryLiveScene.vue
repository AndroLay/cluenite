<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import museumGallery from "../assets/mystery-live/museum-gallery.png";
import type { MysteryLiveScene as MysterySceneHandle } from "../scene/mysteryLiveScene";

const props = defineProps<{ focusedClueId: string | null }>();

const host = ref<HTMLElement | null>(null);
const ready = ref(false);
let disposed = false;
let scene: MysterySceneHandle | null = null;

async function createScene() {
  const module = await import("../scene/mysteryLiveScene");
  return module.createMysteryLiveScene;
}

onMounted(async () => {
  try {
    const create = await createScene();
    const element = host.value;
    if (!element) return;
    const created = await create(element);
    if (disposed) {
      created.destroy();
      return;
    }
    scene = created;
    scene.focusClue(props.focusedClueId);
    ready.value = true;
  } catch (error) {
    console.warn("Mystery scene could not start", error);
  }
});

watch(
  () => props.focusedClueId,
  (clueId) => scene?.focusClue(clueId),
);

onBeforeUnmount(() => {
  disposed = true;
  scene?.destroy();
  scene = null;
});
</script>

<template>
  <div
    ref="host"
    class="mystery-live-scene"
    aria-hidden="true"
  >
    <img
      v-if="!ready"
      :src="museumGallery"
      alt=""
      class="mystery-scene-fallback"
    >
  </div>
</template>

<style scoped>
.mystery-live-scene {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #100d0a;
}

.mystery-live-scene :deep(canvas),
.mystery-scene-fallback {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}

.mystery-scene-fallback {
  object-fit: cover;
  object-position: center;
}
</style>
