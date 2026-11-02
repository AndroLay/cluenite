<script setup lang="ts">
import { computed, ref } from "vue";

// Every value on this page is sample data. Nothing is read from Twitch or the server, and no control sends a command.
const CLUES = [
  { id: "guest", title: "Guest list" },
  { id: "lock", title: "Study lock" },
  { id: "timeline", title: "Timeline" },
  { id: "note", title: "Handwritten note" },
  { id: "print", title: "Fingerprint" },
] as const;

const SUSPECTS = [
  { id: "gardener", name: "The gardener" },
  { id: "guest", name: "The guest with the pen" },
  { id: "clerk", name: "The night clerk" },
] as const;

const FEED = [
  { who: "Viewer", text: "!look LOCK" },
  { who: "Host", text: "Examining the fingerprint…" },
  { who: "Viewer", text: "!look GUEST" },
  { who: "Viewer", text: "!link PRINT NOTE" },
  { who: "Host", text: "Linked. The handwriting matches a guest on the list." },
] as const;

const HINT = "Compare the handwritten note with the guest list.";

const found = ref<string[]>(["lock", "print", "note"]);
const linked = ref(false);
const hintShown = ref(false);
const verdictId = ref<string | null>(null);

const foundCount = computed(() => found.value.length);
const foundClues = computed(() =>
  CLUES.filter((clue) => found.value.includes(clue.id)),
);
const canLink = computed(() => foundCount.value >= 2 && !linked.value);
const revealed = computed(() => verdictId.value !== null);
const suspectName = computed(
  () => SUSPECTS.find((suspect) => suspect.id === verdictId.value)?.name ?? "",
);

const steps = computed(() => [
  { label: "Open case", done: true },
  { label: "Find clues", done: foundCount.value >= 1 },
  { label: "Discover evidence", done: foundCount.value >= 3 },
  { label: "Link evidence", done: linked.value },
  { label: "Reach verdict", done: revealed.value },
]);
const currentStep = computed(() => steps.value.findIndex((step) => !step.done));

const objectiveChecks = computed(() => [
  { label: "Find at least 3 clues", done: foundCount.value >= 3 },
  { label: "Link the evidence to a suspect", done: linked.value },
  { label: "Submit a verdict", done: revealed.value },
]);

function isFound(id: string): boolean {
  return found.value.includes(id);
}

function discover(id: string): void {
  if (isFound(id)) return;
  found.value = [...found.value, id];
}

function link(): void {
  if (canLink.value) linked.value = true;
}

function chooseVerdict(id: string): void {
  if (linked.value && verdictId.value === null) verdictId.value = id;
}
</script>

