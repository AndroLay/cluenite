<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import {
  buildEvidenceLinkTimeline,
  buildRevealTimeline,
} from "@cluenite/graphics";
import { prefersReducedMotion } from "@cluenite/ui";
import {
  formatElapsed,
  timerMsAt,
  type QuickCaseView,
  type QuickClue,
  type QuickStage,
} from "../quickCase/viewModel";
import CaseScene from "./CaseScene.vue";
import SiteIcon from "../site/SiteIcon.vue";
import BroadcastOverlay from "./BroadcastOverlay.vue";

const props = withDefaults(
  defineProps<{
    view: QuickCaseView;
    muted: boolean;
    obs?: boolean;
    mode?: "quick" | "mystery" | "coop";
    team?: "A" | "B" | null;
    // Result of the last command, from the server. The overlay never invents its own.
    notice?: { tone: "ok" | "warn"; text: string } | null;
  }>(),
  {
    obs: false,
    mode: "quick",
    team: null,
    notice: null,
  },
);

const emit = defineEmits<{
  inspect: [clueId: string];
  link: [clueA: string, clueB: string];
  verdict: [verdictId: string];
  hint: [];
  "toggle-mute": [];
}>();

const clueStatuses = computed(() =>
  props.view.clues.map((clue) => clue.status),
);

const STAGES: readonly QuickStage[] = [
  "observe",
  "connect",
  "challenge",
  "reveal",
];
const STAGE_LABEL: Record<QuickStage, string> = {
  observe: "Observe",
  connect: "Connect",
  challenge: "Challenge",
  reveal: "Reveal",
};
// OBS placement, read once from the browser-source URL: ?pos=bl|br|tl|tr (default bl) and
// ?scale=0.6..1.4 (default 1). The strip scales from its anchored corner, so it never grows into the scene.
const obsParams = new URLSearchParams(window.location.search);
const requestedPos = obsParams.get("pos");
const obsPosition =
  requestedPos === "tl" || requestedPos === "tr" || requestedPos === "br" ? requestedPos : "bl";
const obsScale = Math.min(1.4, Math.max(0.6, Number(obsParams.get("scale")) || 1));
const obsStyle = { "--qc-obs-scale": String(obsScale) };

const STAGE_HINT: Record<QuickStage, string> = {
  observe: "Inspect a sealed clue to open it as evidence.",
  connect: "Select two evidence records, then link them.",
  challenge: "Choose a verdict to close the case.",
  reveal: "Recap below.",
};
// Line icons for the stage track, drawn in a 16×16 box. Stroke only, so they take the text color.
const STAGE_ICON: Record<QuickStage, string> = {
  observe: "M7 2.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Zm3.3 7.8 3 3",
  connect:
    "M2.7 4.5a1.8 1.8 0 1 0 3.6 0 1.8 1.8 0 1 0-3.6 0Zm7 7a1.8 1.8 0 1 0 3.6 0 1.8 1.8 0 1 0-3.6 0ZM6 5.6l4 4.8",
  challenge: "M8 2.2 13.8 8 8 13.8 2.2 8Zm0 3.4v3.2m-1.6-1.6h3.2",
  reveal:
    "M1.6 8S3.9 3.7 8 3.7 14.4 8 14.4 8 12.1 12.3 8 12.3 1.6 8 1.6 8Zm4.7 0a1.7 1.7 0 1 0 3.4 0 1.7 1.7 0 1 0-3.4 0Z",
};
const CLUE_STATE_TEXT = {
  locked: "Inspect",
  unlocked: "Inspected",
  linked: "Linked",
} as const;

