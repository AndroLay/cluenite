<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { SessionSummary } from "@cluenite/contracts";
import { sessionHref } from "./sessions";

defineProps<{ current: SessionSummary; nextTitle: string; busy: boolean; stopped: boolean }>();
defineEmits<{ confirm: [] }>();
const notice = ref<HTMLElement | null>(null);
onMounted(() => notice.value?.focus());
</script>

<template>
  <section ref="notice" class="gs-notice case-switch" role="region" aria-label="Switch case" tabindex="-1" :aria-busy="busy">
    <h2>Switch to {{ nextTitle }}?</h2>
    <p v-if="stopped">{{ current.title }} has been stopped. Retry starting {{ nextTitle }}.</p>
    <template v-else>
      <p>{{ current.title }} is still {{ current.phase.toLowerCase().replaceAll('_', ' ') }}.</p>
      <p>Stopping ends the round for everyone, including a co-op partner. It cannot be resumed.</p>
    </template>
    <div class="case-switch-actions">
      <button type="button" class="gs-btn gs-btn--gold" :disabled="busy" @click="$emit('confirm')">
        {{ busy ? 'Switching cases…' : stopped ? 'Retry starting this case' : 'Stop current case and start this one' }}
      </button>
      <a v-if="!stopped && !busy" class="gs-btn gs-btn--ghost" :href="sessionHref(current)">Continue {{ current.title }}</a>
    </div>
    <p v-if="busy" role="status">Waiting for server confirmation before opening the new case…</p>
  </section>
</template>

<style scoped>
.case-switch { display: block; margin-block: 18px; overflow-wrap: anywhere; }
.case-switch h2 { margin: 0 0 10px; font: 600 24px/1.25 var(--font-display, Georgia, serif); }
.case-switch p { margin: 8px 0; }
.case-switch-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 16px; }
.case-switch .gs-btn { min-height: 44px; white-space: normal; text-align: center; }
.case-switch:focus-visible { outline: 2px solid var(--gs-gold, #dfbc7e); outline-offset: 4px; }
</style>
