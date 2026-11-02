<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { RoundSnapshot } from "@cluenite/contracts";
import { formatElapsed } from "../quickCase/viewModel";
import MysteryLiveScene from "./MysteryLiveScene.vue";
import trophyPhoto from "../assets/mystery-live/trophy-photo.png";
import heatWarning from "../assets/mystery-live/heat-warning.png";
import accessLog from "../assets/mystery-live/access-log.png";
import trolleyCctv from "../assets/mystery-live/trolley-cctv.png";
import museumGallery from "../assets/mystery-live/museum-gallery.png";

type TimelineEvent = { id: string; label: string };

const props = defineProps<{
  snapshot: RoundSnapshot;
  interactive: boolean;
  connection: "connecting" | "connected" | "disconnected";
  notice: { tone: "ok" | "warn"; text: string } | null;
}>();

const emit = defineEmits<{ command: [text: string] }>();

const clueArt: Record<string, string> = {
  PHOTO: trophyPhoto,
  CASE: heatWarning,
  ACCESS: accessLog,
  TROLLEY: trolleyCctv,
  WORK_ORDER: accessLog,
};

const evidenceArt: Record<string, string> = {
  PHOTO_1847: trophyPhoto,
  HEAT_WARNING: heatWarning,
  DISPLAY_EMPTY: museumGallery,
  ACCESS_RECORD: accessLog,
  CART_MARK: trolleyCctv,
  TIMELINE_RECONSTRUCTED: trolleyCctv,
  SIGNED_ORDER: accessLog,
  B4_CONFIRMED: trophyPhoto,
  TROPHY_FOUND: museumGallery,
};

const activeClueId = ref<string | null>(
  props.snapshot.clues.find((clue) => clue.status === "unlocked")?.id ??
    props.snapshot.clues[0]?.id ??
    null,
);
const activeEvidenceId = ref<string | null>(
  props.snapshot.evidence[0]?.id ?? null,
);
const zoomed = ref(false);
const selectedTheoryId = ref<string | null>(
  props.snapshot.theories[0]?.id ?? null,
);
const selectedChallengeEvidenceId = ref<string | null>(
  props.snapshot.evidence[0]?.id ?? null,
);
const timelineOrder = ref<string[]>(
  props.snapshot.sequences[0]?.events?.map((event) => event.id) ?? [],
);

const actions = computed(() => new Set(props.snapshot.availableActions));
const activeClue = computed(
  () =>
    props.snapshot.clues.find((clue) => clue.id === activeClueId.value) ??
    props.snapshot.clues[0] ??
    null,
);
const activeEvidence = computed(
  () =>
    props.snapshot.evidence.find(
      (item) => item.id === activeEvidenceId.value,
    ) ?? null,
);
const activeArt = computed(() =>
  activeEvidence.value
    ? (evidenceArt[activeEvidence.value.id] ?? museumGallery)
    : activeClue.value
      ? (clueArt[activeClue.value.id] ?? museumGallery)
      : museumGallery,
);
const timeline = computed(() => props.snapshot.sequences[0] ?? null);
const timelineEvents = computed(() => timeline.value?.events ?? []);
const orderedEvents = computed(() =>
  timelineOrder.value
    .map((id) => timelineEvents.value.find((event) => event.id === id))
    .filter((event): event is TimelineEvent => event !== undefined),
);
const activeTheory = computed(
  () =>
    props.snapshot.theories.find(
      (theory) => theory.id === selectedTheoryId.value,
    ) ??
    props.snapshot.theories[0] ??
    null,
);
const chosenVerdict = computed(
  () =>
    props.snapshot.verdicts.find(
      (verdict) => verdict.id === props.snapshot.chosenVerdictId,
    ) ?? null,
);
const clock = computed(() => formatElapsed(props.snapshot.timer.elapsedMs));
const inspectAvailable = computed(
  () =>
    actions.value.has("look") &&
    props.snapshot.phase === "ACTIVE" &&
    !props.snapshot.paused,
);
const canAskHint = computed(
  () =>
    actions.value.has("hint") &&
    props.snapshot.phase === "ACTIVE" &&
    !props.snapshot.paused,
);
const canProposeTheory = computed(
  () =>
    actions.value.has("theory") &&
    props.snapshot.phase === "ACTIVE" &&
    !props.snapshot.paused,
);
const canChallenge = computed(
  () =>
    actions.value.has("challenge") &&
    props.snapshot.phase === "ACTIVE" &&
    !props.snapshot.paused &&
    activeTheory.value !== null &&
    activeEvidence.value !== null,
);
const canSolve = computed(
  () =>
    actions.value.has("solve") &&
    props.snapshot.phase === "ACTIVE" &&
    !props.snapshot.paused,
);
const canArrangeTimeline = computed(
  () =>
    !props.snapshot.paused &&
    props.snapshot.phase === "ACTIVE" &&
    !timeline.value?.complete &&
    timelineEvents.value.length > 1,
);
const canVerifyTimeline = computed(
  () =>
    props.interactive &&
    actions.value.has("order") &&
    canArrangeTimeline.value &&
    timelineOrder.value.length === timelineEvents.value.length,
);
const connectionLabel = computed(() => {
  if (props.snapshot.source === "simulation") return "Sample investigation";
  if (props.connection === "connected") return "Session connected";
  if (props.connection === "connecting") return "Connecting to session";
  return "Reconnecting to session";
});

