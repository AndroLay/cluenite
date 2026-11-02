<script setup lang="ts">
import { computed } from "vue";
import type { Portrait } from "../sampleCase/boardCases";
import castAtlas from "./portraits/cast-atlas-v1.png";
const props = defineProps<{ kind: Portrait; cleared?: boolean }>();
const positions: Record<Portrait, string> = { hat: "0% 0%", cap: "50% 0%", bun: "100% 0%", beard: "0% 100%", scarf: "50% 100%", bob: "100% 100%" };
const art = computed(() => ({ backgroundImage: `url(${castAtlas})`, backgroundPosition: positions[props.kind] }));
</script>

<template>
  <span class="portrait" :class="{ 'is-cleared': cleared }" :style="art" aria-hidden="true"></span>
</template>

<style scoped>
.portrait { display: block; width: 100%; aspect-ratio: 1; background-size: 300% 200%; background-repeat: no-repeat; border-radius: inherit; transition: filter 400ms ease-out; }
.portrait.is-cleared { filter: grayscale(.75) brightness(.75); }
@media (prefers-reduced-motion: reduce) { .portrait { transition: none; } }
</style>
