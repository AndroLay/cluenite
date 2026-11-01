<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, ref } from "vue";
import { createSfxPlayer, type SfxCue } from "@cluenite/ui";
import type {
  CommandResult,
  ConnectionStatus,
  RoundSnapshot,
  SessionControl,
} from "@cluenite/contracts";
import DashboardPanel from "./components/DashboardPanel.vue";
import QuickCaseOverlay from "./components/QuickCaseOverlay.vue";
import TwitchConnectionStatus from "./components/TwitchConnectionStatus.vue";
import { createAmbience } from "./audio/ambience";
import { siteSettings } from "./site/settings";
import {
  connectRound,
  type ConnectionState,
  type RoundClient,
} from "./net/roundClient";
import {
  PREVIEW_HINT,
  PREVIEW_OBSERVATION,
  PREVIEW_REVEAL,
  createPreviewQuickCase,
  quickCaseFromSnapshot,
  type QuickCaseView,
} from "./quickCase/viewModel";
import { M01_PREVIEW_SNAPSHOT } from "./mysteryLive/previewSnapshot";
const MysteryLiveBoard = defineAsyncComponent(
  () => import("./components/MysteryLiveBoard.vue"),
);

// Query parameters:
//   (none)                        Mystery Live sample investigation
//   ?view=quick                   Quick Case sample
//   ?session=<id>                 live experience selected from the server snapshot
//   ?session=<id>&view=dashboard  live experience plus the host command panel
//   ?mode=obs&session=<id>        read-only Quick Case overlay for OBS
const params = new URLSearchParams(window.location.search);
const obsMode = params.get("mode") === "obs";
const rawSession = params.get("session");
const sessionId: string | null =
  rawSession !== null && /^[A-Za-z0-9_-]{1,64}$/.test(rawSession)
    ? rawSession
    : null;
const liveMode = rawSession !== null;
const dashboardMode =
  sessionId !== null && !obsMode && params.get("view") === "dashboard";
const quickSurface = params.get("view") === "quick";
const quickHref = sessionId
  ? `/?session=${encodeURIComponent(sessionId)}&view=quick`
  : "/?view=quick";
const mysteryHref = sessionId
  ? `/?session=${encodeURIComponent(sessionId)}`
  : "/?view=mystery";
const dashboardHref = sessionId
  ? `/?session=${encodeURIComponent(sessionId)}&view=dashboard`
  : "/play";
// A live OBS overlay only shows server state. Its clicks never send commands.
const readOnly = obsMode && liveMode;
const sessionError =
  liveMode && sessionId === null ? "Invalid session id in the URL." : null;

document.documentElement.classList.toggle("obs-mode", obsMode);

const previewView = ref<QuickCaseView>(createPreviewQuickCase());
const liveView = ref<QuickCaseView | null>(null);
const liveSnapshot = ref<RoundSnapshot | null>(null);
const connection = ref<ConnectionState>(
  liveMode && sessionId !== null ? "connecting" : "disconnected",
);
const twitchConnection = ref<ConnectionStatus | null>(null);
const notice = ref<{ tone: "ok" | "warn"; text: string } | null>(null);
const muted = ref(!siteSettings.soundOn);
const sfx = createSfxPlayer();
// Room tone starts on the first gesture on the page. OBS never creates it, so the stream audio is unchanged.
const ambience = obsMode ? null : createAmbience();
sfx.setMuted(muted.value);
ambience?.setMuted(muted.value);

// Set only after the server accepts a verdict, or after a preview verdict. The server snapshot
// carries the same value, which is what OBS reads; the local pick covers the page that sent it.
const chosenVerdictId = ref<string | null>(null);
const currentView = computed<QuickCaseView | null>(() => {
  const base = liveMode ? liveView.value : previewView.value;
  return base === null
    ? null
    : {
        ...base,
        chosenVerdictId: chosenVerdictId.value ?? base.chosenVerdictId,
      };
});
const currentMysterySnapshot = computed<RoundSnapshot | null>(() =>
  liveMode ? liveSnapshot.value : M01_PREVIEW_SNAPSHOT,
);
const mysterySurface = computed(
  () =>
    !obsMode &&
    !quickSurface &&
    (!liveMode ||
      liveSnapshot.value?.caseMode === "mystery" ||
      liveSnapshot.value?.caseMode === "coop"),
);
const connectionBanner = computed<string | null>(() => {
  if (!liveMode || sessionError !== null) return null;
  if (connection.value === "connecting") return "Connecting to server…";
  if (connection.value === "disconnected")
    return "Disconnected from server — reconnecting";
  return null;
});