watch(
  () =>
    props.snapshot.clues.map((clue) => `${clue.id}:${clue.status}`).join("|"),
  () => {
    if (!props.snapshot.clues.some((clue) => clue.id === activeClueId.value)) {
      activeClueId.value =
        props.snapshot.clues.find((clue) => clue.status === "unlocked")?.id ??
        props.snapshot.clues[0]?.id ??
        null;
    }
  },
);

watch(
  () => props.snapshot.evidence.map((item) => item.id).join("|"),
  () => {
    if (
      !props.snapshot.evidence.some(
        (item) => item.id === activeEvidenceId.value,
      )
    ) {
      activeEvidenceId.value = props.snapshot.evidence[0]?.id ?? null;
    }
    if (
      !props.snapshot.evidence.some(
        (item) => item.id === selectedChallengeEvidenceId.value,
      )
    ) {
      selectedChallengeEvidenceId.value =
        props.snapshot.evidence[0]?.id ?? null;
    }
  },
);

watch(
  () => timelineEvents.value.map((event) => event.id).join("|"),
  (ids) => {
    timelineOrder.value = ids.length > 0 ? ids.split("|") : [];
  },
);

watch(activeEvidenceId, () => {
  zoomed.value = false;
});

function selectClue(id: string): void {
  activeClueId.value = id;
  activeEvidenceId.value = null;
}

function inspectClue(id: string): void {
  const clue = props.snapshot.clues.find((item) => item.id === id);
  if (!clue) return;
  selectClue(id);
  if (clue.status === "locked" && inspectAvailable.value && props.interactive) {
    emit("command", `!inspect ${id}`);
  }
}

function selectEvidence(id: string): void {
  activeEvidenceId.value = id;
}

function moveEvent(index: number, offset: -1 | 1): void {
  const nextIndex = index + offset;
  if (
    !canArrangeTimeline.value ||
    index < 0 ||
    nextIndex < 0 ||
    nextIndex >= timelineOrder.value.length
  )
    return;
  const next = [...timelineOrder.value];
  [next[index], next[nextIndex]] = [next[nextIndex]!, next[index]!];
  timelineOrder.value = next;
}

function verifyTimeline(): void {
  if (!canVerifyTimeline.value) return;
  emit("command", `!order ${timelineOrder.value.join(" ")}`);
}

function proposeTheory(): void {
  if (!canProposeTheory.value || !activeTheory.value) return;
  emit("command", `!theory ${activeTheory.value.id}`);
}

function challengeTheory(): void {
  if (
    !canChallenge.value ||
    !activeTheory.value ||
    !selectedChallengeEvidenceId.value
  )
    return;
  emit(
    "command",
    `!challenge ${activeTheory.value.id} ${selectedChallengeEvidenceId.value}`,
  );
}

function requestHint(): void {
  if (props.interactive && canAskHint.value) emit("command", "!hint");
}

function solveWith(verdictId: string): void {
  if (props.interactive && canSolve.value)
    emit("command", `!solve ${verdictId}`);
}
</script>

