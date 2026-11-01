<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { buildEvidenceLinkTimeline, buildRevealTimeline } from "@cluenite/graphics";
import { prefersReducedMotion } from "@cluenite/ui";
import {
  formatElapsed,
  timerMsAt,
  type QuickCaseView,
  type QuickClue,
  type QuickStage,
} from "../quickCase/viewModel";
import CaseScene from "./CaseScene.vue";

const props = withDefaults(defineProps<{ view: QuickCaseView; muted: boolean; obs?: boolean }>(), {
  obs: false,
});

const emit = defineEmits<{
  inspect: [clueId: string];
  link: [clueA: string, clueB: string];
  verdict: [verdictId: string];
  "toggle-mute": [];
}>();

const STAGES: readonly QuickStage[] = ["observe", "connect", "challenge", "reveal"];
const STAGE_LABEL: Record<QuickStage, string> = {
  observe: "Observe",
  connect: "Connect",
  challenge: "Challenge",
  reveal: "Reveal",
};
const STAGE_HINT: Record<QuickStage, string> = {
  observe: "Inspect a sealed clue to open it as evidence.",
  connect: "Pick two opened clues, then press Link selected.",
  challenge: "Choose a verdict to close the case.",
  reveal: "Recap below.",
};
// Line icons for the stage track, drawn in a 16×16 box. Stroke only, so they take the text color.
const STAGE_ICON: Record<QuickStage, string> = {
  observe: "M7 2.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Zm3.3 7.8 3 3",
  connect: "M2.7 4.5a1.8 1.8 0 1 0 3.6 0 1.8 1.8 0 1 0-3.6 0Zm7 7a1.8 1.8 0 1 0 3.6 0 1.8 1.8 0 1 0-3.6 0ZM6 5.6l4 4.8",
  challenge: "M8 2.2 13.8 8 8 13.8 2.2 8Zm0 3.4v3.2m-1.6-1.6h3.2",
  reveal: "M1.6 8S3.9 3.7 8 3.7 14.4 8 14.4 8 12.1 12.3 8 12.3 1.6 8 1.6 8Zm4.7 0a1.7 1.7 0 1 0 3.4 0 1.7 1.7 0 1 0-3.4 0Z",
};
const CLUE_STATE_TEXT = { locked: "Inspect", unlocked: "Unlocked", linked: "Linked" } as const;

const linkedCount = computed(() => props.view.clues.filter((clue) => clue.status === "linked").length);
const linkable = computed(
  () =>
    props.view.stage === "connect" &&
    !props.view.paused &&
    props.view.clues.filter((clue) => clue.status === "unlocked").length >= 2,
);
const verdictable = computed(() => props.view.stage === "challenge" && !props.view.paused);
// Clues the viewer picked for a link. The server checks the link; this is only a selection.
const selected = ref<string[]>([]);
const canLink = computed(() => linkable.value && selected.value.length === 2);
const inspectedCount = computed(() => props.view.clues.filter((clue) => clue.status !== "locked").length);
// Names the linked pair in text, so the result does not rely on the connector alone.
const linkSummary = computed(() => {
  const pair = props.view.clues.filter((clue) => clue.status === "linked").map((clue) => clue.id);
  return pair.length >= 2 ? `✓ Linked: ${pair.join(" ↔ ")}` : "No link recorded yet.";
});
// Says why verdicts are off, instead of only dimming the buttons.
const verdictNote = computed(() => {
  if (verdictable.value || props.view.paused || props.view.stage === "reveal") return null;
  return "Verdicts open after two clues are linked.";
});

function isInspectable(clue: QuickClue): boolean {
  return clue.status === "locked" && props.view.stage !== "reveal" && !props.view.paused;
}
function isSelectable(clue: QuickClue): boolean {
  return clue.status === "unlocked" && linkable.value;
}
// The picked verdict is named only at reveal. Earlier picks never show on the board.
const chosenVerdict = computed(() => {
  if (props.view.stage !== "reveal" || props.view.chosenVerdictId === null) return null;
  return props.view.verdicts.find((verdict) => verdict.id === props.view.chosenVerdictId) ?? null;
});
// Preview data is not server-verified, so the stamp must not claim a real solve.
const stampLabel = computed(() => {
  const base = props.view.source === "simulation" ? "◇ Simulated verdict" : "✓ Solved";
  return chosenVerdict.value ? `${base}: ${chosenVerdict.value.label}` : base;
});