// AudioContext needs a user gesture, so every sound-producing handler unlocks first.
function cue(name: SfxCue): void {
  void sfx.unlock().then(() => sfx.play(name));
}

// Counts evidence that was unlocked or linked. Used only to pick a sound cue.
function progressOf(view: QuickCaseView): number {
  return view.clues.reduce(
    (total, clue) =>
      total +
      (clue.status === "locked" ? 0 : 1) +
      (clue.status === "linked" ? 1 : 0),
    0,
  );
}

function applySnapshot(snapshot: RoundSnapshot): void {
  const previous = liveView.value;
  liveSnapshot.value = snapshot;
  const next = quickCaseFromSnapshot(snapshot);
  liveView.value = next;
  if (previous === null) return;
  if (next.stage === "reveal" && previous.stage !== "reveal") cue("reveal");
  else if (progressOf(next) > progressOf(previous)) cue("evidence");
}

// Accepted and already-known results are informational. Everything else is a warning.
function describe(result: CommandResult): string {
  const missing =
    result.missing.length > 0 ? ` Missing: ${result.missing.join(", ")}.` : "";
  return `${result.code}: ${result.message}${missing}`;
}

function showResult(result: CommandResult | null): void {
  if (result === null) {
    notice.value = {
      tone: "warn",
      text: "Not connected. The command was not sent.",
    };
    return;
  }
  notice.value = {
    tone: result.code.startsWith("ACCEPTED") ? "ok" : "warn",
    text: describe(result),
  };
}

const client: RoundClient | null =
  sessionId !== null
    ? connectRound(
        sessionId,
        {
          onSnapshot: applySnapshot,
          onConnection: (state) => {
            connection.value = state;
            if (state !== "connected") twitchConnection.value = null;
          },
          onConnectionStatus: (status) => {
            twitchConnection.value = status;
          },
        },
        { requireOverlay: obsMode },
      )
    : null;

async function sendCommand(text: string): Promise<void> {
  if (client === null) return;
  showResult(await client.submit(text));
}

async function sendControl(action: SessionControl["action"]): Promise<void> {
  if (client === null) return;
  showResult(await client.control(action));
}

// Preview handlers change presentation state only. Nothing here checks proof, and the
// reveal text is a placeholder until the server engine supplies verified text.
function previewInspect(clueId: string): void {
  const view = previewView.value;
  const clue = view.clues.find((item) => item.id === clueId);
  if (!clue || clue.status !== "locked") return;
  clue.status = "unlocked";
  clue.observation = PREVIEW_OBSERVATION;
  const evidenceByClue: Record<string, { id: string; label: string }[]> = {
    CAM: [{ id: "CAM_R07", label: "Tag R-07 on low object" }],
    // ACCESS is a narrative clue only in Q01; it unlocks no evidence and is not linkable.
    ACCESS: [],
    SCHEDULE: [{ id: "SCHEDULE_R07", label: "Robot R-07 active window" }],
  };
  for (const item of evidenceByClue[clueId] ?? []) {
    if (!view.evidence.some((evidence) => evidence.id === item.id)) {
      view.evidence.push({ ...item, team: null, shared: false });
    }
  }
  if (view.stage === "observe") view.stage = "connect";
  cue("evidence");
}

function previewLink(evidenceA: string, evidenceB: string): void {
  const view = previewView.value;
  const picked = view.evidence.filter(
    (item) => item.id === evidenceA || item.id === evidenceB,
  );
  if (view.stage !== "connect" || picked.length !== 2) return;
  for (const item of picked) {
    const clueId =
      item.id === "CAM_R07"
        ? "CAM"
        : item.id === "SCHEDULE_R07"
          ? "SCHEDULE"
          : null;
    const clue = clueId
      ? view.clues.find((candidate) => candidate.id === clueId)
      : null;
    if (clue) clue.status = "linked";
  }
  view.stage = "challenge";
  cue("evidence");
}