<template>
  <section
    class="mystery-live"
    aria-labelledby="mystery-title"
  >
    <header class="case-heading">
      <div class="case-heading-main">
        <div class="case-ident">
          <span class="case-file-id">{{
            snapshot.caseId.replaceAll("_", " ")
          }}</span>
          <span
            class="source-status"
            :data-source="snapshot.source"
          >
            <span
              class="status-mark"
              aria-hidden="true"
            />
            {{ connectionLabel }}
          </span>
        </div>
        <h1 id="mystery-title">
          {{ snapshot.title }}
        </h1>
        <p class="case-premise">
          {{ snapshot.premise }}
        </p>
      </div>
      <div
        class="case-clock"
        aria-label="Elapsed time"
      >
        <span>ELAPSED</span>
        <strong>{{ clock }}</strong>
        <small>No countdown penalty</small>
      </div>
    </header>

    <div class="case-question">
      <span
        class="question-mark"
        aria-hidden="true"
      >?</span>
      <p>{{ snapshot.question }}</p>
      <span class="stage-label">{{ snapshot.stage }}</span>
    </div>

    <p
      v-if="snapshot.source === 'simulation'"
      class="sample-notice"
      role="note"
    >
      Sample state for visual preview. It is not a Twitch session and cannot
      validate actions.
    </p>
    <p
      v-else-if="snapshot.paused"
      class="paused-notice"
      role="status"
    >
      The host paused this case. Evidence and progress are preserved.
    </p>
    <p
      v-if="notice"
      class="command-notice"
      :data-tone="notice.tone"
      role="status"
    >
      {{ notice.text }}
    </p>

    <div class="investigation-grid">
      <div class="visual-column">
        <section
          class="gallery-scene"
          aria-label="Museum gallery scene"
        >
          <MysteryLiveScene :focused-clue-id="activeClueId" />
          <div
            class="scene-shade"
            aria-hidden="true"
          />
          <div class="scene-label">
            <span>Museum gallery</span>
            <strong>Exhibit display</strong>
          </div>
          <button
            class="scene-hotspot"
            type="button"
            :disabled="!snapshot.clues.some((clue) => clue.id === 'CASE')"
            aria-label="Inspect the exhibit display"
            @click="inspectClue('CASE')"
          >
            <span aria-hidden="true" />
            <small>Inspect display</small>
          </button>
          <div class="scene-footer">
            <p>Follow the records. Let the evidence set the order.</p>
            <span
              v-if="snapshot.team"
              class="team-tag"
            >Station {{ snapshot.team }}</span>
          </div>
        </section>

        <section
          class="evidence-board"
          aria-labelledby="evidence-heading"
        >
          <div class="section-heading">
            <div>
              <h2 id="evidence-heading">
                Evidence on the board
              </h2>
              <p>Open a finding to inspect the source material.</p>
            </div>
            <span class="evidence-count">{{ snapshot.evidence.length }} findings</span>
          </div>
          <p
            v-if="snapshot.evidence.length === 0"
            class="empty-evidence"
          >
            No evidence has been released yet. Inspect a clue to begin.
          </p>
          <div
            v-else
            class="evidence-rail"
          >
            <button
              v-for="item in snapshot.evidence"
              :key="item.id"
              class="evidence-card"
              :class="{ 'is-selected': item.id === activeEvidenceId }"
              type="button"
              :aria-pressed="item.id === activeEvidenceId"
              @click="selectEvidence(item.id)"
            >
              <img
                :src="evidenceArt[item.id] ?? museumGallery"
                :alt="`Artwork: ${item.label}`"
              >
              <span class="evidence-card-caption">
                <span class="evidence-id">{{ item.id }}</span>
                <strong>{{ item.label }}</strong>
                <small v-if="item.shared">Shared across stations</small>
                <small v-else-if="item.team">Station {{ item.team }} finding</small>
              </span>
            </button>
          </div>
        </section>

        <section
          class="clue-register"
          aria-labelledby="clue-heading"
        >
          <div class="section-heading">
            <div>
              <h2 id="clue-heading">
                Clue register
              </h2>
              <p>Clues reveal source records; they are not evidence links.</p>
            </div>
            <span class="register-count">
              {{
                snapshot.clues.filter((clue) => clue.status !== "locked")
                  .length
              }}/{{ snapshot.clues.length }} opened
            </span>
          </div>
          <div class="clue-list">
            <button
              v-for="clue in snapshot.clues"
              :key="clue.id"
              class="clue-row"
              :class="{
                'is-current': clue.id === activeClueId,
                'is-open': clue.status !== 'locked',
              }"
              type="button"
              :aria-pressed="clue.id === activeClueId"
              @click="selectClue(clue.id)"
            >
              <img
                :src="clueArt[clue.id] ?? museumGallery"
                alt=""
              >
              <span class="clue-row-copy">
                <span class="clue-row-id">{{ clue.id }}</span>
                <strong>{{ clue.label }}</strong>
              </span>
              <span class="clue-row-state">{{
                clue.status === "locked" ? "Sealed" : "Opened"
              }}</span>
            </button>
          </div>
        </section>
      </div>

      <aside
        class="casework-column"
        aria-label="Case workbench"
      >
        <section
          class="inspection-panel"
          aria-labelledby="inspection-heading"
        >
          <div class="section-heading inspector-heading">
            <div>
              <h2 id="inspection-heading">
                Evidence inspection
              </h2>
              <p>Read the record before drawing a conclusion.</p>
            </div>
            <button
              class="zoom-toggle"
              type="button"
              :aria-expanded="zoomed"
              @click="zoomed = !zoomed"
            >
              {{ zoomed ? "Reduce" : "Enlarge" }}
            </button>
          </div>
          <figure
            class="artifact-view"
            :class="{ 'is-zoomed': zoomed }"
          >
            <img
              :src="activeArt"
              :alt="
                activeEvidence
                  ? `Evidence artwork: ${activeEvidence.label}`
                  : (activeClue?.label ?? 'Museum evidence')
              "
            >
            <figcaption>
              <span>{{
                activeEvidence?.id ?? activeClue?.id ?? "CASE FILE"
              }}</span>
              <strong>{{
                activeEvidence?.label ?? activeClue?.label ?? "Select a record"
              }}</strong>
            </figcaption>
          </figure>
          <div
            class="inspection-copy"
            aria-live="polite"
          >
            <p>
              {{
                activeEvidence?.label ??
                  activeClue?.observation ??
                  activeClue?.teaser ??
                  "Select a clue or evidence card."
              }}
            </p>
            <button
              v-if="activeClue"
              class="inspect-action"
              type="button"
              :disabled="
                !interactive ||
                  activeClue.status !== 'locked' ||
                  !inspectAvailable
              "
              @click="inspectClue(activeClue.id)"
            >
              {{
                activeClue.status === "locked"
                  ? "Inspect source record"
                  : "Record opened"
              }}
            </button>
          </div>
        </section>

        <section
          class="timeline-panel"
          aria-labelledby="timeline-heading"
        >
          <div class="section-heading">
            <div>
              <h2 id="timeline-heading">
                Incident timeline
              </h2>
              <p
                v-if="timeline?.complete"
                class="verified-copy"
              >
                Verified by the game server.
              </p>
              <p v-else>
                Arrange the event cards, then ask the server to verify.
              </p>
            </div>
            <span
              class="timeline-status"
              :data-complete="timeline?.complete ?? false"
            >
              {{ timeline?.complete ? "Verified" : "In progress" }}
            </span>
          </div>
          <ol
            v-if="orderedEvents.length > 0"
            class="timeline-list"
          >
            <li
              v-for="(event, index) in orderedEvents"
              :key="event.id"
            >
              <span class="timeline-index">{{
                String(index + 1).padStart(2, "0")
              }}</span>
              <strong>{{ event.label }}</strong>
              <span class="timeline-moves">
                <button
                  type="button"
                  :disabled="!canArrangeTimeline || index === 0"
                  :aria-label="`Move ${event.label} earlier`"
                  @click="moveEvent(index, -1)"
                >
                  <svg
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                  >
                    <path d="m3 10 5-5 5 5" />
                  </svg>
                </button>
                <button
                  type="button"
                  :disabled="
                    !canArrangeTimeline || index === orderedEvents.length - 1
                  "
                  :aria-label="`Move ${event.label} later`"
                  @click="moveEvent(index, 1)"
                >
                  <svg
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                  >
                    <path d="m3 6 5 5 5-5" />
                  </svg>
                </button>
              </span>
            </li>
          </ol>
          <p
            v-else
            class="timeline-empty"
          >
            Timeline choices are unavailable from this session snapshot.
          </p>
          <button
            class="verify-timeline"
            type="button"
            :disabled="!canVerifyTimeline || timeline?.complete"
            @click="verifyTimeline"
          >
            {{ timeline?.complete ? "Timeline verified" : "Verify this order" }}
          </button>
          <p
            v-if="!interactive && !timeline?.complete"
            class="preview-caption"
          >
            A live session is required to submit this timeline.
          </p>
        </section>

        <section
          v-if="snapshot.theories.length > 0"
          class="theory-panel"
          aria-labelledby="theory-heading"
        >
          <div class="section-heading">
            <div>
              <h2 id="theory-heading">
                Test a theory
              </h2>
              <p>Choose evidence that challenges the assumption.</p>
            </div>
          </div>
          <label
            class="field-label"
            for="theory-select"
          >Theory</label>
          <select
            id="theory-select"
            v-model="selectedTheoryId"
            :disabled="snapshot.theories.length < 2"
          >
            <option
              v-for="theory in snapshot.theories"
              :key="theory.id"
              :value="theory.id"
            >
              {{ theory.label }} · {{ theory.status.toLowerCase() }}
            </option>
          </select>
          <div
            v-if="activeTheory"
            class="theory-state"
            :data-status="activeTheory.status"
          >
            <span>{{ activeTheory.status }}</span>
            <button
              type="button"
              :disabled="!interactive || !canProposeTheory"
              @click="proposeTheory"
            >
              Propose theory
            </button>
          </div>
          <label
            class="field-label"
            for="challenge-evidence"
          >Challenge with evidence</label>
          <select
            id="challenge-evidence"
            v-model="selectedChallengeEvidenceId"
            :disabled="snapshot.evidence.length === 0"
          >
            <option
              v-for="item in snapshot.evidence"
              :key="item.id"
              :value="item.id"
            >
              {{ item.id }} · {{ item.label }}
            </option>
          </select>
          <button
            class="challenge-action"
            type="button"
            :disabled="!interactive || !canChallenge"
            @click="challengeTheory"
          >
            Challenge with selected evidence
          </button>
        </section>

        <section
          class="verdict-panel"
          aria-labelledby="verdict-heading"
        >
          <div class="section-heading">
            <div>
              <h2 id="verdict-heading">
                Your conclusion
              </h2>
              <p>
                The server accepts a verdict only when its proof is complete.
              </p>
            </div>
          </div>
          <div class="verdict-list">
            <button
              v-for="verdict in snapshot.verdicts"
              :key="verdict.id"
              type="button"
              :class="{ 'is-chosen': verdict.id === snapshot.chosenVerdictId }"
              :disabled="
                !interactive || !canSolve || snapshot.phase === 'RESOLVED'
              "
              @click="solveWith(verdict.id)"
            >
              {{ verdict.label }}
            </button>
          </div>
          <div
            v-if="snapshot.stage === 'reveal'"
            class="case-reveal"
            role="status"
          >
            <span>{{ chosenVerdict?.label ?? "Case resolved" }}</span>
            <p>{{ snapshot.revealText }}</p>
          </div>
        </section>

        <section
          v-if="snapshot.currentHint"
          class="hint-panel"
          aria-live="polite"
        >
          <span>Hint {{ snapshot.hintLevel }}</span>
          <p>{{ snapshot.currentHint }}</p>
        </section>
        <button
          v-if="actions.has('hint')"
          class="hint-action"
          type="button"
          :disabled="!interactive || !canAskHint"
          @click="requestHint"
        >
          Request a hint
        </button>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.mystery-live {
  --ml-panel: rgba(33, 24, 17, 0.94);
  --ml-rule: rgba(167, 122, 72, 0.5);
  display: grid;
  gap: 20px;
  color: var(--case-paper);
  font-family: var(--font-body);
}

