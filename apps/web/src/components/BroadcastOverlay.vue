<script setup lang="ts">
import { computed } from "vue";
import type { QuickCaseView } from "../quickCase/viewModel";
import SiteIcon from "../site/SiteIcon.vue";

const props = defineProps<{ view: QuickCaseView; elapsed: string; position: string; scale: number; mode: "quick" | "mystery" | "coop"; team: "A" | "B" | null }>();
const steps = ["observe", "connect", "challenge", "reveal"];
const stageIndex = computed(() => Math.max(0, steps.indexOf(props.view.stage)));
const stageLabel = computed(() => ({ observe: "Investigate the scene", connect: "Connect the evidence", challenge: "Make your case", reveal: "Case closed" })[props.view.stage]);
const found = computed(() => props.view.clues.filter(clue => clue.status !== "locked").length);
const finding = computed(() => props.view.evidence.at(-1));
const verdict = computed(() => props.view.verdicts.find(item => item.id === props.view.chosenVerdictId));
const modeLabel = computed(() => props.mode === "coop" ? `Co-op${props.team ? ` · Station ${props.team}` : ""}` : props.mode === "mystery" ? "Mystery Live" : "Quick Case");
const command = computed(() => props.mode === "coop" ? props.team === "B" ? "!verify B17" : "!scan P4" : `${props.mode === "mystery" ? "!inspect" : "!look"} ${props.view.clues.find(clue => clue.status === "locked")?.id ?? "CLUE"}`);
</script>

<template>
  <aside class="broadcast-overlay" :data-pos="position" :data-stage="view.stage" :style="{ '--broadcast-scale': scale }" aria-label="Broadcast case overlay">
    <header class="broadcast-header"><div class="broadcast-identity"><span>{{ modeLabel }} · {{ view.source === 'simulation' ? 'Sample data' : view.paused ? 'Paused' : 'Investigation' }}</span><h2>{{ view.title }}</h2></div><div class="broadcast-clock"><span>Case time</span><strong>{{ elapsed }}</strong></div></header>
    <p class="broadcast-question">{{ view.question }}</p>
    <div class="broadcast-progress"><span>{{ stageLabel }}</span><strong>{{ found }}/{{ view.clues.length }} clues</strong><div class="broadcast-steps" :aria-label="`Stage ${stageIndex + 1} of 4`"><i v-for="(step, index) in steps" :key="step" :class="{ 'is-complete': index <= stageIndex }"></i></div></div>
    <ul class="broadcast-clues" aria-label="Investigation progress"><li v-for="clue in view.clues" :key="clue.id" :class="{ 'is-found': clue.status !== 'locked' }"><SiteIcon :name="clue.status === 'locked' ? 'search' : clue.status === 'linked' ? 'link' : 'check'" /><span>{{ clue.label }}</span></li></ul>
    <section v-if="view.stage === 'reveal'" :key="`reveal-${view.chosenVerdictId}`" class="broadcast-finding is-reveal" aria-live="polite"><SiteIcon name="check" /><div><span>{{ view.source === 'simulation' ? 'Preview outcome' : 'Verified outcome' }}</span><strong>{{ verdict?.label ?? 'Investigation complete' }}</strong><p v-if="view.revealText">{{ view.revealText }}</p></div></section>
    <section v-else-if="finding" :key="finding.id" class="broadcast-finding" aria-live="polite"><SiteIcon :name="finding.shared ? 'send' : 'document'" /><div><span>{{ finding.shared ? 'Shared finding' : 'Latest finding' }}</span><strong>{{ finding.label }}</strong></div><span class="broadcast-record-count">{{ view.evidence.length }} records</span></section>
    <footer v-if="view.stage !== 'reveal'"><span>{{ view.paused ? 'The investigation will resume with the host.' : 'Investigate with chat' }}</span><code>{{ command }}</code><p v-if="view.currentHint">{{ view.currentHint }}</p></footer>
  </aside>
</template>