// The snapshot does not say which clue releases which evidence record. The overlay infers it
// from the first snapshot that shows an inspected clue: records that appear then belong to that
// clue, and no new record means the clue is context only. Clues that were already inspected
// when this view mounted keep the neutral "Inspected" label, because their origin is unknown.
const seenEvidenceIds = new Set<string>(props.view.evidence.map((item) => item.id));
const knownInspectedIds = new Set<string>(
  props.view.clues.filter((clue) => clue.status !== "locked").map((clue) => clue.id),
);
const contextOnlyIds = ref<string[]>([]);
const sourceByEvidence = ref<Record<string, string>>({});

watch(
  () => props.view,
  (view) => {
    const freshEvidence = view.evidence
      .map((item) => item.id)
      .filter((id) => !seenEvidenceIds.has(id));
    const presentEvidence = new Set(view.evidence.map((item) => item.id));
    const nextContext = new Set(contextOnlyIds.value);
    const nextSource: Record<string, string> = {};
    for (const [id, clueId] of Object.entries(sourceByEvidence.value)) {
      if (presentEvidence.has(id)) nextSource[id] = clueId;
    }
    for (const clue of view.clues) {
      if (clue.status === "locked") {
        knownInspectedIds.delete(clue.id);
        nextContext.delete(clue.id);
        continue;
      }
      if (knownInspectedIds.has(clue.id)) continue;
      knownInspectedIds.add(clue.id);
      if (freshEvidence.length === 0) nextContext.add(clue.id);
      for (const id of freshEvidence) nextSource[id] = clue.id;
    }
    contextOnlyIds.value = [...nextContext];
    sourceByEvidence.value = nextSource;
    seenEvidenceIds.clear();
    for (const id of presentEvidence) seenEvidenceIds.add(id);
  },
  { deep: true },
);

function clueStateText(clue: QuickClue): string {
  if (clue.status === "locked") return isInspectable(clue) ? "Inspect" : "Sealed";
  if (clue.status === "linked") return CLUE_STATE_TEXT.linked;
  return contextOnlyIds.value.includes(clue.id) ? "Context only" : CLUE_STATE_TEXT.unlocked;
}

const linkedCount = computed(
  () => props.view.clues.filter((clue) => clue.status === "linked").length,
);
const linkable = computed(
  () =>
    props.view.stage === "connect" &&
    !props.view.paused &&
    props.view.availableActions.includes("link") &&
    props.view.evidence.length >= 2,
);
// The server offers "solve" only after the proof is complete, so verdict buttons follow it.
const verdictable = computed(
  () =>
    props.view.stage === "challenge" &&
    !props.view.paused &&
    props.view.availableActions.includes("solve"),
);
// Hints come from the server: "hint" is offered only while hints remain.
const hintable = computed(
  () => !props.view.paused && props.view.availableActions.includes("hint"),
);
// Evidence IDs the viewer picked for a link. The server still validates the relationship.
const selected = ref<string[]>([]);
const canLink = computed(() => linkable.value && selected.value.length === 2);
const inspectedCount = computed(
  () => props.view.clues.filter((clue) => clue.status !== "locked").length,
);
// The server's latest revealed hint wins. Otherwise the stage line says what to do next, and
// names the evidence count when a link is not yet possible.
const guidance = computed(() => {
  if (props.view.currentHint) return props.view.currentHint;
  if (props.view.stage === "connect" && props.view.evidence.length < 2)
    return "Inspect another clue. Only evidence records can be linked, and some clues are context only.";
  return STAGE_HINT[props.view.stage];
});
// Names the linked pair in text, so the result does not rely on the connector alone.
const linkSummary = computed(() => {
  const pair = props.view.clues
    .filter((clue) => clue.status === "linked")
    .map((clue) => clue.id);
  return pair.length >= 2
    ? `Linked: ${pair.join(" and ")}`
    : "No link recorded yet.";
});
// Says why verdicts are off, instead of only dimming the buttons.
const verdictNote = computed(() => {
  if (
    props.obs ||
    verdictable.value ||
    props.view.paused ||
    props.view.stage === "reveal"
  )
    return null;
  return props.view.stage === "challenge"
    ? "Verdicts open when the server confirms the proof."
    : "Verdicts open after two clues are linked.";
});