function previewVerdict(verdictId: string): void {
  const view = previewView.value;
  if (
    view.stage !== "challenge" ||
    !view.verdicts.some((verdict) => verdict.id === verdictId)
  )
    return;
  view.stage = "reveal";
  view.revealText = PREVIEW_REVEAL;
  chosenVerdictId.value = verdictId;
  cue("reveal");
}

// Clue IDs go to "look". Link takes two evidence IDs (for example CAM_R07 SCHEDULE_R07), not clue IDs.
function onInspect(clueId: string): void {
  if (readOnly) return;
  if (client !== null) void sendCommand(`!look ${clueId}`);
  else previewInspect(clueId);
}

function onLink(evidenceA: string, evidenceB: string): void {
  if (readOnly) return;
  if (client !== null) void sendCommand(`!link ${evidenceA} ${evidenceB}`);
  else previewLink(evidenceA, evidenceB);
}

function previewHint(): void {
  const view = previewView.value;
  if (!view.availableActions.includes("hint")) return;
  view.currentHint = PREVIEW_HINT;
  view.hintLevel += 1;
  // The preview has one hint. A server snapshot would drop "hint" once hints run out.
  view.availableActions = view.availableActions.filter((action) => action !== "hint");
  cue("evidence");
}

function onHint(): void {
  if (readOnly) return;
  if (client !== null) void sendCommand("!hint");
  else previewHint();
}

async function onVerdict(verdictId: string): Promise<void> {
  if (readOnly) return;
  if (client === null) {
    previewVerdict(verdictId);
    return;
  }
  const result = await client.submit(`!solve ${verdictId}`);
  showResult(result);
  // A rejected verdict is not remembered, so the reveal never names a pick the server refused.
  if (result?.code.startsWith("ACCEPTED")) chosenVerdictId.value = verdictId;
}

function onToggleMute(): void {
  muted.value = !muted.value;
  siteSettings.soundOn = !muted.value;
  sfx.setMuted(muted.value);
  ambience?.setMuted(muted.value);
  void sfx.unlock();
}

function onReset(): void {
  previewView.value = createPreviewQuickCase();
  chosenVerdictId.value = null;
}

onBeforeUnmount(() => {
  document.documentElement.classList.remove("obs-mode");
  client?.close();
  sfx.dispose();
  ambience?.dispose();
});
</script>

<template>
  <main
    class="shell"
    :class="{ 'is-obs': obsMode }"
  >
    <header
      v-if="!obsMode"
      class="topbar"
    >
      <a
        class="brand"
        :href="mysteryHref"
        aria-label="Cluenite home"
      >
        <svg
          class="mark"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            cx="10"
            cy="10"
            r="6.5"
          />
          <path d="M14.8 14.8 20.5 20.5" />
        </svg>
        <span>Cluenite</span>
      </a>
      <nav
        class="primary-nav"
        aria-label="Game modes"
      >
        <a
          :href="mysteryHref"
          :aria-current="mysterySurface ? 'page' : undefined"
        >Mystery Live</a>
        <a
          :href="quickHref"
          :aria-current="quickSurface ? 'page' : undefined"
        >Quick Case</a>
        <a
          v-if="liveMode && !obsMode"
          :href="dashboardHref"
        >Host controls</a>
      </nav>
      <div class="topbar-status">
        <span
          v-if="!liveMode"
          class="sample-indicator"
        ><i aria-hidden="true" /> Sample investigation</span>
        <TwitchConnectionStatus
          v-if="liveMode && connection === 'connected'"
          :status="twitchConnection"
          :pending="twitchConnection === null"
        />
      </div>
    </header>

    <div class="board">
      <p
        v-if="sessionError"
        class="banner"
        role="alert"
      >
        {{ sessionError }}
      </p>
      <p
        v-else-if="connectionBanner"
        class="banner"
        role="status"
      >
        {{ connectionBanner }}
      </p>
      <DashboardPanel
        v-if="dashboardMode"
        :session-id="sessionId ?? ''"
        :connection="connection"
        :paused="liveView?.paused ?? false"
        :notice="notice"
        @command="sendCommand"
        @control="sendControl"
      />

      <MysteryLiveBoard
        v-if="mysterySurface && currentMysterySnapshot"
        :snapshot="currentMysterySnapshot"
        :interactive="liveMode && connection === 'connected' && !readOnly"
        :connection="connection"
        :notice="notice"
        @command="sendCommand"
      />
      <QuickCaseOverlay
        v-else-if="currentView"
        :view="currentView"
        :muted="muted"
        :obs="obsMode"
        :notice="notice"
        @inspect="onInspect"
        @link="onLink"
        @verdict="onVerdict"
        @hint="onHint"
        @toggle-mute="onToggleMute"
      />
      <p
        v-else-if="!obsMode"
        class="status"
      >
        Waiting for the round…
      </p>

      <button
        v-if="!obsMode && !liveMode && quickSurface"
        type="button"
        class="reset"
        @click="onReset"
      >
        Reset preview
      </button>
    </div>
  </main>
