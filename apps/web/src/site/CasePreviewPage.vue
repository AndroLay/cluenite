<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { RoundSnapshot } from "@cluenite/contracts";
import LiveCaseExperience from "../components/LiveCaseExperience.vue";

const props = defineProps<{ caseId: string }>();
const snapshot = ref<RoundSnapshot | null>(null);
const error = ref("");
const loading = ref(true);

// Preview metadata comes from the same public catalog as /play. No authored answer or private proof ships here.
async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    const response = await fetch("/api/cases", { credentials: "same-origin", headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("The case catalog is unavailable. Start the server and try again.");
    const body: { cases?: { id: string; mode: RoundSnapshot["caseMode"]; title: string; premise: string; question: string; clues: { id: string; label: string; teaser?: string }[]; verdicts: RoundSnapshot["verdicts"] }[] } = await response.json();
    const item = body.cases?.find(candidate => candidate.id === props.caseId);
    if (!item || !["quick", "mystery", "coop"].includes(item.mode) || !Array.isArray(item.clues) || !Array.isArray(item.verdicts)) throw new Error("This case is not in the server's public catalog.");
    snapshot.value = { protocolVersion: 1, revision: 0, sessionId: `preview-${item.id}`, source: "simulation", caseId: item.id, caseMode: item.mode, team: null, title: item.title, premise: item.premise, question: item.question, phase: "READY", stage: "observe", paused: false, timer: { elapsedMs: 0, running: false }, clues: item.clues.map(clue => ({ id: clue.id, label: clue.label, teaser: clue.teaser ?? "Investigate this clue during a live Twitch round.", status: "locked", observation: null })), evidence: [], sequences: [], theories: [], currentHint: null, hintLevel: 0, availableActions: [], verdicts: item.verdicts, chosenVerdictId: null, revealText: null };
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "The preview could not load.";
  } finally { loading.value = false; }
}
onMounted(() => { void load(); });
</script>

<template>
  <LiveCaseExperience v-if="snapshot" :snapshot="snapshot" preview />
  <main v-else class="preview-loading"><a href="/play">Back to cases</a><h1>Case preview</h1><p v-if="loading" role="status">Opening the public case briefing…</p><template v-else><p role="alert">{{ error }}</p><button type="button" @click="load">Retry preview</button><p>You can still <a href="/play#practice">play a practice case</a> in this browser.</p></template></main>
</template>

<style scoped>
.preview-loading { min-height: 100dvh; padding: clamp(24px, 6vw, 80px); background: #1c140e; color: #e8d4b2; font: 15px/1.7 var(--font-body); }
h1 { font: 600 48px var(--font-display); margin: 32px 0 16px; }
a { color: #dfbc7e; }
button { min-height: 44px; padding: 10px 20px; border: 1px solid #c09960; background: #dfbc7e; color: #302012; border-radius: 6px; font: inherit; cursor: pointer; }
button:focus-visible, a:focus-visible { outline: 2px solid #dfbc7e; outline-offset: 4px; }
</style>