// Inspect is offered only while the server lists "look" in availableActions.
function isInspectable(clue: QuickClue): boolean {
  return (
    clue.status === "locked" &&
    props.view.stage !== "reveal" &&
    !props.view.paused &&
    props.view.availableActions.includes("look")
  );
}
// A case file on the desk takes a tap exactly when its inspect card does; the tap uses the same emit.
const inspectableFlags = computed(() =>
  props.view.clues.map((clue) => isInspectable(clue)),
);
function onSceneInspect(index: number): void {
  const clue = props.view.clues[index];
  if (clue && isInspectable(clue)) emit("inspect", clue.id);
}
// The picked verdict is named only at reveal. Earlier picks never show on the board.
const chosenVerdict = computed(() => {
  if (props.view.stage !== "reveal" || props.view.chosenVerdictId === null)
    return null;
  return (
    props.view.verdicts.find(
      (verdict) => verdict.id === props.view.chosenVerdictId,
    ) ?? null
  );
});
// Preview data is not server-verified, so the stamp must not claim a real solve.
const stampLabel = computed(() => {
  const base =
    props.view.source === "simulation" ? "Sample verdict" : "Solved";
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

// Each command result is a new notice object. Keying the feedback on this counter replays
// its entrance animation for every result, including a repeated rejection.
const noticeSeq = ref(0);
// A rejected action also shakes the room once. Accepted results stay quiet.
const sceneJolt = ref(0);
watch(
  () => props.notice,
  (next) => {
    if (next) noticeSeq.value += 1;
    if (next?.tone === "warn") sceneJolt.value += 1;
  },
);

function onCardClick(clue: QuickClue): void {
  if (isInspectable(clue)) {
    emit("inspect", clue.id);
  }
}

function toggleSelected(evidenceId: string): void {
  const index = selected.value.indexOf(evidenceId);
  if (index >= 0) selected.value.splice(index, 1);
  else if (selected.value.length < 2) selected.value.push(evidenceId);
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

function onHint(): void {
  if (!hintable.value) return;
  emit("hint");
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
  // The recap sits below the board, so bring it on screen when the reveal starts.
  panelEl.value?.scrollIntoView({
    block: "nearest",
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });
  if (
    !panelEl.value ||
    !revealTitleEl.value ||
    !revealBodyEl.value ||
    !stampEl.value
  )
    return;
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

const elapsedLabel = computed(() =>
  formatElapsed(timerMsAt(props.view.timer, now.value)),
);

onBeforeUnmount(() => {
  stopTicking();
  killTimelines();
});
</script>

<template>
  <BroadcastOverlay v-if="obs" :view="view" :elapsed="elapsedLabel" :position="obsPosition" :scale="obsScale" :mode="mode" :team="team" />
  <section
    v-else
    class="qc"
    :class="{ 'is-obs': props.obs }"
    :data-pos="props.obs ? obsPosition : undefined"
    :style="props.obs ? obsStyle : undefined"
    aria-labelledby="qc-title"
  >
    <header class="qc-header">
      <div class="qc-heading">
        <h2 id="qc-title">
          {{ view.title }}
        </h2>
        <span
          v-if="view.source === 'simulation'"
          class="qc-badge"
        >Sample data · no Twitch chat</span>
      </div>
      <div class="qc-status">
        <span
          class="qc-stage"
          :data-stage="view.stage"
        >{{
          STAGE_LABEL[view.stage]
        }}</span>
        <span
          class="qc-timer"
          :data-running="view.timer.running"
        >Time {{ elapsedLabel }}</span>
        <button
          v-if="!props.obs"
          type="button"
          class="qc-button"
          @click="emit('toggle-mute')"
        >
          {{ muted ? "Unmute sound" : "Mute sound" }}
        </button>
      </div>
    </header>

    <div class="qc-main">
      <CaseScene
        class="qc-scene"
        :stage="view.stage"
        :clues="clueStatuses"
        :obs="props.obs ?? false"
        :inspectable="inspectableFlags"
        :jolt="sceneJolt"
        @inspect="onSceneInspect"
      />

      <ol
        class="qc-steps"
        aria-label="Case progress"
      >
        <li
          v-for="step in STAGES"
          :key="step"
          :aria-current="step === view.stage ? 'step' : undefined"
          :data-done="
            STAGES.indexOf(step) < STAGES.indexOf(view.stage) ? 'true' : undefined
          "
        >
          <svg
            class="qc-icon"
            viewBox="0 0 16 16"
            aria-hidden="true"
          >
            <path :d="STAGE_ICON[step]" />
          </svg>
          <span>{{ STAGE_LABEL[step] }}</span>
        </li>
      </ol>

      <div class="qc-brief">
        <p class="qc-premise">
          {{ view.premise }}
        </p>
        <p class="qc-question">
          {{ view.question }}
        </p>
      </div>

      <div class="qc-next">
        <p
          class="qc-hint"
          aria-live="polite"
        >
          <span
            v-if="view.currentHint"
            class="qc-hint-label"
          >Hint {{ view.hintLevel }}</span>
          {{ guidance }}
        </p>
        <button
          v-if="!props.obs && hintable"
          type="button"
          class="qc-action qc-hint-action"
          @click="onHint"
        >
          Ask for a hint
        </button>
        <dl
          class="qc-ledger"
          aria-label="Case counts"
        >
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
    </div>

    <div class="qc-side">
      <ul
        class="qc-clues"
        aria-label="Clues"
      >
        <li
          v-for="clue in view.clues"
          :key="clue.id"
        >
          <button
            :ref="(el) => setCardRef(clue.id, el)"
            type="button"
            class="qc-clue"
            :data-status="clue.status"
            :disabled="!isInspectable(clue)"
            @click="onCardClick(clue)"
          >
            <span class="qc-clue-top">
              <span class="qc-clue-id">{{ clue.id }}</span>
              <span class="qc-clue-state">{{ clueStateText(clue) }}</span>
            </span>
            <span class="qc-clue-label">{{ clue.label }}</span>
            <span class="qc-clue-body">{{
              clue.observation ?? clue.teaser
            }}</span>
          </button>
        </li>
      </ul>

      <section
        class="qc-evidence"
        aria-labelledby="qc-evidence-title"
      >
        <div class="qc-evidence-heading">
          <h3 id="qc-evidence-title">
            Released evidence
          </h3>
          <span>{{ view.evidence.length }} records</span>
        </div>
        <p
          v-if="view.evidence.length === 0"
          class="qc-evidence-empty"
        >
          Inspect a clue. Some clues are context only and release no record.
        </p>
        <ul
          v-else
          class="qc-evidence-list"
        >
          <li
            v-for="item in view.evidence"
            :key="item.id"
          >
            <button
              type="button"
              class="qc-evidence-card"
              :aria-pressed="selected.includes(item.id)"
              :disabled="!linkable"
              @click="toggleSelected(item.id)"
            >
              <span class="qc-evidence-id">{{ item.id }}</span>
              <strong>{{ item.label }}</strong>
              <small>{{
                selected.includes(item.id)
                  ? "Selected for link"
                  : sourceByEvidence[item.id]
                    ? `Released by ${sourceByEvidence[item.id]}`
                    : item.shared
                      ? "Shared evidence"
                      : item.team
                        ? `Station ${item.team}`
                        : "Evidence record"
              }}</small>
            </button>
          </li>
        </ul>
      </section>

      <p
        v-if="notice"
        :key="noticeSeq"
        class="qc-feedback"
        :class="notice.tone === 'warn' ? 'is-warn' : 'is-ok'"
        role="status"
        aria-live="polite"
      >
        {{ notice.text }}
      </p>

      <div class="qc-link">
        <svg
          class="qc-connector"
          :class="{ 'is-linked': linkedCount >= 2 }"
          viewBox="0 0 600 40"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            ref="connectorEl"
            d="M 100 4 C 160 40, 440 40, 500 4"
          />
        </svg>
        <div class="qc-link-row">
          <p
            ref="statusEl"
            class="qc-linked"
            :class="{ 'is-pending': linkedCount < 2 }"
          >
            <SiteIcon v-if="linkedCount >= 2" name="link" />
            {{ linkSummary }}
          </p>
          <button
            v-if="view.stage === 'connect' && linkedCount < 2"
            type="button"
            class="qc-action"
            :disabled="!canLink"
            @click="onLinkSelected"
          >
            Link selected ({{ selected.length }}/2)
          </button>
        </div>
      </div>

      <div
        v-if="!props.obs"
        class="qc-verdicts"
      >
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

      <p
        v-if="verdictNote"
        class="qc-verdict-note"
      >
        {{ verdictNote }}
      </p>

      <p
        v-if="view.paused"
        class="qc-notice"
        role="status"
      >
        Paused by the host. Actions are on hold.
      </p>

      <section
        ref="panelEl"
        class="qc-reveal"
        :hidden="view.stage !== 'reveal'"
        aria-label="Reveal"
      >
        <p
          ref="revealTitleEl"
          class="qc-reveal-title"
        >
          Reveal
        </p>
        <p
          ref="revealBodyEl"
          class="qc-reveal-body"
        >
          {{ view.revealText }}
        </p>
        <div class="qc-reveal-footer">
          <span
            ref="stampEl"
            class="qc-stamp"
          ><SiteIcon :name="view.source === 'simulation' ? 'scales' : 'check'" /> {{ stampLabel }}</span>
          <button
            v-if="!props.obs"
            type="button"
            class="qc-button"
            @click="skipReveal"
          >
            Skip
          </button>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
/* Case board: a dark ink panel in a gold frame. Sealed clues are dark cards with a dashed
   edge, opened clues are paper slips, and linked clues are pinned to the board with a brass thread. */
.qc {
  box-sizing: border-box;
  position: relative;
  width: 100%;
  display: grid;
  gap: 20px;
  /* Side padding is a variable so the scene bleed below always matches it, at every width and in OBS. */
  --qc-pad-x: 22px;
  padding: 26px var(--qc-pad-x) 22px;
  border: 1px solid var(--case-gold);
  border-radius: 4px;
  background:
    radial-gradient(
      560px 240px at 50% -4%,
      rgba(217, 182, 129, 0.12),
      transparent 70%
    ),
    var(--case-panel);
  /* Lamp catches the top rim; a tight contact shadow and a long soft drop lift the board off the desk. */
  box-shadow:
    inset 0 1px 0 rgba(217, 182, 129, 0.22),
    inset 0 0 96px rgba(0, 0, 0, 0.5),
    0 2px 6px rgba(0, 0, 0, 0.35),
    0 -24px 80px -48px rgba(217, 182, 129, 0.2),
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
  border: 1px solid rgba(217, 182, 129, 0.28);
  border-radius: 2px;
  pointer-events: none;
  /* Above the room, so the hairline still frames the board where the scene bleeds to the edge. */
  z-index: 1;
}

/* The room bleeds to the board's inner edges, so the scene reads as one picture set into the frame. */
.qc .qc-scene {
  width: auto;
  margin-inline: calc(-1 * var(--qc-pad-x));
  border-inline-width: 0;
  border-radius: 0;
}

/* Column wrappers keep the single-column rhythm: scene and brief on one side, clue tools and reveal on the other. */
.qc-main,
.qc-side {
  display: grid;
  gap: 20px;
  min-width: 0;
}
.qc.is-obs .qc-main,
.qc.is-obs .qc-side {
  gap: 10px;
}

/* Desktop (1240px+): the scene is the hero on the left and the investigation tools sit on the right,
   so the loop fits a 1080p screen without scrolling. OBS and narrow screens keep the single column. */
@media (min-width: 1240px) {
  .qc:not(.is-obs) {
    grid-template-columns: minmax(0, 1fr) minmax(380px, 0.85fr);
    column-gap: 28px;
    align-items: start;
  }
  .qc:not(.is-obs) > .qc-header {
    grid-column: 1 / -1;
  }
  .qc:not(.is-obs) .qc-scene {
    margin-inline: 0;
    border-inline-width: 1px;
    border-radius: 3px;
  }
}

/* OBS: a compact horizontal strip for the 1280x720 canvas (1920x1080 keeps the same pixel size).
   It sits in a corner over the transparent browser source, keeps a solid dark backing, and scales
   from its anchor corner. The scene, steps, premise, ledger, and verdict buttons stay out of OBS.
   Rows: head, question, hint, clues, evidence, link. Target height is about 200px. */
.qc.is-obs {
  --qc-pad-x: 14px;
  position: fixed;
  z-index: 10;
  inset: auto auto 24px 24px;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    "head head"
    "question question"
    "hint hint"
    "clues clues"
    "evh link"
    "ev ev";
  align-content: start;
  /* Row gap is 0 so an empty hint row adds no height. Spacing comes from margins below. */
  row-gap: 0;
  column-gap: 8px;
  width: min(540px, calc(100vw - 48px));
  padding: 10px 12px;
  border: 1px solid var(--case-rule);
  border-radius: 0;
  background: rgba(16, 13, 10, 0.94);
  box-shadow: none;
  transform: scale(var(--qc-obs-scale, 1));
  transform-origin: left bottom;
}
.qc.is-obs[data-pos="tl"] {
  inset: 24px auto auto 24px;
  transform-origin: left top;
}
.qc.is-obs[data-pos="tr"] {
  inset: 24px 24px auto auto;
  transform-origin: right top;
}
.qc.is-obs[data-pos="br"] {
  inset: auto 24px 24px auto;
  transform-origin: right bottom;
}
.qc.is-obs::before {
  display: none;
}
.qc.is-obs .qc-main,
.qc.is-obs .qc-side {
  display: contents;
}
.qc.is-obs .qc-scene,
.qc.is-obs .qc-steps,
.qc.is-obs .qc-premise,
.qc.is-obs .qc-ledger,
.qc.is-obs .qc-verdicts,
.qc.is-obs .qc-verdict-note,
.qc.is-obs .qc-notice,
.qc.is-obs .qc-feedback,
.qc.is-obs .qc-evidence-empty,
.qc.is-obs .qc-connector,
.qc.is-obs .qc-evidence-card small {
  display: none;
}
/* Compact clue cards: the base card has a 136px minimum height, which made the strip too tall.
   OBS cards show id, label, and state. The observation text stays on the full desktop board. */
.qc.is-obs .qc-clue {
  min-height: 0;
  gap: 4px;
  padding: 7px 9px;
}
.qc.is-obs .qc-clue-label {
  display: block;
  min-height: 0;
  font-size: 0.875rem;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.qc.is-obs .qc-clue-body {
  display: none;
}
.qc.is-obs .qc-header {
  grid-area: head;
  align-items: center;
  flex-wrap: nowrap;
  margin-bottom: 8px;
}
.qc.is-obs .qc-heading {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.qc.is-obs .qc-status {
  flex: none;
}
.qc.is-obs .qc-header h2 {
  font-size: 1.125rem;
}
.qc.is-obs .qc-badge {
  padding: 2px 6px;
  font-size: 0.625rem;
  letter-spacing: 0.06em;
  white-space: nowrap;
}
.qc.is-obs .qc-brief {
  display: contents;
}
.qc.is-obs .qc-question {
  grid-area: question;
  margin: 0 0 8px;
  font-size: 0.8125rem;
  color: var(--case-paper-dim);
}
.qc.is-obs .qc-next {
  grid-area: hint;
}
.qc.is-obs .qc-hint {
  font-size: 0.8125rem;
  line-height: 1.35;
}
.qc.is-obs .qc-clues {
  grid-area: clues;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  margin-bottom: 8px;
}
.qc.is-obs .qc-clue {
  padding: 7px 8px;
}
.qc.is-obs .qc-evidence {
  /* Children become root grid items: heading (evh), chips (ev), and link share the rows. */
  display: contents;
}
.qc.is-obs .qc-link-row {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}
.qc.is-obs .qc-linked {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.3;
  white-space: nowrap;
}
.qc.is-obs .qc-link .qc-action {
  padding: 4px 8px;
  font-size: 0.75rem;
}
/* Released evidence as one-line chips. Each record card was a tall block at desktop size,
   which pushed the linked state past 400px. */
.qc.is-obs .qc-evidence-heading > span {
  display: none;
}
.qc.is-obs .qc-evidence-heading h3 {
  font-size: 0.9375rem;
}
.qc.is-obs .qc-evidence-list li {
  display: flex;
}
.qc.is-obs .qc-evidence-card {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  gap: 6px;
  min-height: 0;
  padding: 4px 8px;
  white-space: nowrap;
}
.qc.is-obs .qc-evidence-card strong {
  min-width: 0;
  overflow: hidden;
  font-size: 0.8125rem;
  text-overflow: ellipsis;
}
.qc.is-obs .qc-evidence-heading {
  grid-area: evh;
  display: flex;
  gap: 8px;
  align-items: baseline;
  min-width: 0;
}
.qc.is-obs .qc-evidence-list {
  grid-area: ev;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.qc.is-obs .qc-link {
  grid-area: link;
  justify-self: end;
  min-width: 0;
}
.qc.is-obs .qc-reveal {
  grid-area: hint;
}
.qc.is-obs:has(.qc-reveal) .qc-next {
  display: none;
}
/* 1280x720 fit: the stage pill names the current step and the clue cards show inspected and
   linked state, so the step track and the count ledger stay out of the OBS strip. */

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

/* Rubber stamp: double rule, tilted 2 degrees. Used only for the sample data notice. */
.qc-badge {
  justify-self: start;
  padding: 3px 9px;
  border: 3px double rgba(217, 182, 129, 0.6);
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
  font-family: var(--font-body);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.12em;
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

/* The question is underlined in brass thread, like a line marked on a case file. */
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

.qc-hint-label {
  margin-right: 8px;
  color: var(--case-amber);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.qc-hint-action {
  justify-self: start;
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
    box-shadow: 0 0 0 1px rgba(217, 182, 129, 0.8);
  }
  55% {
    box-shadow:
      0 0 0 2px rgba(217, 182, 129, 0.55),
      0 0 24px rgba(217, 182, 129, 0.28);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.qc-clue[data-status="unlocked"] {
  animation: clue-open 520ms var(--ease-out-expo) backwards;
  border-color: #c9b899;
  background: var(--case-slip);
  color: var(--case-slip-ink);
  box-shadow: 0 14px 20px -16px rgba(0, 0, 0, 0.9);
}
.qc-clue[data-status="unlocked"] .qc-clue-body {
  color: #211811;
}
.qc-clue[data-status="unlocked"] .qc-clue-id {
  color: #7a5428;
}
.qc-clue[data-status="unlocked"] .qc-clue-state {
  color: #7a5428;
  border-color: #7a5428;
}
.qc-clue[data-status="unlocked"]:not(:disabled):hover {
  transform: translateY(-2px);
}
/* Linked: a slip pinned to the board with the thread color. */
.qc-clue[data-status="linked"] {
  border-color: var(--case-thread);
  background: var(--case-slip);
  color: var(--case-slip-ink);
  box-shadow: 0 14px 20px -16px rgba(0, 0, 0, 0.9);
}
.qc-clue[data-status="linked"] .qc-clue-body {
  color: #211811;
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

/* Reserve two lines so the body text lines up across a row, even when one title wraps. */
.qc-clue-label {
  min-height: 2.4em;
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

.qc-evidence {
  display: grid;
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid var(--case-rule);
}

.qc-evidence-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.qc-evidence-heading h3 {
  margin: 0;
  color: var(--case-paper);
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 600;
}

.qc-evidence-heading > span,
.qc-evidence-empty {
  margin: 0;
  color: var(--case-paper-dim);
  font-size: 0.8125rem;
}

.qc-evidence-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.qc-evidence-card {
  appearance: none;
  width: 100%;
  min-height: 96px;
  display: grid;
  align-content: start;
  gap: 5px;
  padding: 12px;
  border: 1px solid var(--case-rule-strong);
  border-radius: var(--radius-slip);
  background: var(--case-bg);
  color: var(--case-paper);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color var(--dur-state) ease,
    background-color var(--dur-state) ease;
}

/* Released evidence fades in when it first appears. Keys are stable, so only new items replay. */
.qc-evidence-list li {
  animation: qc-evidence-in 420ms ease-out both;
}

@keyframes qc-evidence-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .qc-evidence-list li {
    animation: none;
  }
}

.qc-evidence-card[aria-pressed="true"] {
  border-color: var(--case-amber);
  background: var(--case-raised);
  box-shadow: inset 0 0 0 1px var(--case-amber);
}

.qc-evidence-card:disabled {
  cursor: default;
}

.qc-evidence-card:not(:disabled):hover {
  border-color: var(--case-paper-dim);
}

.qc-evidence-id {
  color: var(--case-amber);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.qc-evidence-card strong {
  font-family: var(--font-display);
  font-size: 1rem;
}

.qc-evidence-card small {
  color: var(--case-paper-dim);
  font-size: 0.75rem;
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
.qc-evidence-card:focus-visible,
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
  border: 1px solid rgba(217, 154, 136, 0.55);
  border-radius: var(--radius-slip);
  background: rgba(217, 154, 136, 0.08);
  color: var(--case-alert);
  font-size: 0.8125rem;
  font-weight: 600;
}

/* Result of the last command, as the server reported it. A rejection shakes once. */
.qc-feedback {
  margin: 0;
  padding: 8px 12px;
  border: 1px solid var(--case-rule-strong);
  border-radius: var(--radius-slip);
  background: rgba(0, 0, 0, 0.18);
  color: var(--case-paper);
  font-size: 0.8125rem;
  font-weight: 600;
}

.qc-feedback.is-ok {
  border-color: var(--case-thread);
  color: var(--case-thread);
  animation: qc-feedback-in 220ms ease-out;
}

.qc-feedback.is-warn {
  border-color: var(--case-alert);
  color: var(--case-alert);
  animation: qc-feedback-reject 380ms ease-out;
}

@keyframes qc-feedback-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes qc-feedback-reject {
  0%,
  100% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(-5px);
  }
  40% {
    transform: translateX(5px);
  }
  60% {
    transform: translateX(-3px);
  }
  80% {
    transform: translateX(2px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .qc-feedback.is-ok,
  .qc-feedback.is-warn {
    animation: none;
  }
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
  color: #211811;
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
  border-top: 1px solid rgba(33, 24, 17, 0.18);
}

.qc-reveal .qc-button {
  background: transparent;
  border-color: rgba(33, 24, 17, 0.35);
  color: var(--case-slip-ink);
}
.qc-reveal .qc-button:hover {
  background: rgba(33, 24, 17, 0.08);
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
    --qc-pad-x: 14px;
    gap: 16px;
    padding: 18px var(--qc-pad-x) 16px;
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
