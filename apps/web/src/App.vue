<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { createSfxPlayer, type SfxCue } from "@cluenite/ui";
import type { CommandResult, RoundSnapshot, SessionControl } from "@cluenite/contracts";
import DashboardPanel from "./components/DashboardPanel.vue";
import QuickCaseOverlay from "./components/QuickCaseOverlay.vue";
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

const currentView = computed<QuickCaseView | null>(() => (liveMode ? liveView.value : previewView.value));
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

function onVerdict(verdictId: string): void {
  if (readOnly) return;
  if (client !== null) void sendCommand(`!solve ${verdictId}`);
  else previewVerdict(verdictId);
}

function onToggleMute(): void {
  muted.value = !muted.value;
  sfx.setMuted(muted.value);
  void sfx.unlock();
}

function onReset(): void {
  previewView.value = createPreviewQuickCase();
}

onBeforeUnmount(() => {
  document.documentElement.classList.remove("obs-mode");
  client?.close();
  sfx.dispose();
});
</script>

<template>
  <main class="shell" :class="{ 'is-obs': obsMode }">
    <template v-if="!obsMode">
      <p class="eyebrow">SOCIAL DETECTIVE GAME</p>
      <h1>Cluenite</h1>
      <p class="intro">Periksa petunjuk, hubungkan fakta, lalu buktikan teorimu bersama komunitas.</p>

      <p v-if="!liveMode" class="banner" role="note">
        PRATINJAU UI — data simulasi, bukan chat Twitch dan bukan hasil verifikasi engine
      </p>
    </template>

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
  </main>
</template>

<style scoped>
.shell {
  box-sizing: border-box;
  min-height: 100vh;
  display: grid;
  gap: 16px;
  align-content: start;
  justify-items: center;
  padding: 32px 16px;
  background: var(--ink-900);
  color: var(--paper-100);
  font-family: var(--font-sans);
  text-align: center;
}

/* OBS mode: no page chrome, transparent background, overlay pinned top-left. */
.shell.is-obs {
  min-height: 0;
  justify-items: start;
  align-content: start;
  padding: 0;
  background: transparent;
  text-align: left;
}

.banner {
  max-width: 600px;
  margin: 0;
  padding: 8px 12px;
  border: 1px dashed var(--warning-coral);
  border-radius: var(--radius-sm);
  color: var(--warning-coral);
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.status {
  margin: 0;
  color: var(--paper-100);
  font-size: 0.9375rem;
}

.reset {
  border: 1px solid var(--ink-700);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  background: var(--ink-800);
  color: var(--paper-100);
  font: inherit;
  font-size: 0.8125rem;
  cursor: pointer;
}
.reset:focus-visible {
  outline: 2px solid var(--clue-gold);
  outline-offset: 2px;
}
</style>