const cardEls = new Map<string, HTMLElement>();
const connectorEl = ref<SVGPathElement | null>(null);
const statusEl = ref<HTMLElement | null>(null);
const panelEl = ref<HTMLElement | null>(null);
const revealTitleEl = ref<HTMLElement | null>(null);

// Draw the connector between the centers of the two linked cards, not a fixed span.
// The SVG viewBox is matched to its rendered width so path units equal CSS pixels.
function fitConnector(cards: readonly HTMLElement[]): void {
  const path = connectorEl.value;
  const svg = path?.ownerSVGElement;
  if (!path || !svg) return;
  const box = svg.getBoundingClientRect();
  const xs = cards.map((el) => {
    const r = el.getBoundingClientRect();
    return r.left + r.width / 2 - box.left;
  });
  const x1 = Math.min(...xs);
  const x2 = Math.max(...xs);
  svg.setAttribute("viewBox", `0 0 ${box.width} 40`);
  path.setAttribute("d", `M ${x1} 4 C ${x1} 40, ${x2} 40, ${x2} 4`);
}
const revealBodyEl = ref<HTMLElement | null>(null);
const stampEl = ref<HTMLElement | null>(null);

// Both builders return a paused GSAP timeline; derive the type without a global gsap namespace.
type Timeline = ReturnType<typeof buildEvidenceLinkTimeline>;

let linkTimeline: Timeline | null = null;
let revealTimeline: Timeline | null = null;

function setCardRef(id: string, el: unknown): void {
  if (el instanceof HTMLElement) cardEls.set(id, el);
  else cardEls.delete(id);
}

function killTimelines(): void {
  linkTimeline?.kill();
  revealTimeline?.kill();
  linkTimeline = null;
  revealTimeline = null;
}

// Animations follow server state, not clicks. A rejected command therefore never plays
// a link or reveal that did not happen. A reset to "observe" also drops stale tweens.
watch(
  () => props.view.stage,
  (stage) => {
    selected.value = [];
    if (stage === "observe") killTimelines();
    if (stage === "reveal") void playReveal();
  },
);

watch(linkedCount, (count, previous) => {
  if (count >= 2 && previous < 2) void playLink();
});

function onCardClick(clue: QuickClue): void {
  if (isInspectable(clue)) {
    emit("inspect", clue.id);
    return;
  }
  if (isSelectable(clue)) toggleSelected(clue.id);
}

function toggleSelected(clueId: string): void {
  const index = selected.value.indexOf(clueId);
  if (index >= 0) selected.value.splice(index, 1);
  else if (selected.value.length < 2) selected.value.push(clueId);
}

function onLinkSelected(): void {
  const [first, second] = selected.value;
  if (!canLink.value || first === undefined || second === undefined) return;
  // Selection is kept on emit, so a rejected link can be retried. A successful link
  // changes the stage, and the stage watcher clears the selection.
  emit("link", first, second);
}

function onVerdict(verdictId: string): void {
  if (!verdictable.value) return;
  emit("verdict", verdictId);
}

async function playLink(): Promise<void> {
  // Wait for Vue to apply the "linked" statuses so the connector and cards exist.
  await nextTick();
  const cards = props.view.clues
    .filter((clue) => clue.status === "linked")
    .map((clue) => cardEls.get(clue.id))
    .filter((el): el is HTMLElement => el !== undefined);
  if (!connectorEl.value || !statusEl.value || cards.length < 2) return;
  fitConnector(cards);
  linkTimeline?.kill();
  linkTimeline = buildEvidenceLinkTimeline(
    { connector: connectorEl.value, cards, status: statusEl.value },
    prefersReducedMotion(),
  );
  linkTimeline.play();
}

async function playReveal(): Promise<void> {
  // The reveal panel is hidden until the stage changes, so wait for the DOM first.
  await nextTick();
  if (!panelEl.value || !revealTitleEl.value || !revealBodyEl.value || !stampEl.value) return;
  revealTimeline?.kill();
  revealTimeline = buildRevealTimeline(
    {
      panel: panelEl.value,
      lines: [revealTitleEl.value, revealBodyEl.value],
      stamp: stampEl.value,
    },
    prefersReducedMotion(),
  );
  revealTimeline.play();
}

