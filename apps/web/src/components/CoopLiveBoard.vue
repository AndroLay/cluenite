<script setup lang="ts">
import { computed, ref } from "vue";
import type { RoundSnapshot } from "@cluenite/contracts";
import harbor from "../site/plates/port.jpg";
import records from "../site/plates/game_writing.jpg";

// Only the authenticated participant projection reaches this component. A URL never selects a team.
const props = defineProps<{ snapshot: RoundSnapshot; interactive: boolean; notice: { tone: "ok" | "warn"; text: string } | null }>();
const emit = defineEmits<{ command: [text: string] }>();
const shared = ref(new URLSearchParams(window.location.search).get("view") === "shared" || window.location.pathname === "/coop/shared");
const actions = computed(() => new Set(props.snapshot.availableActions));
const active = computed(() => props.interactive && props.snapshot.phase === "ACTIVE" && !props.snapshot.paused);
const station = computed(() => props.snapshot.team === "A" ? "Field workstation" : "Records workstation");
const publicEvidence = computed(() => props.snapshot.evidence.filter(item => item.shared || item.team === null));
const localEvidence = computed(() => props.snapshot.evidence.filter(item => item.team === props.snapshot.team));
const stationCommand = computed(() => props.snapshot.team === "A" ? "!scan P4" : "!verify B17");
const chosen = computed(() => props.snapshot.verdicts.find(item => item.id === props.snapshot.chosenVerdictId));
function command(text: string, action: string): void { if (active.value && actions.value.has(action)) emit("command", text); }
</script>

<template>
  <section class="coop-live" aria-labelledby="coop-live-title">
    <header class="coop-head">
      <div><p class="coop-eyebrow">Team {{ snapshot.team }} · {{ snapshot.phase.replaceAll('_', ' ') }}</p><h2 id="coop-live-title">{{ snapshot.title }}</h2><p>{{ snapshot.premise }}</p></div>
      <nav aria-label="Co-op views"><button type="button" :aria-pressed="!shared" @click="shared = false">{{ station }}</button><button type="button" :aria-pressed="shared" @click="shared = true">Shared breakthrough</button></nav>
    </header>
    <p v-if="notice" class="coop-note" role="status">{{ notice.text }}</p>
    <p v-if="snapshot.phase === 'COOP_WAITING'" class="coop-note" role="status">Waiting for the partner to accept. The host can manage invitations from <a href="/coop">Live co-op</a>.</p>
    <p v-else-if="snapshot.phase === 'READY'" class="coop-note" role="status">Both teams are ready. The host starts the round from Host controls.</p>
    <p v-else-if="snapshot.phase === 'PAUSED'" class="coop-note" role="status">The host paused this round. Findings remain saved.</p>

    <div v-if="!shared" class="coop-columns">
      <section class="coop-panel" aria-labelledby="coop-station-title">
        <div class="coop-scene" :style="{ backgroundImage: `linear-gradient(0deg, #15110ecc, #15110e22), url(${snapshot.team === 'A' ? harbor : records})` }"><h3 id="coop-station-title">{{ station }}</h3><p>{{ snapshot.question }}</p></div>
        <div class="coop-body"><p>Your chat investigates this station. Ask viewers to type <code>{{ stationCommand }}</code> in your Twitch channel. Station proof and sharing require viewer chat participation.</p><p v-for="item in localEvidence" :key="item.id">{{ item.label }} <span v-if="item.shared">· shared</span><span v-else> · Ask chat: <code>!share {{ item.id }}</code></span></p></div>
      </section>
      <section class="coop-panel" aria-labelledby="coop-observations-title">
        <div class="coop-body"><h3 id="coop-observations-title">Your station notebook</h3><article v-for="clue in snapshot.clues" :key="clue.id" class="coop-clue"><h4>{{ clue.label }}</h4><p>{{ clue.observation ?? clue.teaser }}</p><button v-if="clue.status === 'locked'" type="button" :disabled="!active || !actions.has('look')" @click="command(`!look ${clue.id}`, 'look')">Inspect {{ clue.label }}</button></article><p v-if="!snapshot.clues.length">No station clues are available in this snapshot.</p></div>
      </section>
    </div>
    <section v-else class="coop-panel coop-body" aria-labelledby="coop-shared-title">
      <p class="coop-eyebrow">Cross-community evidence</p><h3 id="coop-shared-title">Shared breakthrough</h3>
      <p>Only shared findings and public proof returned by the server appear here. Your partner's private discoveries stay at their station.</p>
      <ul v-if="publicEvidence.length"><li v-for="item in publicEvidence" :key="item.id"><strong>{{ item.label }}</strong><small>{{ item.team ? `Shared by Team ${item.team}` : 'Shared proof' }}</small></li></ul><p v-else>No shared findings yet. Each chat must investigate and share its station records.</p>
    </section>
    <section class="coop-panel coop-body" aria-labelledby="coop-verdict-title">
      <h3 id="coop-verdict-title">{{ snapshot.stage === 'reveal' ? 'Case result' : 'Reach a verdict' }}</h3>
      <template v-if="snapshot.revealText"><h4>{{ chosen?.label ?? 'Round ended' }}</h4><p>{{ snapshot.revealText }}</p></template>
      <template v-else><p>{{ snapshot.question }}</p><div class="coop-verdicts"><button v-for="verdict in snapshot.verdicts" :key="verdict.id" type="button" :disabled="!active || !actions.has('solve')" @click="command(`!solve ${verdict.id}`, 'solve')">{{ verdict.label }}</button></div><p>Every verdict is checked by the server against the discoveries made by both communities.</p></template>
      <p v-if="snapshot.currentHint" role="status">Hint {{ snapshot.hintLevel }}: {{ snapshot.currentHint }}</p>
      <button v-if="actions.has('hint')" type="button" :disabled="!active" @click="command('!hint', 'hint')">Request a hint</button>
    </section>
  </section>
</template>

<style scoped>
.coop-live { width: min(1200px, 100%); min-width: 0; color: var(--case-paper); }
.coop-head { display: flex; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
h2 { font: 600 clamp(28px, 4vw, 42px) var(--font-display); margin: 8px 0; }
h3 { font: 600 24px var(--font-display); margin: 0 0 12px; }
h4 { margin: 0; font-size: 17px; }
p { line-height: 1.6; overflow-wrap: anywhere; }
.coop-eyebrow { color: var(--case-amber); text-transform: uppercase; letter-spacing: .1em; font-size: 12px; }
nav, .coop-verdicts { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
button { min-height: 44px; padding: 10px 14px; border-radius: 4px; border: 1px solid var(--case-rule); background: var(--case-panel); color: var(--case-paper); font: inherit; cursor: pointer; }
button[aria-pressed=true] { border-color: var(--case-amber); color: var(--case-amber); }
button:disabled { opacity: .5; cursor: default; }
button:focus-visible, a:focus-visible { outline: 2px solid var(--case-amber); outline-offset: 3px; }
.coop-columns { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 18px; }
.coop-panel, .coop-note { margin-block: 20px; background: var(--case-panel); border: 1px solid var(--case-rule); border-radius: 5px; overflow: hidden; }
.coop-body, .coop-note { padding: 22px; }
.coop-scene { padding: 160px 24px 18px; background-size: cover; background-position: center; }
.coop-clue { padding-block: 16px; border-bottom: 1px solid var(--case-rule); }
small { display: block; color: var(--case-muted); }
li { margin-block: 12px; }
code { white-space: normal; overflow-wrap: anywhere; }
@media(max-width: 760px) { .coop-columns { grid-template-columns: minmax(0, 1fr); } .coop-body { padding: 16px; } }
</style>
