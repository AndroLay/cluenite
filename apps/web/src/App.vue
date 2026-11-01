<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { createSfxPlayer, type SfxCue } from "@cluenite/ui";
import type { CommandResult, RoundSnapshot, SessionControl } from "@cluenite/contracts";
import DashboardPanel from "./components/DashboardPanel.vue";
import QuickCaseOverlay from "./components/QuickCaseOverlay.vue";
import { createAmbience } from "./audio/ambience";
import { connectRound, type ConnectionState, type RoundClient } from "./net/roundClient";
import {
  PREVIEW_OBSERVATION,
  PREVIEW_REVEAL,
  createPreviewQuickCase,
  quickCaseFromSnapshot,
  type QuickCaseView,
} from "./quickCase/viewModel";

// Query parameters:
//   (none)                        UI-only preview with placeholder data, no server
//   ?session=<id>                 live overlay for one round, interactive
//   ?session=<id>&view=dashboard  live overlay plus the host command panel
//   ?mode=obs&session=<id>        read-only live overlay on a transparent page for OBS
const params = new URLSearchParams(window.location.search);
const obsMode = params.get("mode") === "obs";
const rawSession = params.get("session");
const sessionId: string | null =
  rawSession !== null && /^[A-Za-z0-9_-]{1,64}$/.test(rawSession) ? rawSession : null;
const liveMode = rawSession !== null;
const dashboardMode = sessionId !== null && !obsMode && params.get("view") === "dashboard";
// A live OBS overlay only shows server state. Its clicks never send commands.
const readOnly = obsMode && liveMode;
const sessionError = liveMode && sessionId === null ? "Invalid session id in the URL." : null;

document.documentElement.classList.toggle("obs-mode", obsMode);

const previewView = ref<QuickCaseView>(createPreviewQuickCase());
const liveView = ref<QuickCaseView | null>(null);
const connection = ref<ConnectionState>(liveMode && sessionId !== null ? "connecting" : "disconnected");
const notice = ref<{ tone: "ok" | "warn"; text: string } | null>(null);
const muted = ref(false);
const sfx = createSfxPlayer();
// Room tone starts on the first gesture on the page. OBS never creates it, so the stream audio is unchanged.
const ambience = obsMode ? null : createAmbience();

// Set only after the server accepts a verdict, or after a preview verdict. Merged into the view below.
const chosenVerdictId = ref<string | null>(null);
const currentView = computed<QuickCaseView | null>(() => {
  const base = liveMode ? liveView.value : previewView.value;
  return base === null ? null : { ...base, chosenVerdictId: chosenVerdictId.value };
});
const connectionBanner = computed<string | null>(() => {
  if (!liveMode || sessionError !== null) return null;
  if (connection.value === "connecting") return "Connecting to server…";
  if (connection.value === "disconnected") return "Disconnected from server — reconnecting";
  return null;
});

// AudioContext needs a user gesture, so every sound-producing handler unlocks first.
function cue(name: SfxCue): void {
  void sfx.unlock().then(() => sfx.play(name));
}

// Counts evidence that was unlocked or linked. Used only to pick a sound cue.
function progressOf(view: QuickCaseView): number {
  return view.clues.reduce(
    (total, clue) => total + (clue.status === "locked" ? 0 : 1) + (clue.status === "linked" ? 1 : 0),
    0,
  );
}

function applySnapshot(snapshot: RoundSnapshot): void {
  const previous = liveView.value;
  const next = quickCaseFromSnapshot(snapshot);
  liveView.value = next;
  if (previous === null) return;
  if (next.stage === "reveal" && previous.stage !== "reveal") cue("reveal");
  else if (progressOf(next) > progressOf(previous)) cue("evidence");
}

// Accepted and already-known results are informational. Everything else is a warning.
function describe(result: CommandResult): string {
  const missing = result.missing.length > 0 ? ` Missing: ${result.missing.join(", ")}.` : "";
  return `${result.code}: ${result.message}${missing}`;
}

function showResult(result: CommandResult | null): void {
  if (result === null) {
    notice.value = { tone: "warn", text: "Not connected. The command was not sent." };
    return;
  }
  notice.value = { tone: result.code.startsWith("ACCEPTED") ? "ok" : "warn", text: describe(result) };
}