</template>

<style scoped>
/* Scene first: the evidence board is the main column. From 1240px the masthead becomes a compact
   spine beside it; below that the masthead stacks above the board. OBS mode drops all chrome. */
.shell {
  box-sizing: border-box;
  min-height: 100vh;
  display: grid;
  gap: 32px;
  align-content: start;
  justify-items: start;
  padding: 40px clamp(16px, 5vw, 64px) 56px;
  color: var(--case-paper);
  font-family: var(--font-body);
}

/* OBS mode: no page chrome, transparent background, board pinned to the top-left. */
.shell.is-obs {
  min-height: 0;
  gap: 0;
  padding: 0;
  background: transparent;
}

.masthead {
  display: grid;
  gap: 16px;
  width: 100%;
  max-width: 540px;
}

.masthead::before {
  content: "";
  display: block;
  width: 44px;
  height: 3px;
  background: var(--case-amber);
}

h1 {
  display: flex;
  align-items: center;
  gap: 0.16em;
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(2.75rem, 6vw, 3.25rem);
  font-weight: 600;
  line-height: 0.9;
  letter-spacing: -0.04em;
  color: var(--case-paper);
}

/* Logo mark: a gold magnifier beside the wordmark. Stroke only, sized to the cap height. */
.mark {
  flex: none;
  width: 0.62em;
  height: 0.62em;
  fill: none;
  stroke: var(--case-amber);
  stroke-width: 2;
  stroke-linecap: round;
}

.intro {
  margin: 0;
  max-width: 34ch;
  font-size: 1.0625rem;
  line-height: 1.6;
  color: var(--case-paper-dim);
  text-wrap: pretty;
}

.meta {
  margin: 4px 0 0;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  color: var(--case-amber);
}
.meta::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--case-rule-strong);
}

.board {
  box-sizing: border-box;
  width: min(100%, 600px);
  display: grid;
  gap: 16px;
  justify-items: start;
}
.board > * {
  max-width: 100%;
}

/* One authored motion moment: on load the evidence board rises into the lamp light.
   Skipped in OBS, where the browser source must stay still. Reduced motion is handled globally. */
