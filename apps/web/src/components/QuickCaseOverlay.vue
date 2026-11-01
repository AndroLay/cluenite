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
  observe: "Inspect the clues to unlock evidence.",
  connect: "Select two unlocked clues, then link them.",
  challenge: "Choose a verdict.",
  reveal: "Recap below.",
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

function isInspectable(clue: QuickClue): boolean {
  return clue.status === "locked" && props.view.stage !== "reveal" && !props.view.paused;
}
function isSelectable(clue: QuickClue): boolean {
  return clue.status === "unlocked" && linkable.value;
}
// Preview data is not server-verified, so the stamp must not claim a real solve.
const stampLabel = computed(() => (props.view.source === "simulation" ? "◇ Simulated verdict" : "✓ Solved"));

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
        <span v-if="view.source === 'simulation'" class="qc-badge">SIMULATION · no Twitch chat</span>
        <h2 id="qc-title">{{ view.title }}</h2>
      </div>
      <div class="qc-header-actions">
        <span class="qc-stage" :data-stage="view.stage">{{ STAGE_LABEL[view.stage] }}</span>
        <span class="qc-timer" :data-running="view.timer.running">Time {{ elapsedLabel }}</span>
        <button type="button" class="qc-button" @click="emit('toggle-mute')">
          {{ muted ? "Unmute sound" : "Mute sound" }}
        </button>
      </div>
    </header>

    <ol class="qc-steps" aria-label="Case progress">
      <li
        v-for="step in STAGES"
        :key="step"
        :aria-current="step === view.stage ? 'step' : undefined"
        :data-done="STAGES.indexOf(step) < STAGES.indexOf(view.stage) ? 'true' : undefined"
      >
        {{ STAGE_LABEL[step] }}
      </li>
    </ol>

    <p class="qc-premise">{{ view.premise }}</p>
    <p class="qc-question">{{ view.question }}</p>

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
          <span class="qc-clue-id">{{ clue.id }}</span>
          <span class="qc-clue-label">{{ clue.label }}</span>
          <span class="qc-clue-state">{{ CLUE_STATE_TEXT[clue.status] }}</span>
          <span class="qc-clue-body">{{ clue.observation ?? clue.teaser }}</span>
        </button>
      </li>
    </ul>

    <div class="qc-link-area">
      <svg
        class="qc-connector"
        :class="{ 'is-linked': linkedCount >= 2 }"
        viewBox="0 0 600 40"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path ref="connectorEl" d="M 100 4 C 160 40, 440 40, 500 4" />
      </svg>
      <p ref="statusEl" class="qc-linked" :class="{ 'is-pending': linkedCount < 2 }">✓ Link recorded</p>
    </div>

    <div class="qc-actions">
      <button type="button" class="qc-action" :disabled="!canLink" @click="onLinkSelected">
        Link selected ({{ selected.length }}/2)
      </button>
      <button
        v-for="verdict in view.verdicts"
        :key="verdict.id"
        type="button"
        class="qc-action qc-action-primary"
        :disabled="!verdictable"
        @click="onVerdict(verdict.id)"
      >
        {{ verdict.label }}
      </button>
    </div>

    <p class="qc-hint" aria-live="polite">{{ STAGE_HINT[view.stage] }}</p>
    <p v-if="view.paused" class="qc-notice">Paused by the host. Actions are on hold.</p>

    <section ref="panelEl" class="qc-reveal" :hidden="view.stage !== 'reveal'" aria-label="Reveal">
      <p ref="revealTitleEl" class="qc-reveal-title">Reveal</p>
      <p ref="revealBodyEl" class="qc-reveal-body">{{ view.revealText }}</p>
      <div class="qc-reveal-footer">
        <span ref="stampEl" class="qc-stamp">{{ stampLabel }}</span>
        <button type="button" class="qc-button" @click="skipReveal">Skip</button>
      </div>
    </section>
  </section>
</template>

<style scoped>
.qc {
  box-sizing: border-box;
  width: min(100%, 600px);
  min-height: 340px;
  padding: 20px;
  display: grid;
  gap: 12px;
  align-content: start;
  border: 1px solid var(--ink-700);
  border-radius: var(--radius-lg);
  background: var(--ink-800);
  color: var(--paper-100);
  font-family: var(--font-sans);
  text-align: left;
}