const client: RoundClient | null =
  sessionId !== null
    ? connectRound(sessionId, {
        onSnapshot: applySnapshot,
        onConnection: (state) => {
          connection.value = state;
        },
      })
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
  if (view.stage === "observe") view.stage = "connect";
  cue("evidence");
}

function previewLink(clueA: string, clueB: string): void {
  const view = previewView.value;
  const picked = view.clues.filter(
    (clue) => (clue.id === clueA || clue.id === clueB) && clue.status === "unlocked",
  );
  if (view.stage !== "connect" || picked.length !== 2) return;
  for (const clue of picked) clue.status = "linked";
  view.stage = "challenge";
  cue("evidence");
}

function previewVerdict(verdictId: string): void {
  const view = previewView.value;
  if (view.stage !== "challenge" || !view.verdicts.some((verdict) => verdict.id === verdictId)) return;
  view.stage = "reveal";
  view.revealText = PREVIEW_REVEAL;
  chosenVerdictId.value = verdictId;
  cue("reveal");
}

function onInspect(clueId: string): void {
  if (readOnly) return;
  if (client !== null) void sendCommand(`!inspect ${clueId}`);
  else previewInspect(clueId);
}

function onLink(clueA: string, clueB: string): void {
  if (readOnly) return;
  if (client !== null) void sendCommand(`!link ${clueA} ${clueB}`);
  else previewLink(clueA, clueB);
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
  <main class="shell" :class="{ 'is-obs': obsMode }">
    <header v-if="!obsMode" class="masthead">
      <h1>
        <svg class="mark" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="10" cy="10" r="6.5" />
          <path d="M14.8 14.8 20.5 20.5" />
        </svg>
        Cluenite
      </h1>
      <p class="intro">Periksa petunjuk, hubungkan fakta, lalu buktikan teorimu bersama komunitas.</p>
      <p class="meta">SOCIAL DETECTIVE GAME</p>

      <p v-if="!liveMode" class="banner note" role="note">
        PRATINJAU UI — data simulasi, bukan chat Twitch dan bukan hasil verifikasi engine
      </p>
    </header>

    <div class="board">
      <p v-if="sessionError" class="banner" role="alert">{{ sessionError }}</p>
      <p v-else-if="connectionBanner" class="banner" role="status">{{ connectionBanner }}</p>

      <DashboardPanel
        v-if="dashboardMode"
        :session-id="sessionId ?? ''"
        :connection="connection"
        :paused="liveView?.paused ?? false"
        :notice="notice"
        @command="sendCommand"
        @control="sendControl"
      />

      <QuickCaseOverlay
        v-if="currentView"
        :view="currentView"
        :muted="muted"
        :obs="obsMode"
        @inspect="onInspect"
        @link="onLink"
        @verdict="onVerdict"
        @toggle-mute="onToggleMute"
      />
      <p v-else-if="!obsMode" class="status">Waiting for the round…</p>

      <button v-if="!obsMode && !liveMode" type="button" class="reset" @click="onReset">Reset pratinjau</button>
    </div>
  </main>
</template>

<style scoped>
/* Case-file layout: masthead on the left, evidence board on the right from 960px.
   Single column below that. OBS mode drops all chrome and keeps only the board. */
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
  font-size: clamp(3.25rem, 10vw, 6rem);
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

.banner {
  box-sizing: border-box;
  width: 100%;
  margin: 0;
  padding: 10px 14px;
  border: 1px solid rgba(240, 132, 126, 0.55);
  border-radius: var(--radius-slip);
  background: rgba(240, 132, 126, 0.08);
  color: var(--case-alert);
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.5;
  letter-spacing: 0.01em;
}
.banner.note {
  border-color: rgba(245, 190, 112, 0.5);
  background: rgba(245, 190, 112, 0.08);
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

@media (min-width: 960px) {
  .shell:not(.is-obs) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 600px);
    column-gap: clamp(40px, 6vw, 96px);
    align-items: start;
    width: 100%;
    max-width: 1240px;
    margin: 0 auto;
  }
  .masthead {
    grid-column: 1;
    grid-row: 1;
    position: sticky;
    top: 40px;
  }
  .board {
    grid-column: 2;
    grid-row: 1;
  }
}
</style>