<template>
  <article class="qs" aria-labelledby="qs-title">
    <header class="qs-hero">
      <h1 id="qs-title">A Missing Manuscript</h1>
      <p class="qs-premise">
        A rare manuscript vanished from a private study. The room was locked,
        the guest list was short, and someone is lying.
      </p>
      <ul class="qs-chips" aria-label="Round details">
        <li class="qs-chip qs-chip--sample">Sample data</li>
        <li class="qs-chip">Quick Case</li>
        <li class="qs-chip">No Twitch chat</li>
      </ul>
    </header>

    <section class="qs-board-panel" aria-labelledby="qs-board-title">
      <div class="qs-panel-head">
        <h2 id="qs-board-title">Investigation board</h2>
        <span class="qs-tag">Sample board</span>
      </div>
      <div class="qs-board-grid">
        <div class="qs-board" role="group" aria-label="Clues">
          <button
            v-for="clue in CLUES"
            :key="clue.id"
            type="button"
            :class="[
              'qs-clue',
              'qs-clue--' + clue.id,
              { 'is-found': isFound(clue.id) },
            ]"
            :disabled="isFound(clue.id)"
            @click="discover(clue.id)"
          >
            <span class="qs-clue-title">{{ clue.title }}</span>
            <span class="qs-clue-note">{{
              isFound(clue.id)
                ? "Clue on file"
                : "Not found yet. Select to inspect."
            }}</span>
          </button>
        </div>

        <aside class="qs-feed" aria-labelledby="qs-feed-title">
          <div class="qs-panel-head">
            <h2 id="qs-feed-title">Command feed</h2>
            <span class="qs-tag">Sample feed</span>
          </div>
          <p class="qs-feed-note">
            Fictional sample IDs and messages. They are not from Twitch or a
            live case.
          </p>
          <ol class="qs-feed-list">
            <li v-for="(line, index) in FEED" :key="index">
              <span class="qs-who">{{ line.who }}</span>
              <span class="qs-text">{{ line.text }}</span>
            </li>
          </ol>
          <input
            type="text"
            disabled
            aria-label="Command input, disabled in the sample"
            placeholder="Sample only. Not sent to Twitch."
          />
        </aside>
      </div>
    </section>

    <div class="qs-row">
      <section class="qs-card" aria-labelledby="qs-objective-title">
        <h2 id="qs-objective-title">Current objective</h2>
        <p class="qs-objective">
          Identify the culprit and build a case for a verdict.
        </p>
        <ul class="qs-checks">
          <li
            v-for="check in objectiveChecks"
            :key="check.label"
            :class="{ 'is-done': check.done }"
          >
            <span class="qs-box" aria-hidden="true"></span>
            <span>{{ check.label }}</span>
          </li>
        </ul>
      </section>

      <section class="qs-card" aria-labelledby="qs-evidence-title">
        <h2 id="qs-evidence-title">Discovered evidence ({{ foundCount }})</h2>
        <ul v-if="foundCount > 0" class="qs-evidence">
          <li v-for="clue in foundClues" :key="clue.id">{{ clue.title }}</li>
        </ul>
        <p v-else>Nothing found yet.</p>
      </section>

      <section class="qs-card" aria-labelledby="qs-host-title">
        <h2 id="qs-host-title">Host <span class="qs-tag">Sample</span></h2>
        <p>Great find. The fingerprint is new, and it gives us a solid lead.</p>
        <p>
          What should we examine next? Keep the theories coming. We are close to
          the verdict.
        </p>
      </section>
    </div>

    <div class="qs-actions">
      <button
        type="button"
        class="site-button"
        :disabled="!canLink"
        @click="link"
      >
        {{ linked ? "Evidence linked" : "Link evidence" }}
      </button>
      <button
        type="button"
        class="site-button site-button--quiet"
        disabled
        title="Not part of the sample"
      >
        Propose a theory
      </button>
      <button
        type="button"
        class="site-button site-button--quiet"
        :disabled="hintShown"
        @click="hintShown = true"
      >
        Request a hint
      </button>
    </div>
    <p v-if="hintShown" class="qs-hint" role="status">
      Hint, sample: {{ HINT }}
    </p>

    <div class="qs-row qs-row--wide">
      <section class="qs-card" aria-labelledby="qs-progress-title">
        <h2 id="qs-progress-title">Case progress</h2>
        <ol class="qs-steps">
          <li
            v-for="(step, index) in steps"
            :key="step.label"
            :class="{
              'is-done': step.done,
              'is-current': index === currentStep,
            }"
            :aria-current="index === currentStep ? 'step' : undefined"
          >
            <span class="qs-node" aria-hidden="true"></span>
            <span>{{ step.label }}</span>
          </li>
        </ol>
        <h3 class="qs-sub">Case notes</h3>
        <ul class="qs-notes">
          <li>The manuscript case is empty. It was taken recently.</li>
          <li>A clear fingerprint was found on the study desk.</li>
          <li>A note suggests a planned meeting: "Meet at nine. Bring it."</li>
          <li>
            The footprint mud matches the garden path, which most guests did not
            use.
          </li>
        </ul>
      </section>

      <section class="qs-card" aria-labelledby="qs-verdict-title">
        <div class="qs-panel-head">
          <h2 id="qs-verdict-title">Verdict</h2>
          <span class="qs-tag">{{
            linked ? "Open" : "Locked. Link evidence first"
          }}</span>
        </div>
        <p v-if="!revealed">Choose who you think took the manuscript.</p>
        <div class="qs-suspects" role="group" aria-label="Suspects">
          <button
            v-for="suspect in SUSPECTS"
            :key="suspect.id"
            type="button"
            class="site-button site-button--quiet"
            :disabled="!linked || revealed"
            :aria-pressed="verdictId === suspect.id"
            @click="chooseVerdict(suspect.id)"
          >
            {{ suspect.name }}
          </button>
        </div>
        <p v-if="revealed" class="qs-reveal" role="status">
          Sample verdict, not recorded: {{ suspectName }}. Nothing is sent or
          counted.
        </p>
      </section>
    </div>
  </article>
</template>

<style scoped>
.qs {
  display: flex;
  flex-direction: column;
  gap: 28px;
  color: var(--case-paper);
}

.qs h1 {
  margin: 0;
  max-width: 18ch;
  font-family: var(--font-display);
  font-size: clamp(2.25rem, 5vw, 3.75rem);
  font-weight: 600;
  line-height: 1.05;
  color: var(--case-paper);
}

.qs-premise {
  margin: 14px 0 0;
  max-width: 60ch;
  color: var(--case-paper-dim);
}

.qs-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 18px 0 0;
  padding: 0;
  list-style: none;
}