<style scoped>
.broadcast-overlay { --broadcast-gap: 24px; box-sizing: border-box; position: fixed; inset: auto auto var(--broadcast-gap) var(--broadcast-gap); width: min(600px, calc((100vw - 2 * var(--broadcast-gap)) / var(--broadcast-scale))); max-height: calc((100vh - 2 * var(--broadcast-gap)) / var(--broadcast-scale)); overflow: hidden; padding: 20px 22px 16px; border: 1px solid #b38c527d; border-radius: 12px; background: #17120fed; color: #f1e1c2; font-family: var(--font-body); box-shadow: 0 14px 40px #0005; transform: scale(var(--broadcast-scale)); transform-origin: left bottom; }
.broadcast-overlay[data-pos=tl] { inset: var(--broadcast-gap) auto auto var(--broadcast-gap); transform-origin: left top; }
.broadcast-overlay[data-pos=tr] { inset: var(--broadcast-gap) var(--broadcast-gap) auto auto; transform-origin: right top; }
.broadcast-overlay[data-pos=br] { inset: auto var(--broadcast-gap) var(--broadcast-gap) auto; transform-origin: right bottom; }
.broadcast-header { display: flex; align-items: start; justify-content: space-between; gap: 24px; }
.broadcast-identity { min-width: 0; }
.broadcast-identity > span { color: #d4ad70; font-size: 11px; font-weight: 600; }
.broadcast-header h2 { margin: 6px 0 0; font: 600 29px/1.05 var(--font-display); text-wrap: balance; }
.broadcast-clock { flex: 0 0 auto; text-align: right; font-variant-numeric: tabular-nums; }
.broadcast-clock > span { display: block; color: #bfa888; font-size: 10px; }
.broadcast-clock strong { display: block; margin-top: 4px; color: #f1cc84; font: 600 31px/1 var(--font-display); }
.broadcast-question { margin: 13px 0 18px; color: #d9c8ab; font-size: 13px; line-height: 1.45; }
.broadcast-progress { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 12px; }
.broadcast-progress > strong { margin-left: auto; color: #d3b17a; font-weight: 500; font-variant-numeric: tabular-nums; }
.broadcast-steps { flex: 0 0 100%; display: flex; gap: 5px; margin-bottom: 14px; }
.broadcast-steps i { flex: 1; height: 3px; border-radius: 2px; background: #56412c; transition: background 400ms; }
.broadcast-steps .is-complete { background: #deb475; }
.broadcast-clues { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 9px 16px; margin: 0; padding: 0; list-style: none; }
.broadcast-clues li { display: flex; align-items: center; gap: 7px; min-width: 0; color: #bea98a; font-size: 12px; line-height: 1.35; }
.broadcast-clues .site-icon { flex: 0 0 14px; color: #ab824e; }
.broadcast-clues .is-found { color: #f0dfbe; }
.broadcast-clues .is-found .site-icon { color: #ddba78; }
.broadcast-finding { display: flex; align-items: center; gap: 12px; margin: 18px -22px 0; padding: 14px 22px; background: #bd8b3b1b; border-block: 1px solid #b58a523d; animation: broadcast-arrive 450ms ease-out both; }
.broadcast-finding > .site-icon { flex: 0 0 22px; color: #e0b978; font-size: 22px; }
.broadcast-finding > div { min-width: 0; }
.broadcast-finding div > span { display: block; margin-bottom: 3px; color: #c1a57b; font-size: 10px; }
.broadcast-finding strong { font: 600 21px/1.15 var(--font-display); }
.broadcast-record-count { flex: 0 0 auto; margin-left: auto; color: #c1a57b; font-size: 10px; }
.broadcast-finding p { margin: 8px 0 0; color: #ddceb4; font-size: 12px; line-height: 1.5; }
.is-reveal { margin-bottom: -16px; border-bottom: 0; }
footer { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-top: 14px; color: #bda788; font-size: 11px; }
footer code { color: #efc987; font-size: 12px; }
footer p { flex: 0 0 100%; margin: 3px 0 0; color: #e4cda5; line-height: 1.5; }
@keyframes broadcast-arrive { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@media (max-width: 620px) { .broadcast-overlay { --broadcast-gap: 12px; padding: 16px; } .broadcast-header h2 { font-size: 24px; } .broadcast-finding { margin-inline: -16px; padding-inline: 16px; } }
@media (prefers-reduced-motion: reduce) { .broadcast-finding { animation: none; } .broadcast-steps i { transition: none; } }
:global(html[data-motion=reduced]) .broadcast-finding { animation: none; }
</style>