// Skipping must leave the final state correct, so jump the timeline to its end.
function skipReveal(): void {
  revealTimeline?.progress(1);
}

// Informative timer: shown, never enforced. The server stops it when paused or solved, and
// this page only adds local time while the last snapshot says it is running.
const now = ref(Date.now());
let tickHandle: ReturnType<typeof setInterval> | null = null;

function stopTicking(): void {
  if (tickHandle !== null) clearInterval(tickHandle);
  tickHandle = null;
}

watch(
  () => props.view.timer,
  (timer) => {
    stopTicking();
    now.value = Date.now();
    if (timer.running) {
      tickHandle = setInterval(() => {
        now.value = Date.now();
      }, 1000);
    }
  },
  { immediate: true },
);

const elapsedLabel = computed(() => formatElapsed(timerMsAt(props.view.timer, now.value)));

onBeforeUnmount(() => {
  stopTicking();
  killTimelines();
});
</script>

<template>
  <section class="qc" :class="{ 'is-obs': props.obs }" aria-labelledby="qc-title">
    <header class="qc-header">
      <div class="qc-heading">
        <h2 id="qc-title">{{ view.title }}</h2>
        <span v-if="view.source === 'simulation'" class="qc-badge">Simulation · no Twitch chat</span>
      </div>
      <div class="qc-status">
        <span class="qc-stage" :data-stage="view.stage">{{ STAGE_LABEL[view.stage] }}</span>
        <span class="qc-timer" :data-running="view.timer.running">Time {{ elapsedLabel }}</span>
        <button v-if="!props.obs" type="button" class="qc-button" @click="emit('toggle-mute')">
          {{ muted ? "Unmute sound" : "Mute sound" }}
        </button>
      </div>
    </header>

    <CaseScene :stage="view.stage" :obs="props.obs ?? false" />

    <ol class="qc-steps" aria-label="Case progress">
      <li
        v-for="step in STAGES"
        :key="step"
        :aria-current="step === view.stage ? 'step' : undefined"
        :data-done="STAGES.indexOf(step) < STAGES.indexOf(view.stage) ? 'true' : undefined"
      >
        <svg class="qc-icon" viewBox="0 0 16 16" aria-hidden="true">
          <path :d="STAGE_ICON[step]" />
        </svg>
        <span>{{ STAGE_LABEL[step] }}</span>
      </li>
    </ol>

    <div class="qc-brief">
      <p class="qc-premise">{{ view.premise }}</p>
      <p class="qc-question">{{ view.question }}</p>
    </div>

    <div class="qc-next">
      <p class="qc-hint" aria-live="polite">{{ STAGE_HINT[view.stage] }}</p>
      <dl class="qc-ledger" aria-label="Case counts">
        <div>
          <dt>Inspected</dt>
          <dd>{{ inspectedCount }}/{{ view.clues.length }}</dd>
        </div>
        <div>
          <dt>Linked</dt>
          <dd>{{ linkedCount }}/2</dd>
        </div>
        <div>
          <dt>Selected</dt>
          <dd>{{ selected.length }}/2</dd>
        </div>
      </dl>
    </div>

    <ul class="qc-clues" aria-label="Clues">
      <li v-for="clue in view.clues" :key="clue.id">
        <button
          type="button"
          class="qc-clue"
          :data-status="clue.status"
          :disabled="!isInspectable(clue) && !isSelectable(clue)"
          :aria-pressed="isSelectable(clue) ? selected.includes(clue.id) : undefined"
          :ref="(el) => setCardRef(clue.id, el)"
          @click="onCardClick(clue)"
        >
          <span class="qc-clue-top">
            <span class="qc-clue-id">{{ clue.id }}</span>
            <span class="qc-clue-state">{{ selected.includes(clue.id) && clue.status === 'unlocked' ? 'Selected' : (clue.status === 'locked' && !isInspectable(clue) ? 'Sealed' : CLUE_STATE_TEXT[clue.status]) }}</span>
          </span>
          <span class="qc-clue-label">{{ clue.label }}</span>
          <span class="qc-clue-body">{{ clue.observation ?? clue.teaser }}</span>
        </button>
      </li>
    </ul>

    <div class="qc-link">
      <svg
        class="qc-connector"
        :class="{ 'is-linked': linkedCount >= 2 }"
        viewBox="0 0 600 40"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path ref="connectorEl" d="M 100 4 C 160 40, 440 40, 500 4" />
      </svg>
      <div class="qc-link-row">
        <p ref="statusEl" class="qc-linked" :class="{ 'is-pending': linkedCount < 2 }">{{ linkSummary }}</p>
        <button v-if="view.stage !== 'reveal'" type="button" class="qc-action" :disabled="!canLink" @click="onLinkSelected">
          Link selected ({{ selected.length }}/2)
        </button>
      </div>
    </div>

    <div class="qc-verdicts">
      <button
        v-for="verdict in view.verdicts"
        :key="verdict.id"
        type="button"
        class="qc-verdict"
        :class="{ 'is-chosen': chosenVerdict?.id === verdict.id }"
        :disabled="!verdictable"
        @click="onVerdict(verdict.id)"
      >
        {{ verdict.label }}
      </button>
    </div>

    <p v-if="verdictNote" class="qc-verdict-note">{{ verdictNote }}</p>

    <p v-if="view.paused" class="qc-notice" role="status">Paused by the host. Actions are on hold.</p>

    <section ref="panelEl" class="qc-reveal" :hidden="view.stage !== 'reveal'" aria-label="Reveal">
      <p ref="revealTitleEl" class="qc-reveal-title">Reveal</p>
      <p ref="revealBodyEl" class="qc-reveal-body">{{ view.revealText }}</p>
      <div class="qc-reveal-footer">
        <span ref="stampEl" class="qc-stamp">{{ stampLabel }}</span>
        <button v-if="!props.obs" type="button" class="qc-button" @click="skipReveal">Skip</button>
      </div>
    </section>
  </section>