.case-heading {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 24px;
  padding: 8px 0 18px;
  border-bottom: 1px solid var(--case-rule-strong);
}

.case-heading-main {
  min-width: 0;
  display: grid;
  gap: 8px;
}

.case-ident {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  color: var(--case-paper-dim);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.case-file-id {
  color: var(--case-gold);
}

.source-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-family: var(--font-body);
  letter-spacing: 0.02em;
  text-transform: none;
}

.status-mark {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--case-alert);
}

.source-status[data-source="live"] .status-mark {
  background: var(--case-confirm);
  box-shadow: 0 0 0 3px rgba(199, 154, 98, 0.14);
}

.case-heading h1 {
  display: block;
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(2rem, 3.6vw, 3.4rem);
  font-weight: 550;
  line-height: 1.02;
  letter-spacing: -0.025em;
  text-wrap: balance;
}

.case-premise {
  max-width: 66ch;
  margin: 0;
  color: var(--case-paper-dim);
  font-size: 0.96rem;
  line-height: 1.55;
}

.case-clock {
  flex: none;
  display: grid;
  gap: 3px;
  min-width: 98px;
  text-align: right;
}

.case-clock span,
.case-clock small {
  color: var(--case-paper-dim);
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.08em;
}

.case-clock strong {
  color: var(--case-gold);
  font-family: var(--font-mono);
  font-size: 1.5rem;
  font-variant-numeric: tabular-nums;
}