@keyframes board-rise {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.shell:not(.is-obs) .board {
  animation: board-rise 900ms var(--ease-out-expo) both;
}

.banner {
  box-sizing: border-box;
  width: 100%;
  margin: 0;
  padding: 10px 14px;
  border: 1px solid rgba(217, 154, 136, 0.55);
  border-radius: var(--radius-slip);
  background: rgba(217, 154, 136, 0.08);
  color: var(--case-alert);
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.5;
  letter-spacing: 0.01em;
}
.banner.note {
  border-color: rgba(217, 182, 129, 0.5);
  background: rgba(217, 182, 129, 0.08);
  color: var(--case-amber);
}
.banner[role="status"] {
  border-color: var(--case-rule-strong);
  background: transparent;
  color: var(--case-paper-dim);
}

.status {
  margin: 0;
  color: var(--case-paper-dim);
  font-size: 0.9375rem;
}

.reset {
  appearance: none;
  padding: 8px 14px;
  border: 1px solid var(--case-rule-strong);
  border-radius: var(--radius-slip);
  background: transparent;
  color: var(--case-paper-dim);
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    border-color var(--dur-state) ease,
    color var(--dur-state) ease;
}
.reset:hover {
  border-color: var(--case-paper-dim);
  color: var(--case-paper);
}
.reset:focus-visible {
  outline: 2px solid var(--case-amber);
  outline-offset: 3px;
}

/* Scene first. From 960px the board grows to 880px so the scene is the largest element on the page.
   From 1240px the masthead is a fixed 340px spine beside the board (the wordmark needs about 310px at
   the 3.25rem cap); the board takes the rest of the row, up to a 1400px shell. */
@media (min-width: 960px) {
  .shell:not(.is-obs) .board {
    width: min(100%, 880px);
  }
}
@media (min-width: 1240px) {
  .shell:not(.is-obs) {
    grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
    column-gap: clamp(32px, 4vw, 64px);
    align-items: start;
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
  }
  .masthead {
    grid-column: 1;
    grid-row: 1;
    max-width: none;
  }
  .shell:not(.is-obs) .board {
    grid-column: 2;
    grid-row: 1;
    width: 100%;
  }
}

/* Current Mystery Live composition: compact brand/navigation above a full-width investigation. */
.shell:not(.is-obs) {
  grid-template-columns: minmax(0, 1fr);
  width: 100%;
  max-width: none;
  gap: 24px;
  padding: 0 clamp(16px, 3.2vw, 52px) 48px;
}

.topbar {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 30px;
  width: 100%;
  min-height: 76px;
  border-bottom: 1px solid rgba(167, 122, 72, 0.42);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  flex: none;
  color: var(--case-paper);
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 650;
  letter-spacing: -0.03em;
  text-decoration: none;
}

.brand .mark {
  flex: none;
  width: 1.05em;
  height: 1.05em;
  fill: none;
  stroke: var(--case-amber);
  stroke-width: 1.8;
  stroke-linecap: round;
}

.primary-nav {
  display: flex;
  align-items: stretch;
  align-self: stretch;
  gap: clamp(14px, 2.2vw, 32px);
}

.primary-nav a {
  display: inline-flex;
  position: relative;
  align-items: center;
  padding: 2px 0;
  color: var(--case-paper-dim);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-decoration: none;
  text-transform: uppercase;
  white-space: nowrap;
}

.primary-nav a:hover,
.primary-nav a[aria-current="page"] {
  color: var(--case-gold);
}

.primary-nav a[aria-current="page"]::after {
  content: "";
  position: absolute;
  inset-inline: 0;
  bottom: -29px;
  height: 2px;
  background: var(--case-gold);
}

.topbar-status {
  display: flex;
  justify-content: flex-end;
  margin-left: auto;
  min-width: 0;
}

.sample-indicator {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--case-paper-dim);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.sample-indicator i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--case-amber);
}

.shell:not(.is-obs) .board {
  grid-column: 1;
  grid-row: auto;
  width: min(100%, 1720px);
  margin-inline: auto;
  justify-items: stretch;
  animation-duration: 700ms;
}

@media (max-width: 760px) {
  .shell:not(.is-obs) {
    gap: 16px;
    padding-inline: 14px;
  }

  .topbar {
    flex-wrap: wrap;
    gap: 0 20px;
    min-height: 0;
    padding-top: 15px;
  }

  .brand {
    font-size: 1.2rem;
  }

  .primary-nav {
    order: 3;
    width: 100%;
    min-height: 42px;
    gap: 22px;
    overflow-x: auto;
  }

  .primary-nav a[aria-current="page"]::after {
    bottom: -13px;
  }

  .sample-indicator {
    font-size: 0.625rem;
  }
}

@media (max-width: 430px) {
  .topbar-status :deep(.connection-status) {
    padding: 6px 8px;
    font-size: 0.6875rem;
  }
}
</style>
