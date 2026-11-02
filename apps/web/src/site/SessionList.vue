<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { SessionSummary } from "@cluenite/contracts";
import { api, apiMessage } from "../net/api";
import { newIdempotencyKey } from "../net/idempotency";
import { account, checkAccount, TWITCH_START } from "./account";
import { listSessions, sessionHref } from "./sessions";

const props = withDefaults(defineProps<{ selectable?: boolean; modelValue?: string; caseId?: string }>(), { modelValue: "" });
const emit = defineEmits<{
  "update:modelValue": [id: string];
  loaded: [sessions: SessionSummary[]];
}>();
const rows = ref<SessionSummary[]>([]);
const state = ref<"loading" | "ready" | "signed-out" | "error">("loading");
const error = ref("");
const busy = ref("");
const keys = new Map<string, string>();
async function load(force = false): Promise<void> {
  state.value = "loading";
  error.value = "";
  const auth = await checkAccount(force);
  if (auth.kind === "signed-out") { state.value = "signed-out"; return; }
  if (auth.kind !== "signed-in") { state.value = "error"; error.value = "Your sign-in could not be checked."; return; }
  try {
    const all = await listSessions();
    rows.value = props.caseId ? all.filter(row => row.caseId === props.caseId) : all;
    emit("loaded", rows.value);
    // Selection is an explicit choice. A refresh never rejoins or changes a round.
    if (props.modelValue && !rows.value.some(row => row.sessionId === props.modelValue && !row.needsRejoin)) emit("update:modelValue", "");
    state.value = "ready";
  } catch (cause) { error.value = apiMessage(cause); state.value = "error"; }
}
async function rejoin(row: SessionSummary): Promise<void> {
  if (busy.value || account.state.kind !== "signed-in") return;
  busy.value = row.sessionId;
  error.value = "";
  const key = keys.get(row.sessionId) ?? newIdempotencyKey();
  keys.set(row.sessionId, key);
  try {
    await api(`/api/coops/sessions/${encodeURIComponent(row.sessionId)}/rejoin`, { method: "POST", csrf: account.state.csrf, key });
    keys.delete(row.sessionId);
    window.location.assign(sessionHref(row));
  } catch (cause) { error.value = apiMessage(cause); busy.value = ""; }
}
onMounted(() => { void load(); });
defineExpose({ reload: load });
</script>

<template>
  <section class="saved-sessions" aria-label="Saved sessions" :aria-busy="state === 'loading'">
    <div class="saved-heading"><h2>Saved sessions</h2><button type="button" class="gs-btn gs-btn--ghost" :disabled="state === 'loading' || !!busy" @click="load(true)">Refresh sessions</button></div>
    <p v-if="state === 'loading'" role="status">Loading your open sessions…</p>
    <p v-else-if="state === 'signed-out'"><a :href="TWITCH_START">Connect Twitch</a> to find your saved sessions.</p>
    <p v-else-if="state === 'ready' && rows.length === 0">No open sessions yet. Choose a case to create one.</p>
    <ul v-else-if="state === 'ready'" class="saved-list">
      <li v-for="row in rows" :key="row.sessionId">
        <div><strong>{{ row.title }}</strong><small>{{ row.phase.replaceAll('_', ' ').toLowerCase() }} · {{ row.role }} · Team {{ row.team }} · {{ row.sessionId.slice(0, 8) }}</small></div>
        <button v-if="row.needsRejoin" type="button" class="gs-btn gs-btn--gold" :disabled="!!busy" @click="rejoin(row)">{{ busy === row.sessionId ? 'Rejoining…' : 'Rejoin with this account' }}</button>
        <button v-else-if="selectable" type="button" class="gs-btn gs-btn--ghost" :aria-pressed="modelValue === row.sessionId" @click="emit('update:modelValue', row.sessionId)">{{ modelValue === row.sessionId ? 'Selected' : 'Select session' }}</button>
        <a v-else class="gs-btn gs-btn--gold" :href="sessionHref(row)">Continue session</a>
      </li>
    </ul>
    <p v-if="error" class="gs-notice" role="alert">{{ error }}</p>
  </section>
</template>

<style scoped>
.saved-sessions { margin-block: 20px; padding: 18px; border: 1px solid var(--gs-rule, #7d6240); border-radius: 6px; background: var(--case-panel, #201c17); color: var(--case-paper, #f1e2c8); }
.saved-heading, .saved-list li { display: flex; gap: 12px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
h2 { font: 600 22px var(--gs-serif, Georgia, serif); margin: 0; }
.saved-list { list-style: none; padding: 0; margin: 12px 0 0; display: grid; gap: 14px; }
.saved-list li > div { min-width: 0; overflow-wrap: anywhere; }
small { display: block; margin-top: 5px; color: var(--case-muted, #cdbca1); }
p { margin-bottom: 0; }
</style>