.case-clock small {
  font-family: var(--font-body);
  letter-spacing: 0;
}

.case-question {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--case-rule);
}

.case-question p {
  flex: 1;
  margin: 0;
  color: var(--case-paper);
  font-family: var(--font-display);
  font-size: clamp(1.16rem, 2vw, 1.55rem);
  line-height: 1.25;
}

.question-mark {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--case-gold);
  color: var(--case-gold);
  font-family: var(--font-display);
  font-size: 1.15rem;
}

.stage-label {
  flex: none;
  color: var(--case-gold);
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.sample-notice,
.paused-notice,
.command-notice {
  margin: 0;
  padding: 9px 12px;
  border: 1px solid var(--ml-rule);
  color: var(--case-gold);
  background: rgba(217, 182, 129, 0.06);
  font-size: 0.78rem;
  line-height: 1.45;
}

.paused-notice,
.command-notice[data-tone="warn"] {
  border-color: rgba(217, 154, 136, 0.55);
  color: var(--case-alert);
}

.command-notice[data-tone="ok"] {
  border-color: rgba(199, 154, 98, 0.55);
  color: var(--case-confirm);
}

.investigation-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(330px, 0.85fr);
  align-items: start;
  gap: 24px;
}

.visual-column,
.casework-column {
  display: grid;
  gap: 22px;
  min-width: 0;
}

.gallery-scene {
  position: relative;
  min-height: 370px;
  height: clamp(390px, 47vw, 620px);
  overflow: hidden;
  background: #100d0a;
  isolation: isolate;
}

.scene-shade {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    rgba(16, 13, 10, 0.08) 38%,
    rgba(16, 13, 10, 0.82) 100%
  );
}

.scene-label,
.scene-footer,
.scene-hotspot {
  position: absolute;
  z-index: 2;
}

.scene-label {
  top: 18px;
  left: 18px;
  display: grid;
  gap: 3px;
  padding: 8px 11px;
  background: rgba(16, 13, 10, 0.77);
}