.qs-chip {
  padding: 6px 12px;
  border: 1px solid var(--case-rule-strong);
  border-radius: 999px;
  color: var(--case-paper-dim);
  font-size: 0.8125rem;
}

.qs-chip--sample {
  border-color: var(--case-gold);
  color: var(--case-gold);
}

.qs-panel-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.qs-panel-head h2,
.qs-card h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--case-paper);
}

.qs-tag {
  padding: 3px 10px;
  border: 1px solid var(--case-gold);
  border-radius: 999px;
  color: var(--case-gold);
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.qs-board-panel {
  padding: 18px;
  border: 1px solid var(--case-rule-strong);
  border-radius: 4px;
  background: var(--case-panel);
}

.qs-board-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 16px;
}

.qs-board {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-areas:
    "guest lock timeline"
    "note print print";
  gap: 14px;
  min-height: 360px;
  padding: 18px;
  border: 1px solid var(--case-rule);
  border-radius: 4px;
  background: var(--case-raised);
}

.qs-clue {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 12px;
  min-height: 110px;
  padding: 14px 16px;
  border: 1px dashed var(--case-rule-strong);
  border-radius: 3px;
  background: transparent;
  color: var(--case-paper-dim);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.qs-clue:disabled {
  cursor: default;
}

.qs-clue:focus-visible {
  outline: 2px solid var(--case-gold);
  outline-offset: 3px;
}

.qs-clue.is-found {
  border: 1px solid #c9b48a;
  background: #e9dcc0;
  color: #2a1d12;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
}

.qs-clue-title {
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 600;
}

.qs-clue-note {
  font-size: 0.8125rem;
}

.qs-clue--guest {
  grid-area: guest;
}

.qs-clue--lock {
  grid-area: lock;
}

.qs-clue--timeline {
  grid-area: timeline;
}

.qs-clue--note {
  grid-area: note;
}

.qs-clue--print {
  grid-area: print;
}

.qs-clue--print.is-found {
  border-color: var(--case-gold);
  background: #f1e2b8;
}

.qs-feed {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--case-rule);
  border-radius: 4px;
  background: var(--case-raised);
}

.qs-feed-note {
  margin: 0;
  color: var(--case-paper-dim);
  font-size: 0.8125rem;
}

.qs-feed-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.qs-feed-list li {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  align-items: baseline;
  gap: 10px;
  color: var(--case-paper-dim);
  font-size: 0.8125rem;
}

.qs-who {
  color: var(--case-gold);
}

.qs-feed input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--case-rule-strong);
  border-radius: 4px;
  background: var(--case-panel);
  color: var(--case-paper-dim);
  font: inherit;
  font-size: 0.875rem;
}

.qs-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.qs-row--wide {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr);
}

.qs-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: 18px 20px;
  border: 1px solid var(--case-rule-strong);
  border-radius: 4px;
  background: var(--case-panel);
}

.qs-card p {
  margin: 0;
  color: var(--case-paper-dim);
  font-size: 0.9375rem;
}

.qs-card .qs-objective {
  color: var(--case-paper);
  font-weight: 600;
}

.qs-card .qs-reveal {
  color: var(--case-gold);
}

.qs-checks {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
  color: var(--case-paper-dim);
  font-size: 0.9375rem;
}

.qs-checks li {
  display: flex;
  align-items: center;
  gap: 10px;
}

.qs-box {
  position: relative;
  flex: none;
  width: 16px;
  height: 16px;
  border: 1px solid var(--case-rule-strong);
  border-radius: 2px;
}

.qs-checks li.is-done {
  color: var(--case-paper);
}

.qs-checks li.is-done .qs-box {
  border-color: var(--case-gold);
  background: rgba(230, 176, 82, 0.12);
}