</template>

<style scoped>
/* Case board: a dark ink panel in a gold frame. Sealed clues are dark cards with a dashed
   edge, opened clues are paper slips, and linked clues are pinned to the board with teal thread. */
.qc {
  box-sizing: border-box;
  position: relative;
  width: 100%;
  display: grid;
  gap: 20px;
  padding: 26px 22px 22px;
  border: 1px solid var(--case-gold);
  border-radius: 4px;
  background:
    radial-gradient(560px 240px at 50% -4%, rgba(245, 190, 112, 0.12), transparent 70%),
    var(--case-panel);
  box-shadow:
    inset 0 0 96px rgba(0, 0, 0, 0.5),
    0 30px 60px -34px rgba(0, 0, 0, 0.9);
  color: var(--case-paper);
  font-family: var(--font-body);
  text-align: left;
}

/* Inner hairline inside the gold frame. Decorative only, so it ignores pointer events. */
.qc::before {
  content: "";
  position: absolute;
  inset: 6px;
  border: 1px solid rgba(245, 190, 112, 0.28);
  border-radius: 2px;
  pointer-events: none;
}

/* OBS: the browser source is transparent, so the board keeps a solid dark backing. */
.qc.is-obs {
  gap: 14px;
  padding: 16px;
  border: 0;
  border-radius: 0;
  background: rgba(16, 28, 42, 0.9);
  box-shadow: none;
}
.qc.is-obs::before {
  display: none;
}

.qc-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px 16px;
}

.qc-heading {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.qc h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(1.5rem, 4vw, 1.9rem);
  font-weight: 600;
  line-height: 1.05;
  letter-spacing: -0.02em;
  text-wrap: balance;
}

/* Rubber stamp: double rule, tilted 2 degrees. Used only for the simulation notice. */
.qc-badge {
  justify-self: start;
  padding: 3px 9px;
  border: 3px double rgba(245, 190, 112, 0.6);
  color: var(--case-amber);
  font-family: var(--font-body);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  rotate: -2deg;
}

.qc-status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