.scene-label span {
  color: var(--case-paper-dim);
  font-size: 0.68rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.scene-label strong {
  color: var(--case-paper);
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 500;
}

.scene-hotspot {
  top: 39%;
  left: 35%;
  display: grid;
  place-items: center;
  gap: 7px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--case-paper);
  cursor: pointer;
  text-shadow: 0 1px 8px #100d0a;
}

.scene-hotspot span {
  width: 28px;
  height: 28px;
  border: 1px solid var(--case-gold);
  border-radius: 50%;
  background: rgba(217, 182, 129, 0.12);
  box-shadow: 0 0 0 6px rgba(217, 182, 129, 0.08);
}

.scene-hotspot small {
  padding: 4px 7px;
  background: rgba(16, 13, 10, 0.82);
  font-size: 0.68rem;
}

.scene-hotspot:disabled {
  cursor: default;
  opacity: 0.7;
}

.scene-hotspot:focus-visible,
.evidence-card:focus-visible,
.clue-row:focus-visible,
.timeline-moves button:focus-visible,
.inspect-action:focus-visible,
.zoom-toggle:focus-visible,
.verify-timeline:focus-visible,
.theory-panel button:focus-visible,
.verdict-list button:focus-visible,
.hint-action:focus-visible {
  outline: 2px solid var(--case-gold);
  outline-offset: 3px;
}

.scene-footer {
  right: 18px;
  bottom: 16px;
  left: 18px;
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
}

.scene-footer p {
  max-width: 46ch;
  margin: 0;
  color: var(--case-paper);
  font-family: var(--font-display);
  font-size: clamp(1.1rem, 2.1vw, 1.65rem);
  line-height: 1.2;
  text-wrap: balance;
}

.team-tag {
  flex: none;
  padding: 5px 8px;
  border: 1px solid var(--case-thread);
  color: var(--case-thread);
  font-family: var(--font-mono);
  font-size: 0.66rem;
}

.evidence-board,
.clue-register,
.inspection-panel,
.timeline-panel,
.theory-panel,
.verdict-panel,
.hint-panel {
  min-width: 0;
  padding: 16px 0;
  border-top: 1px solid var(--ml-rule);
}

.section-heading {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 13px;
}

.section-heading h2 {
  margin: 0;
  color: var(--case-paper);
  font-family: var(--font-display);
  font-size: 1.28rem;
  font-weight: 500;
  line-height: 1.2;
}

.section-heading p {
  margin: 4px 0 0;
  color: var(--case-paper-dim);
  font-size: 0.75rem;
  line-height: 1.45;
}

.evidence-count,
.register-count,
.timeline-status {
  flex: none;
  padding-top: 3px;
  color: var(--case-gold);
  font-family: var(--font-mono);
  font-size: 0.65rem;
  font-variant-numeric: tabular-nums;
}

.timeline-status[data-complete="true"] {
  color: var(--case-confirm);
}

.empty-evidence,
.timeline-empty {
  margin: 0;
  padding: 16px 0;
  color: var(--case-paper-dim);
  font-size: 0.8rem;
}

.evidence-rail {
  display: grid;
  grid-auto-columns: minmax(145px, 1fr);
  grid-auto-flow: column;
  gap: 10px;
  overflow-x: auto;
  padding: 2px 2px 8px;
  scrollbar-color: var(--case-rule-strong) var(--case-bg);
  scrollbar-width: thin;
}

.evidence-card {
  display: grid;
  grid-template-rows: 100px 1fr;
  min-width: 0;
  padding: 0;
  border: 1px solid var(--case-rule);
  background: #17110d;
  color: var(--case-paper);
  text-align: left;
  cursor: pointer;
  transition:
    border-color var(--dur-state) ease,
    transform var(--dur-state) var(--ease-out-expo);
}

.evidence-card:hover {
  border-color: var(--case-gold);
  transform: translateY(-2px);
}

.evidence-card.is-selected {
  border-color: var(--case-gold);
  box-shadow: inset 0 0 0 1px var(--case-gold);
}

.evidence-card img {
  display: block;
  width: 100%;
  height: 100px;
  object-fit: cover;
  filter: saturate(0.78);
}

.evidence-card-caption {
  display: grid;
  align-content: start;
  gap: 5px;
  padding: 9px 10px 10px;
}

.evidence-id,
.artifact-view figcaption span {
  color: var(--case-gold);
  font-family: var(--font-mono);
  font-size: 0.61rem;
  letter-spacing: 0.06em;
}

.evidence-card-caption strong {
  color: var(--case-paper);
  font-family: var(--font-display);
  font-size: 0.95rem;
  font-weight: 500;
  line-height: 1.2;
}

.evidence-card-caption small {
  color: var(--case-thread);
  font-size: 0.64rem;
}