.qs-checks li.is-done .qs-box::after {
  content: "";
  position: absolute;
  left: 4px;
  top: 0;
  width: 5px;
  height: 9px;
  border: solid var(--case-gold);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.qs-evidence {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.qs-evidence li {
  padding: 6px 10px;
  border-radius: 3px;
  background: #e9dcc0;
  color: #2a1d12;
  font-size: 0.8125rem;
  font-weight: 600;
}

.qs-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
}

.qs-hint {
  margin: 0;
  color: var(--case-gold);
  text-align: center;
}

.qs-steps {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  color: var(--case-paper-dim);
  font-size: 0.8125rem;
  text-align: center;
}

.qs-steps li {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.qs-steps li.is-done {
  color: var(--case-paper);
}

.qs-node {
  width: 14px;
  height: 14px;
  border: 1px solid var(--case-rule-strong);
  border-radius: 50%;
  background: var(--case-raised);
}

.qs-steps li.is-done .qs-node {
  border-color: var(--case-gold);
  background: var(--case-gold);
}

.qs-steps li.is-current .qs-node {
  border-color: var(--case-gold);
}

.qs-sub {
  margin: 4px 0 0;
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 600;
  color: var(--case-paper);
}

.qs-notes {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding-left: 18px;
  color: var(--case-paper-dim);
  font-size: 0.9375rem;
}

.qs-suspects {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.qs-suspects .site-button {
  min-width: 0;
  justify-content: center;
}

.qs-suspects .site-button[aria-pressed="true"] {
  border-color: var(--case-gold);
  color: var(--case-gold);
}

.qs button:focus-visible {
  outline: 2px solid var(--case-gold);
  outline-offset: 3px;
}

@media (max-width: 900px) {
  .qs-board-grid,
  .qs-row,
  .qs-row--wide {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 760px) {
  .qs-board {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: none;
    min-height: 0;
  }

  .qs-clue {
    grid-area: auto;
  }

  .qs-suspects {
    grid-template-columns: minmax(0, 1fr);
  }

  .qs-steps {
    gap: 4px;
    font-size: 0.6875rem;
  }
}

/*
 * Motion. Runs only under html[data-motion="full"]; "reduced" keeps the static states.
 * Entrances use backwards fill so a finished animation never overrides hover transforms or the static rings.
 */
@keyframes qs-stamp {
  from {
    opacity: 0.4;
    transform: scale(0.97);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}


@keyframes qs-rise {
  from {
    opacity: 0;
    translate: 0 10px;
  }
  to {
    opacity: 1;
    translate: 0 0;
  }
}

@keyframes qs-pop {
  from {
    opacity: 0;
    transform: scale(0.85);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes qs-tick {
  from {
    opacity: 0;
    transform: rotate(45deg) scale(0.2);
  }
  to {
    opacity: 1;
    transform: rotate(45deg) scale(1);
  }
}

html[data-motion="full"] .qs-clue {
  transition:
    background-color var(--dur-state) ease,
    border-color var(--dur-state) ease,
    color var(--dur-state) ease,
    box-shadow var(--dur-state) ease,
    transform var(--dur-state) var(--ease-out-expo);
}

html[data-motion="full"] .qs-clue:not(:disabled):hover {
  transform: translateY(-2px);
}

html[data-motion="full"] .qs-clue.is-found {
  animation: qs-stamp 420ms var(--ease-out-expo) backwards;
}

html[data-motion="full"] .qs-clue--print.is-found {
  animation: qs-stamp 420ms var(--ease-out-expo) backwards;
}

html[data-motion="full"] .qs-chip {
  animation: qs-pop 320ms var(--ease-out-expo) backwards;
}

html[data-motion="full"] .qs-feed-list li {
  animation: qs-rise 480ms var(--ease-out-expo) backwards;
}

html[data-motion="full"] .qs-feed-list li:nth-child(2) {
  animation-delay: 80ms;
}

html[data-motion="full"] .qs-feed-list li:nth-child(3) {
  animation-delay: 160ms;
}

html[data-motion="full"] .qs-feed-list li:nth-child(4) {
  animation-delay: 240ms;
}

html[data-motion="full"] .qs-feed-list li:nth-child(n + 5) {
  animation-delay: 320ms;
}

html[data-motion="full"] .qs-checks li {
  transition: color var(--dur-state) ease;
}

html[data-motion="full"] .qs-checks .qs-box {
  transition:
    background-color var(--dur-state) ease,
    border-color var(--dur-state) ease;
}

html[data-motion="full"] .qs-checks li.is-done .qs-box::after {
  animation: qs-tick 320ms var(--ease-out-expo) backwards;
}

html[data-motion="full"] .qs-evidence li {
  animation: qs-pop 320ms var(--ease-out-expo) backwards;
}

html[data-motion="full"] .qs-steps li {
  animation: qs-rise 480ms var(--ease-out-expo) backwards;
}

html[data-motion="full"] .qs-steps li:nth-child(2) {
  animation-delay: 70ms;
}

html[data-motion="full"] .qs-steps li:nth-child(3) {
  animation-delay: 140ms;
}

html[data-motion="full"] .qs-steps li:nth-child(4) {
  animation-delay: 210ms;
}

html[data-motion="full"] .qs-steps li:nth-child(5) {
  animation-delay: 280ms;
}

html[data-motion="full"] .qs-node {
  transition:
    background-color var(--dur-state) ease,
    border-color var(--dur-state) ease,
    box-shadow var(--dur-state) ease;
}

html[data-motion="full"] .qs-hint {
  animation: qs-rise 420ms var(--ease-out-expo) backwards;
}

html[data-motion="full"] .qs-card .qs-reveal {
  animation: qs-rise 620ms var(--ease-out-expo) backwards;
}
</style>
