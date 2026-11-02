<script setup lang="ts">
import { computed } from "vue";
import type { Portrait } from "../sampleCase/boardCases";
import { CAST_ATLAS, CAST_CELLS } from "./portraits/atlas";
const props = defineProps<{ kind: Portrait; cleared?: boolean }>();
const art = computed(() => ({ backgroundImage: `url(${CAST_ATLAS})`, backgroundPosition: `${CAST_CELLS[props.kind][0] * 50}% ${CAST_CELLS[props.kind][1] * 100}%` }));
</script>

<template>
  <span class="portrait" :class="{ 'is-cleared': cleared }" :style="art" aria-hidden="true"></span>
</template>

<style scoped>
.portrait { display: block; width: 100%; aspect-ratio: 1; background-size: 300% 200%; background-repeat: no-repeat; border-radius: inherit; transition: filter 400ms ease-out; }
.portrait.is-cleared { filter: grayscale(.75) brightness(.75); }
@media (prefers-reduced-motion: reduce) { .portrait { transition: none; } }
</style>