/* Label tab: the current stage sits on the top gold frame line, like a tab on a folder. */
.qc-stage {
  position: absolute;
  top: -11px;
  left: 22px;
  padding: 3px 10px;
  border: 1px solid var(--case-gold);
  border-radius: 2px;
  background: var(--case-panel);
  color: var(--case-amber);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  white-space: nowrap;
}
.qc.is-obs .qc-stage {
  position: static;
  top: auto;
  left: auto;
}

.qc-timer {
  color: var(--case-paper-dim);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
}
.qc-timer[data-running="true"] {
  color: var(--case-confirm);
}

/* Stage track: four ruled segments. Done is thread, current is amber, upcoming is dim. */
.qc-steps {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.qc-steps li {
  position: relative;
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  padding-top: 13px;
  color: var(--case-paper-dim);
  font-family: var(--font-body);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.qc-icon {
  flex: none;
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.qc-steps li::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 4px;
  height: 3px;
  background: var(--case-rule-strong);
}

.qc-steps li[data-done="true"]::after {
  background: var(--case-thread);
}

.qc-steps li[data-done="true"] {
  color: var(--case-thread);
}

.qc-steps li[aria-current="step"] {
  color: var(--case-paper);
}

.qc-steps li[aria-current="step"]::after {
  background: var(--case-amber);
}

.qc-brief {
  display: grid;
  gap: 8px;
}

.qc-premise {
  margin: 0;
  max-width: 62ch;
  color: var(--case-paper-dim);
  font-size: 0.9375rem;
  line-height: 1.6;
  text-wrap: pretty;
}

/* The question is underlined in teal thread, like a line marked on a case file. */
.qc-question {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(1.25rem, 3.6vw, 1.5rem);
  font-weight: 500;
  line-height: 1.25;
  color: var(--case-paper);
  text-wrap: balance;
  text-decoration: underline;
  text-decoration-color: var(--case-thread);
  text-decoration-thickness: 2px;
  text-underline-offset: 0.28em;
}

/* Next step: ruled band, not a box, so it does not nest inside the folder. */
.qc-next {
  display: grid;
  gap: 12px;
  padding: 14px 0;
  border-top: 1px solid var(--case-rule-strong);
  border-bottom: 1px solid var(--case-rule-strong);
}

.qc-hint {
  margin: 0;
  color: var(--case-paper);
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.45;
  text-wrap: pretty;
}

.qc-ledger {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 20px;
  margin: 0;
  font-family: var(--font-body);
  font-size: 0.75rem;
}

.qc-ledger > div {
  display: flex;
  gap: 8px;
}

.qc-ledger dt {
  color: var(--case-paper-dim);
}

.qc-ledger dd {
  margin: 0;
  color: var(--case-amber);
  font-variant-numeric: tabular-nums;
}

/* Clue board: three columns, one column below 480px. */
.qc-clues {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.qc-clues > li {
  display: flex;
  min-width: 0;
}

.qc-clue {
  appearance: none;
  position: relative;
  display: grid;
  align-content: start;
  gap: 8px;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 136px;
  margin: 0;
  padding: 14px 12px 12px;
  border: 1px solid var(--case-rule-strong);
  border-radius: var(--radius-slip);
  background: var(--case-bg);
  color: var(--case-paper);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    transform var(--dur-state) var(--ease-out-expo),
    background-color var(--dur-state) ease,
    border-color var(--dur-state) ease,
    box-shadow var(--dur-state) ease;
}

/* Sealed: a dark card with a dashed edge. */
.qc-clue[data-status="locked"] {
  border-style: dashed;
  border-color: var(--case-rule-strong);
  background: var(--case-bg);
}
.qc-clue[data-status="locked"] .qc-clue-body {
  color: var(--case-paper-dim);
}
.qc-clue[data-status="locked"]:not(:disabled):hover {
  border-color: var(--case-paper-dim);
  transform: translateY(-2px);
}

/* Inspected: a paper slip. Picked for a link: an inner amber ring. */
/* A sealed clue opens once: it slides up from the folder and flashes gold, then settles.
   "backwards" fill means no end transform is held, so the hover lift still works afterwards. */
@keyframes clue-open {
  from {
    opacity: 0.35;
    transform: translateY(8px) rotate(-1.2deg);
    box-shadow: 0 0 0 1px rgba(245, 190, 112, 0.8);
  }
  55% {
    box-shadow:
      0 0 0 2px rgba(245, 190, 112, 0.55),
      0 0 24px rgba(245, 190, 112, 0.28);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.qc-clue[data-status="unlocked"] {
  animation: clue-open 520ms var(--ease-out-expo) backwards;
  border-color: #cdc6b3;
  background: var(--case-slip);
  color: var(--case-slip-ink);
  box-shadow: 0 14px 20px -16px rgba(0, 0, 0, 0.9);
}
.qc-clue[data-status="unlocked"] .qc-clue-body {
  color: #2a3a4a;
}
.qc-clue[data-status="unlocked"] .qc-clue-id {
  color: #1d6656;
}
.qc-clue[data-status="unlocked"] .qc-clue-state {
  color: #1d6656;
  border-color: #1d6656;
}
.qc-clue[data-status="unlocked"]:not(:disabled):hover {
  transform: translateY(-2px);
}
.qc-clue[aria-pressed="true"] {
  box-shadow:
    inset 0 0 0 2px var(--case-amber),
    0 14px 20px -16px rgba(0, 0, 0, 0.9);
}

/* Linked: a slip pinned to the board with the thread color. */
.qc-clue[data-status="linked"] {
  border-color: var(--case-thread);
  background: var(--case-slip);
  color: var(--case-slip-ink);
  box-shadow: 0 14px 20px -16px rgba(0, 0, 0, 0.9);
}
.qc-clue[data-status="linked"] .qc-clue-body {
  color: #2a3a4a;
}
.qc-clue[data-status="linked"] .qc-clue-id {
  color: var(--case-stamp);
}
.qc-clue[data-status="linked"] .qc-clue-state {
  color: var(--case-stamp);
  border-color: var(--case-stamp);
}
.qc-clue[data-status="linked"]::before {
  content: "";
  position: absolute;
  top: -6px;
  left: 50%;
  width: 11px;
  height: 11px;
  margin-left: -5.5px;
  border-radius: 50%;
  background: var(--case-thread);
  box-shadow: 0 2px 3px rgba(0, 0, 0, 0.6);
}

/* Paper cards get a deeper bottom edge, like an instant print pinned to the board. */
.qc-clue[data-status="unlocked"],
.qc-clue[data-status="linked"] {
  padding-bottom: 20px;
}

.qc-clue:disabled {
  cursor: default;
}

.qc-clue-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.qc-clue-id {
  color: var(--case-paper-dim);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.12em;
}

.qc-clue-state {
  padding: 2px 6px;
  border: 1px solid var(--case-amber);
  border-radius: 2px;
  color: var(--case-amber);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
}

.qc-clue-label {
  font-family: var(--font-display);
  font-size: 1.0625rem;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.01em;
  text-wrap: balance;
}

.qc-clue-body {
  font-size: 0.8125rem;
  line-height: 1.5;
  text-wrap: pretty;
}

/* Link area: a thread between the pair, the pair named in text, and the link button. */
.qc-link {
  display: grid;
  gap: 6px;
}

.qc-connector {
  display: block;
  width: 100%;
  height: 36px;
  overflow: visible;
}
.qc-connector path {
  fill: none;
  stroke: var(--case-rule-strong);
  stroke-width: 1.5px;
  stroke-dasharray: 5 6;
  vector-effect: non-scaling-stroke;
}
.qc-connector.is-linked path {
  stroke: var(--case-thread);
  stroke-width: 2px;
  stroke-dasharray: none;
}

.qc-link-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 14px;
}

.qc-linked {
  margin: 0;
  color: var(--case-thread);
  font-family: var(--font-body);
  font-size: 0.8125rem;
  letter-spacing: 0.02em;
}
.qc-linked.is-pending {
  color: var(--case-paper-dim);
}

/* Shared control look: raised chip, amber focus ring. */
.qc-action,
.qc-button {
  appearance: none;
  padding: 9px 14px;
  border: 1px solid var(--case-rule-strong);
  border-radius: var(--radius-slip);
  background: var(--case-raised);
  color: var(--case-paper);
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    border-color var(--dur-state) ease,
    background-color var(--dur-state) ease;
}
.qc-action:hover:not(:disabled),
.qc-button:hover {
  border-color: var(--case-paper-dim);
  background: color-mix(in srgb, var(--case-raised) 85%, var(--case-paper));
}
.qc-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
/* Primary call to action: solid gold when it can be used. Placed after the shared hover rule so it wins. */
.qc-action:not(:disabled) {
  border-color: var(--case-amber);
  background: var(--case-amber);
  color: var(--case-slip-ink);
  font-weight: 700;
}
.qc-action:not(:disabled):hover {
  border-color: color-mix(in srgb, var(--case-amber) 88%, var(--case-paper));
  background: color-mix(in srgb, var(--case-amber) 88%, var(--case-paper));
}

.qc-clue:focus-visible,
.qc-action:focus-visible,
.qc-verdict:focus-visible,
.qc-button:focus-visible {
  outline: 2px solid var(--case-amber);
  outline-offset: 3px;
}

/* Verdicts: amber outlines that fill on hover. Disabled ones turn dashed and dim. */
.qc-verdicts {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid var(--case-rule);
}

.qc-verdict {
  appearance: none;
  flex: 1 1 180px;
  padding: 12px 16px;
  border: 1px solid var(--case-amber);
  border-radius: var(--radius-slip);
  background: transparent;
  color: var(--case-amber);
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  cursor: pointer;
  transition:
    background-color var(--dur-state) ease,
    color var(--dur-state) ease;
}
.qc-verdict:hover:not(:disabled) {
  background: var(--case-amber);
  color: var(--case-slip-ink);
}
.qc-verdict:disabled {
  border-style: dashed;
  border-color: var(--case-rule-strong);
  color: var(--case-paper-dim);
  cursor: not-allowed;
}
/* The verdict the viewer picked stays filled at reveal. The others keep the dashed, dim style. */
.qc-verdict.is-chosen:disabled {
  border-style: solid;
  border-color: var(--case-amber);
  background: var(--case-amber);
  color: var(--case-slip-ink);
  cursor: default;
}

.qc-verdict-note {
  margin: 0;
  color: var(--case-paper-dim);
  font-size: 0.8125rem;
  line-height: 1.5;
}

.qc-notice {
  margin: 0;
  padding: 10px 14px;
  border: 1px solid rgba(240, 132, 126, 0.55);
  border-radius: var(--radius-slip);
  background: rgba(240, 132, 126, 0.08);
  color: var(--case-alert);
  font-size: 0.8125rem;
  font-weight: 600;
}

/* Reveal: a paper dossier page laid over the board. */
.qc-reveal {
  display: grid;
  gap: 12px;
  padding: 22px 22px 18px;
  border-radius: var(--radius-slip);
  background: var(--case-slip);
  color: var(--case-slip-ink);
  box-shadow: 0 22px 34px -22px rgba(0, 0, 0, 0.9);
}
.qc-reveal[hidden] {
  display: none;
}

.qc-reveal-title {
  margin: 0;
  color: var(--case-slip-ink);
  font-family: var(--font-display);
  font-size: 1.375rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.qc-reveal-body {
  margin: 0;
  max-width: 62ch;
  color: #2a3a4a;
  font-size: 0.9375rem;
  line-height: 1.65;
  text-wrap: pretty;
}

.qc-reveal-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid rgba(20, 32, 46, 0.18);
}

.qc-reveal .qc-button {
  background: transparent;
  border-color: rgba(20, 32, 46, 0.35);
  color: var(--case-slip-ink);
}
.qc-reveal .qc-button:hover {
  background: rgba(20, 32, 46, 0.08);
  border-color: var(--case-slip-ink);
}

/* Verdict stamp. Rotation is set with the individual `rotate` property so GSAP's transform can run. */
.qc-stamp {
  display: inline-block;
  padding: 4px 10px;
  border: 2px double var(--case-stamp);
  border-radius: 2px;
  color: var(--case-stamp);
  font-family: var(--font-body);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  rotate: -2deg;
}

@media (max-width: 480px) {
  .qc {
    gap: 16px;
    padding: 18px 14px 16px;
  }
  .qc-steps {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    row-gap: 14px;
  }
  .qc-clues {
    grid-template-columns: minmax(0, 1fr);
  }
  .qc-clue {
    min-height: 0;
  }
  .qc-verdict {
    flex-basis: 100%;
  }
}
</style>