.clue-list {
  display: grid;
  border-bottom: 1px solid var(--case-rule);
}

.clue-row {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) auto;
  align-items: center;
  gap: 11px;
  width: 100%;
  padding: 8px 0;
  border: 0;
  border-top: 1px solid var(--case-rule);
  background: transparent;
  color: var(--case-paper);
  text-align: left;
  cursor: pointer;
}

.clue-row.is-current .clue-row-copy strong {
  color: var(--case-gold);
}

.clue-row img {
  display: block;
  width: 72px;
  height: 48px;
  object-fit: cover;
  filter: saturate(0.55) brightness(0.65);
}

.clue-row.is-open img {
  filter: saturate(0.86);
}

.clue-row-copy {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.clue-row-id {
  color: var(--case-paper-dim);
  font-family: var(--font-mono);
  font-size: 0.58rem;
  letter-spacing: 0.08em;
}

.clue-row-copy strong {
  overflow: hidden;
  color: var(--case-paper);
  font-family: var(--font-display);
  font-size: 0.92rem;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.clue-row-state {
  color: var(--case-paper-dim);
  font-size: 0.64rem;
}

.clue-row.is-open .clue-row-state {
  color: var(--case-thread);
}

.casework-column {
  gap: 7px;
  padding: 0 16px 12px;
  border: 1px solid var(--ml-rule);
  background: var(--ml-panel);
}

.inspection-panel,
.timeline-panel,
.theory-panel,
.verdict-panel,
.hint-panel {
  width: 100%;
}

.inspector-heading {
  align-items: center;
}

.zoom-toggle {
  flex: none;
  padding: 5px 8px;
  border: 1px solid var(--case-rule-strong);
  background: transparent;
  color: var(--case-paper-dim);
  font: inherit;
  font-size: 0.68rem;
  cursor: pointer;
}

.zoom-toggle:hover {
  border-color: var(--case-gold);
  color: var(--case-gold);
}

.artifact-view {
  position: relative;
  height: 180px;
  margin: 0;
  overflow: hidden;
  background: #100d0a;
  transition: height 240ms var(--ease-out-expo);
}

.artifact-view.is-zoomed {
  height: 300px;
}

.artifact-view img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.artifact-view figcaption {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: grid;
  gap: 2px;
  padding: 24px 10px 9px;
  background: linear-gradient(transparent, rgba(16, 13, 10, 0.95));
}

.artifact-view figcaption strong {
  color: var(--case-paper);
  font-family: var(--font-display);
  font-size: 0.95rem;
  font-weight: 500;
}

.inspection-copy {
  display: grid;
  gap: 10px;
  padding-top: 12px;
}

.inspection-copy p {
  margin: 0;
  color: var(--case-paper-dim);
  font-size: 0.8rem;
  line-height: 1.55;
}

.inspect-action,
.verify-timeline,
.challenge-action,
.hint-action {
  width: 100%;
  min-height: 40px;
  padding: 9px 12px;
  border: 1px solid var(--case-gold);
  background: var(--case-gold);
  color: var(--case-slip-ink);
  font: inherit;
  font-size: 0.77rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    background-color var(--dur-state) ease,
    color var(--dur-state) ease;
}

.inspect-action:disabled,
.verify-timeline:disabled,
.challenge-action:disabled,
.hint-action:disabled {
  border-color: var(--case-rule);
  background: transparent;
  color: var(--case-paper-dim);
  cursor: not-allowed;
}

.timeline-panel .section-heading {
  align-items: start;
}

.verified-copy {
  color: var(--case-thread) !important;
}

.timeline-list {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: none;
}

.timeline-list li {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) 56px;
  align-items: center;
  gap: 8px;
  min-height: 46px;
  border-top: 1px solid var(--case-rule);
}

.timeline-index {
  color: var(--case-gold);
  font-family: var(--font-mono);
  font-size: 0.64rem;
}

.timeline-list strong {
  color: var(--case-paper);
  font-family: var(--font-display);
  font-size: 0.86rem;
  font-weight: 500;
  line-height: 1.2;
}

.timeline-moves {
  display: flex;
  justify-content: end;
  gap: 4px;
}

.timeline-moves button {
  display: grid;
  place-items: center;
  width: 25px;
  height: 25px;
  padding: 0;
  border: 1px solid var(--case-rule-strong);
  background: transparent;
  color: var(--case-paper);
  cursor: pointer;
}

.timeline-moves button:disabled {
  color: #796b5c;
  opacity: 0.45;
  cursor: default;
}

.timeline-moves svg {
  width: 13px;
  height: 13px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.verify-timeline {
  margin-top: 11px;
}

.preview-caption {
  margin: 8px 0 0;
  color: var(--case-paper-dim);
  font-size: 0.68rem;
  line-height: 1.45;
}

.field-label {
  display: block;
  margin: 10px 0 5px;
  color: var(--case-paper-dim);
  font-size: 0.68rem;
}

.theory-panel select {
  width: 100%;
  min-height: 40px;
  padding: 8px 10px;
  border: 1px solid var(--case-rule-strong);
  border-radius: 0;
  background: var(--case-bg);
  color: var(--case-paper);
  font: inherit;
  font-size: 0.75rem;
}

.theory-panel select:disabled {
  opacity: 0.78;
}

.theory-state {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}

.theory-state > span {
  color: var(--case-lilac);
  font-family: var(--font-mono);
  font-size: 0.61rem;
}

.theory-state button {
  padding: 5px 7px;
  border: 1px solid var(--case-rule-strong);
  background: transparent;
  color: var(--case-paper);
  font: inherit;
  font-size: 0.67rem;
  cursor: pointer;
}

.theory-state button:disabled {
  color: var(--case-paper-dim);
  cursor: not-allowed;
}

.challenge-action {
  margin-top: 10px;
  border-color: var(--case-rule-strong);
  background: transparent;
  color: var(--case-paper);
}

.verdict-list {
  display: grid;
  gap: 7px;
}

.verdict-list button {
  min-height: 42px;
  padding: 9px 11px;
  border: 1px solid var(--case-rule-strong);
  background: transparent;
  color: var(--case-paper);
  font: inherit;
  font-size: 0.78rem;
  text-align: left;
  cursor: pointer;
}

.verdict-list button:hover:not(:disabled),
.verdict-list button.is-chosen {
  border-color: var(--case-gold);
  color: var(--case-gold);
}

.verdict-list button:disabled {
  color: var(--case-paper-dim);
  cursor: not-allowed;
}

.case-reveal {
  margin-top: 12px;
  padding-top: 11px;
  border-top: 1px solid var(--case-rule-strong);
}

.case-reveal span {
  color: var(--case-gold);
  font-family: var(--font-display);
  font-size: 1rem;
}

.case-reveal p {
  margin: 7px 0 0;
  color: var(--case-paper-dim);
  font-size: 0.8rem;
  line-height: 1.55;
}

.hint-panel {
  padding: 12px 0;
  border-bottom: 1px solid var(--ml-rule);
}

.hint-panel span {
  color: var(--case-gold);
  font-family: var(--font-mono);
  font-size: 0.62rem;
  text-transform: uppercase;
}

.hint-panel p {
  margin: 6px 0 0;
  color: var(--case-paper);
  font-size: 0.8rem;
  line-height: 1.5;
}

.hint-action {
  margin-top: 12px;
  border-color: var(--case-rule-strong);
  background: transparent;
  color: var(--case-paper);
}

@media (max-width: 1080px) {
  .investigation-grid {
    grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.9fr);
    gap: 18px;
  }

  .gallery-scene {
    height: clamp(340px, 43vw, 520px);
  }
}

@media (max-width: 820px) {
  .mystery-live {
    gap: 16px;
  }

  .case-heading {
    align-items: start;
  }

  .investigation-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }

  .gallery-scene {
    height: clamp(300px, 62vw, 460px);
  }

  .casework-column {
    padding-inline: 12px;
  }

  .case-clock {
    min-width: 75px;
  }
}

