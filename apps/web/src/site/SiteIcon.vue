<script setup lang="ts">
import { ICON_PATHS, type SiteIconName } from "./icons";

// Decorative inline SVG icon. The text next to it carries the meaning, so it is hidden from assistive technology.
withDefaults(defineProps<{ name: SiteIconName; size?: string; stroke?: number }>(), { size: "1em", stroke: 1.8 });
</script>

<template>
  <svg
    class="site-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="stroke"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="(d, i) in ICON_PATHS[name]" :key="i" :d="d" />
  </svg>
</template>

<style scoped>
.site-icon {
  display: inline-block;
  flex: none;
  vertical-align: -0.14em;
}
</style>