/* OBS browser source: the panel keeps a dark backing so text stays readable over gameplay,
   and sits narrower for a 720p canvas. The page behind it is transparent (see App.vue). */
.qc.is-obs {
  width: min(100%, 560px);
  min-height: 0;
  border-color: transparent;
  background: rgba(16, 28, 42, 0.88);
}

.qc-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.qc-heading h2 {
  margin: 4px 0 0;
  font-size: 1.25rem;
}

.qc-badge {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--warning-coral);
}

.qc-header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.qc-stage {
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--ink-900);
  background: var(--neutral-blue);
}
.qc-stage[data-stage="connect"] { background: var(--proof-teal); }
.qc-stage[data-stage="challenge"] { background: var(--theory-lilac); }
.qc-stage[data-stage="reveal"] { background: var(--clue-gold); }
.qc-timer {
  font-size: 0.75rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--paper-100);
  opacity: 0.8;
}
.qc-timer[data-running="false"] {
  opacity: 0.55;
}

.qc-steps {
  display: flex;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.75rem;
  color: var(--neutral-blue);
}
.qc-steps li::before { content: "○ "; }
.qc-steps li[data-done]::before { content: "● "; color: var(--proof-teal); }
.qc-steps li[aria-current="step"] { color: var(--paper-100); font-weight: 700; }
.qc-steps li[aria-current="step"]::before { content: "◉ "; color: var(--clue-gold); }

.qc-premise,
.qc-question {
  margin: 0;
  line-height: 1.5;
}
.qc-question { font-weight: 700; }

.qc-clues {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.qc-clue {
  width: 100%;
  height: 100%;
  min-height: 96px;
  display: grid;
  gap: 4px;
  align-content: start;
  padding: 10px;
  border: 1px solid var(--ink-700);
  border-radius: var(--radius-md);
  background: var(--ink-900);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color var(--motion-fast) var(--ease-enter);
}
.qc-clue[data-status="unlocked"] { border-color: var(--clue-gold); }
.qc-clue[data-status="linked"] { border-color: var(--proof-teal); }
.qc-clue[aria-pressed="true"] { outline: 2px solid var(--clue-gold); outline-offset: 3px; }
.qc-notice { margin: 0.5rem 0 0; color: var(--clue-gold); font-size: 0.9rem; }
.qc-clue:disabled { cursor: default; }
.qc-clue:focus-visible,
.qc-button:focus-visible,
.qc-action:focus-visible,
.qc-skip:focus-visible {
  outline: 2px solid var(--clue-gold);
  outline-offset: 2px;
}

.qc-clue-id {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--clue-gold);
}
.qc-clue-label { font-weight: 700; font-size: 0.875rem; }
.qc-clue-state { font-size: 0.6875rem; color: var(--neutral-blue); }
.qc-clue-body { font-size: 0.75rem; line-height: 1.4; color: var(--paper-300); }

.qc-link-area {
  display: grid;
  justify-items: center;
  gap: 2px;
}

.qc-connector {
  width: 100%;
  height: 40px;
  overflow: visible;
}
.qc-connector path {
  fill: none;
  stroke: var(--proof-teal);
  stroke-width: 2;
  stroke-linecap: round;
  opacity: 0;
}
.qc-connector.is-linked path { opacity: 1; }

.qc-linked.is-pending { visibility: hidden; }
.qc-linked {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--proof-teal);
  white-space: nowrap;
}

.qc-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.qc-action,
.qc-button,
.qc-skip {
  border: 1px solid var(--ink-700);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  background: var(--ink-900);
  color: var(--paper-100);
  font: inherit;
  font-size: 0.8125rem;
  cursor: pointer;
}
.qc-action:disabled { color: var(--neutral-blue); cursor: default; }
.qc-action-primary:not(:disabled) { border-color: var(--theory-lilac); }

.qc-hint {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--paper-300);
}

.qc-reveal {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--clue-gold);
  border-radius: var(--radius-md);
  background: var(--ink-900);
}
.qc-reveal[hidden] { display: none; }
.qc-reveal-title { margin: 0; font-weight: 700; color: var(--clue-gold); }
.qc-reveal-body { margin: 0; font-size: 0.875rem; line-height: 1.5; }
.qc-reveal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.qc-stamp { font-weight: 700; color: var(--proof-teal); }
</style>