@media (max-width: 520px) {
  .case-heading {
    gap: 10px;
    padding-bottom: 13px;
  }

  .case-heading h1 {
    font-size: clamp(1.75rem, 8vw, 2.35rem);
  }

  .case-premise {
    font-size: 0.82rem;
  }

  .case-ident {
    gap: 8px;
    font-size: 0.57rem;
  }

  .case-clock {
    min-width: 62px;
  }

  .case-clock strong {
    font-size: 1.18rem;
  }

  .case-clock small {
    font-size: 0.55rem;
  }

  .case-question {
    gap: 8px;
  }

  .case-question p {
    font-size: 1.07rem;
  }

  .stage-label {
    font-size: 0.54rem;
  }

  .gallery-scene {
    height: 300px;
    min-height: 0;
  }

  .scene-hotspot {
    top: 36%;
    left: 31%;
  }

  .scene-footer {
    right: 12px;
    bottom: 12px;
    left: 12px;
  }

  .scene-footer p {
    font-size: 1.05rem;
  }

  .evidence-rail {
    grid-auto-columns: minmax(136px, 44vw);
  }

  .clue-row {
    grid-template-columns: 56px minmax(0, 1fr) auto;
    gap: 8px;
  }

  .clue-row img {
    width: 56px;
    height: 40px;
  }

  .clue-row-copy strong {
    max-width: 32vw;
    font-size: 0.83rem;
  }

  .clue-row-state {
    font-size: 0.58rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .evidence-card,
  .artifact-view,
  .inspect-action,
  .verify-timeline,
  .challenge-action,
  .hint-action {
    transition-duration: 1ms;
  }
}
</style>
