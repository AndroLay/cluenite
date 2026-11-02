<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref } from "vue";
import { ApiError, apiMessage } from "../net/api";
import SessionList from "./SessionList.vue";
import CaseSwitchNotice from "./CaseSwitchNotice.vue";
import type { SessionSummary } from "@cluenite/contracts";
import { listSessions, sessionHref } from "./sessions";
import { launchSession, newSessionLaunch, type SessionLaunchAttempt } from "./sessionLaunch";
import GameShell from "./GameShell.vue";
import SiteIcon from "./SiteIcon.vue";
import type { SiteIconName } from "./icons";
import { account, checkAccount, TWITCH_START } from "./account";
import { playUi } from "./uiSound";
import modeQuick from "../assets/mystery-live/museum-gallery.png";
import modeMic from "../assets/mystery-live/museum-gallery.png";
import modeCoop from "../assets/investigation/offshore-observatory-v1.png";
import manuscriptStudy from "./landing/manuscript-study.jpg";

// The practice cards draw a strip of each board case's living scene. It loads after the page, so the case list
// never waits on it.
const BoardScene = defineAsyncComponent(() => import("./BoardScene.vue"));
interface PracticeCase {
  mode: string;
  title: string;
  pitch: string;
  tags: readonly string[];
  href: string;
  cta: string;
  scene?: "express" | "lighthouse";
  image?: string;
}
const PRACTICE: readonly PracticeCase[] = [
  {
    mode: "Quick Case",
    title: "Pearls on the Night Express",
    pitch: "Ninety seconds of darkness in a tunnel. Chat votes on which clue to turn while you link the cards and break a lie.",
    tags: ["About 3 minutes", "Chat votes", "One streamer"],
    href: "/practice/express",
    cta: "Play",
    scene: "express",
  },
  {
    mode: "Mystery Live",
    title: "A Missing Manuscript",
    pitch: "Search a stormy study while chat calls grid cells, link the evidence, order the timeline, and name who took it.",
    tags: ["About 8 minutes", "Hidden-object search", "Scripted chat"],
    href: "/?view=quick",
    cta: "Play",
    image: manuscriptStudy,
  },
  {
    mode: "Co-op",
    title: "The Lighthouse Went Dark",
    pitch: "Two streamers, two chats. You hold the lighthouse, Ines holds the harbour files. Trade cards to prove who wrecked the Marigold.",
    tags: ["About 4 minutes", "Two stations", "Card trading"],
    href: "/practice/lighthouse",
    cta: "Play co-op",
    scene: "lighthouse",
  },
];

// Case select (/play). Cases come from GET /api/cases; starting one sends POST /api/sessions with the CSRF token
// from GET /api/me and a fresh Idempotency-Key, then opens the host panel. Nothing starts without a confirmed
// Twitch sign-in, and co-op cases start from an invitation, not from here.

interface CaseSummary {
  id: string;
  mode: string;
  title: string;
  premise: string;
  question: string;
  clues: { id: string; label: string }[];
  verdicts: { id: string; label: string }[];
}

type CasesState = "loading" | "ready" | "empty" | "error";
type ModeId = "quick" | "mystery" | "coop";

const MODES: readonly { id: ModeId; label: string; detail: string; icon: SiteIconName; art: string }[] = [
  { id: "quick", label: "Quick Case", detail: "A short case for a stream break.", icon: "search", art: modeQuick },
  { id: "mystery", label: "Mystery Live", detail: "A longer round your chat drives.", icon: "chat", art: modeMic },
  { id: "coop", label: "Co-op", detail: "Two streamers, one case.", icon: "people", art: modeCoop },
];
const NETWORK_ERROR = "Cannot reach the server. Check that it is running, then retry.";

const cases = ref<CaseSummary[]>([]);
const casesState = ref<CasesState>("loading");
const casesError = ref("");
const activeMode = ref<ModeId>("quick");
const query = ref("");
const startingId = ref<string | null>(null);
const startError = ref("");
const openHostedSession = ref<SessionSummary | null>(null);
function onSessionsLoaded(rows: SessionSummary[]): void { openHostedSession.value = rows.find(row => row.role === "host" && !row.needsRejoin) ?? null; }
const savedSessions = ref<InstanceType<typeof SessionList> | null>(null);
const startAttempts = new Map<string, SessionLaunchAttempt>();
const pendingSwitch = ref<{ current: SessionSummary; next: CaseSummary; attempt: SessionLaunchAttempt | null } | null>(null);

const modeCases = computed(() => cases.value.filter((item) => item.mode === activeMode.value));
const visibleCases = computed(() => {
  const needle = query.value.trim().toLowerCase();
  if (!needle) return modeCases.value;
  return modeCases.value.filter(
    (item) => item.title.toLowerCase().includes(needle) || item.premise.toLowerCase().includes(needle),
  );
});
const modeArt = computed(() => MODES.find((mode) => mode.id === activeMode.value)?.art ?? modeQuick);
const signedIn = computed(() => account.state.kind === "signed-in");
const csrf = computed(() => (account.state.kind === "signed-in" ? account.state.csrf : ""));
const canStart = computed(() => signedIn.value && csrf.value !== "" && startingId.value === null);
const twitchStep = computed(() => {
  const state = account.state;
  if (state.kind === "checking") return { state: "wait", text: "Checking Twitch…" };
  if (state.kind === "signed-in") return { state: "done", text: `Signed in as ${state.name}` };
  if (state.kind === "unreachable") return { state: "error", text: "Server not reachable" };
  return { state: "todo", text: "Connect Twitch to start live cases" };
});

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

async function readBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isCaseSummary(value: unknown): value is CaseSummary {
  const item = record(value);
  return (
    item !== null &&
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.mode === "string" &&
    Array.isArray(item.clues) &&
    Array.isArray(item.verdicts)
  );
}

async function loadCases(): Promise<void> {
  casesState.value = "loading";
  casesError.value = "";
  try {
    const response = await fetch("/api/cases", { credentials: "same-origin", headers: { Accept: "application/json" } });
    const body = await readBody(response);
    if (!response.ok) {
      casesState.value = "error";
      casesError.value = `The case list did not load (server responded ${response.status}).`;
      return;
    }
    const list = record(body)?.cases;
    cases.value = Array.isArray(list) ? list.filter(isCaseSummary) : [];
    casesState.value = cases.value.length === 0 ? "empty" : "ready";
  } catch {
    casesState.value = "error";
    casesError.value = NETWORK_ERROR;
  }
}

function retryAll(): void {
  void loadCases();
  void checkAccount(true);
}

function describeStartError(status: number, code: string): string {
  if (code === "case_launch_ended") return "That case has already ended. Choose a case again to create a new round.";
  if (code === "case_stop_not_accepted") return "The current case could not be stopped. No new case was started. Retry switching, or continue the current case.";
  if (code === "idempotency_conflict") return "Another hosted case is still open. Continue it from Saved sessions, or stop it in its host controls before choosing a different case.";
  if (status === 401) return "Your Twitch session ended. Connect Twitch again, then start the case.";
  if (status === 403 && code === "origin_rejected") {
    return "The server refused the request because it came from another address. Open Cluenite from its own address.";
  }
  if (status === 403 && code === "csrf_rejected") return "The page is out of date. Reload it, then start the case again.";
  if (status === 403) return "The server refused the request. Reload the page, then try again.";
  if (status === 404) return "This case is no longer on the server. Reload the list and pick another.";
  if (status === 409) return "The server is still starting a case. Wait a moment, then try again.";
  if (status === 400) return "The server did not accept the start request. Reload the page and try again.";
  if (status >= 500) return "The server could not create the round. Try again, or check the server log.";
  return `The case did not start (server responded ${status}). Try again.`;
}

async function startCase(caseItem: CaseSummary): Promise<void> {
  if (!canStart.value || caseItem.mode === "coop" || pendingSwitch.value?.attempt) return;
  playUi("select");
  startingId.value = caseItem.id;
  startError.value = "";
  try {
    const current = (await listSessions()).find(row => row.role === "host" && !row.needsRejoin) ?? null;
    openHostedSession.value = current;
    if (current && current.caseId !== caseItem.id) {
      pendingSwitch.value = { current, next: caseItem, attempt: null };
      startingId.value = null;
      return;
    }
    pendingSwitch.value = null;
    if (current) { window.location.assign(sessionHref(current)); return; }
    const attempt = startAttempts.get(caseItem.id) ?? newSessionLaunch(caseItem.id);
    startAttempts.set(caseItem.id, attempt);
    const snapshot = await launchSession(attempt, csrf.value);
    startAttempts.delete(caseItem.id);
    window.location.assign(`/?session=${encodeURIComponent(snapshot.sessionId)}`);
  } catch (cause) {
    await startFailed(cause, caseItem);
  }
}

async function switchCase(): Promise<void> {
  const choice = pendingSwitch.value;
  if (!canStart.value || !choice) return;
  startingId.value = choice.next.id;
  startError.value = "";
  choice.attempt ??= newSessionLaunch(choice.next.id, choice.current.sessionId);
  try {
    const snapshot = await launchSession(choice.attempt, csrf.value);
    window.location.assign(`/?session=${encodeURIComponent(snapshot.sessionId)}`);
  } catch (cause) {
    if (choice.attempt.stopConfirmed) { openHostedSession.value = null; void savedSessions.value?.reload(); }
    await startFailed(cause, choice.next);
  }
}

async function startFailed(cause: unknown, next: CaseSummary): Promise<void> {
    if (cause instanceof ApiError && cause.code === "case_launch_ended") {
      startAttempts.delete(next.id);
      pendingSwitch.value = null;
    }
    // Another tab may create a round between discovery and creation. A different
    // round always needs its own explicit stop confirmation.
    if (cause instanceof ApiError && cause.code === "idempotency_conflict") {
      try {
        const current = (await listSessions()).find(row => row.role === "host" && !row.needsRejoin) ?? null;
        openHostedSession.value = current;
        if (current && current.caseId !== next.id) {
          pendingSwitch.value = { current, next, attempt: null };
          startAttempts.delete(next.id);
        }
      } catch { /* Keep the original failure and retained receipt for a safe retry. */ }
    }
    startError.value = cause instanceof ApiError && cause.status > 0 && cause.status < 500
      ? describeStartError(cause.status, cause.code) : apiMessage(cause);
    startingId.value = null;
    if (cause instanceof ApiError && (cause.status === 401 || cause.code === "csrf_rejected")) void checkAccount(true);
}

function pickMode(id: ModeId): void {
  if (activeMode.value === id) return;
  activeMode.value = id;
  query.value = "";
  playUi("hover");
}

onMounted(() => {
  void loadCases();
  void checkAccount();
  // The page arrives as its own chunk, after the browser has tried the hash, so /play#practice scrolls here.
  if (window.location.hash === "#practice") {
    window.requestAnimationFrame(() => document.getElementById("practice")?.scrollIntoView({ block: "start" }));
  }
});
</script>

<template>
  <GameShell :focus-x="0.96" :focus-y="0.32" dim="medium">
    <header class="pl-head">
      <p class="gs-eyebrow" data-enter style="--i: 0">Play</p>
      <h1 class="gs-h1" data-enter style="--i: 1">Choose a case</h1>
      <p class="gs-lede" data-enter style="--i: 2">
        Pick a mode, then start a case. Your chat plays along by typing commands such as <code>!look</code>.
      </p>
    </header>

    <ol class="pl-ready gs-card" data-enter style="--i: 3" aria-label="Before you start">
      <li :data-state="twitchStep.state">
        <span class="pl-mark" aria-hidden="true">
          <SiteIcon v-if="twitchStep.state === 'done'" name="check" :stroke="2.4" />
          <SiteIcon v-else-if="twitchStep.state === 'wait'" name="spinner" class="gs-spin" />
          <template v-else>1</template>
        </span>
        <span class="pl-step-text"><strong>Twitch</strong><small>{{ twitchStep.text }}</small></span>
        <a v-if="twitchStep.state === 'todo'" class="gs-btn gs-btn--gold pl-step-btn" :href="TWITCH_START">
          <SiteIcon name="plug" /> Connect
        </a>
        <button
          v-else-if="twitchStep.state === 'error'"
          type="button"
          class="gs-btn gs-btn--ghost pl-step-btn"
          @click="retryAll"
        >
          Retry
        </button>
      </li>
      <li data-state="current">
        <span class="pl-mark" aria-hidden="true">2</span>
        <span class="pl-step-text"><strong>Pick a case</strong><small>Below. The host controls open when it starts.</small></span>
      </li>
      <li data-state="todo">
        <span class="pl-mark" aria-hidden="true">3</span>
        <span class="pl-step-text"
          ><strong>Show it on stream</strong><small><a href="/setup">Add the overlay to OBS</a></small></span
        >
      </li>
    </ol>

    <div class="pl-modes" role="group" aria-label="Case mode" data-enter style="--i: 4">
      <button
        v-for="mode in MODES"
        :key="mode.id"
        type="button"
        class="pl-mode"
        :aria-pressed="activeMode === mode.id"
        @click="pickMode(mode.id)"
      >
        <span class="pl-mode-icon"><SiteIcon :name="mode.icon" size="22px" /></span>
        <span class="pl-mode-text"><strong>{{ mode.label }}</strong><small>{{ mode.detail }}</small></span>
      </button>
    </div>

    <p v-if="startError" class="gs-notice pl-notice" data-tone="error" role="alert">
      <SiteIcon name="alert" /> <span>{{ startError }}</span>
      <a v-if="openHostedSession" class="gs-btn gs-btn--gold" :href="sessionHref(openHostedSession)">Continue {{ openHostedSession.title }} <SiteIcon name="arrow-right" /></a>
    </p>

    <CaseSwitchNotice v-if="pendingSwitch" :key="pendingSwitch.current.sessionId + pendingSwitch.next.id" :current="pendingSwitch.current" :next-title="pendingSwitch.next.title" :busy="startingId !== null" :stopped="pendingSwitch.attempt?.stopConfirmed ?? false" @confirm="switchCase" />

    <SessionList ref="savedSessions" @loaded="onSessionsLoaded" />

    <section class="pl-cases" aria-labelledby="pl-cases-title" data-enter style="--i: 5">
      <h2 id="pl-cases-title" class="visually-hidden">{{ MODES.find((mode) => mode.id === activeMode)?.label }} cases</h2>

      <div v-if="activeMode === 'coop'" class="gs-notice pl-notice">
        <p>Create a co-op lobby, invite your partner by Twitch username, then start after they accept.</p>
        <a class="gs-btn gs-btn--ghost" href="/coop">Open live co-op</a>
      </div>

      <label v-if="casesState === 'ready' && modeCases.length > 6" class="pl-search">
        <SiteIcon name="search" />
        <span class="visually-hidden">Search cases</span>
        <input v-model="query" type="search" placeholder="Search cases" />
      </label>

      <ul v-if="casesState === 'loading'" class="pl-grid" aria-hidden="true">
        <li v-for="n in 3" :key="n" class="pl-card pl-card--ghost"></li>
      </ul>
      <p v-if="casesState === 'loading'" class="visually-hidden" role="status">Loading cases</p>

      <div v-else-if="casesState === 'error'" class="gs-notice pl-notice" data-tone="error" role="alert">
        <p>{{ casesError }}</p>
        <button type="button" class="gs-btn gs-btn--ghost" @click="retryAll"><SiteIcon name="restart" /> Retry</button>
      </div>

      <div v-else-if="casesState === 'empty'" class="gs-notice pl-notice" role="status">
        <p>No cases are on this server yet. Retry once the server has loaded its cases, or practice below.</p>
        <button type="button" class="gs-btn gs-btn--ghost" @click="retryAll"><SiteIcon name="restart" /> Retry</button>
      </div>

      <p v-else-if="visibleCases.length === 0 && activeMode !== 'coop'" class="gs-muted" role="status">
        No cases in this mode match. Pick another mode.
      </p>

      <ul v-else-if="visibleCases.length > 0" class="pl-grid">
        <li v-for="item in visibleCases" :key="item.id" class="pl-card">
          <div class="pl-cover" :style="{ backgroundImage: `url(${modeArt})` }">
            <span class="gs-chip pl-cover-chip">{{ MODES.find((mode) => mode.id === item.mode)?.label ?? item.mode }}</span>
            <h3 class="pl-title">{{ item.title }}</h3>
          </div>
          <div class="pl-body">
            <p class="pl-premise">{{ item.premise }}</p>
            <p class="pl-question"><span>The question</span>{{ item.question }}</p>
            <p class="pl-meta">
              <span class="gs-chip">{{ item.clues.length }} {{ item.clues.length === 1 ? "clue" : "clues" }}</span>
              <span class="gs-chip">{{ item.verdicts.length }} possible {{ item.verdicts.length === 1 ? "answer" : "answers" }}</span>
            </p>
            <a class="gs-btn gs-btn--ghost pl-preview" :href="`/preview/${item.mode === 'quick' ? 'gallery' : item.mode === 'mystery' ? 'festival' : 'signal'}`"><SiteIcon name="eye" /> Preview the investigation</a>
            <a v-if="item.mode === 'coop'" class="gs-btn gs-btn--gold pl-start" href="/coop">Create a co-op lobby</a>
            <a v-else-if="!signedIn" class="gs-btn gs-btn--ghost pl-start" :href="TWITCH_START">
              <SiteIcon name="plug" /> Connect Twitch to start
            </a>
            <button
              v-else
              type="button"
              class="gs-btn gs-btn--gold pl-start"
              :disabled="!canStart || item.mode === 'coop' || !!pendingSwitch?.attempt"
              @click="startCase(item)"
            >
              <SiteIcon v-if="startingId === item.id" name="spinner" class="gs-spin" />
              <SiteIcon v-else name="play" />
              {{ startingId === item.id ? "Starting…" : item.mode === "coop" ? "Starts from an invitation" : "Start case" }}
            </button>
          </div>
        </li>
      </ul>
    </section>

    <section id="practice" class="pl-practice" aria-labelledby="pl-practice-title" data-enter style="--i: 6">
      <div class="pl-practice-head">
        <p class="gs-eyebrow">Not live right now?</p>
        <h2 id="pl-practice-title" class="gs-h2">Practice cases</h2>
        <p class="gs-muted">
          Play now in this browser with a scripted chat. Practice actions are not sent to Twitch or saved as live sessions.
        </p>
      </div>
      <ul class="pl-practice-list">
        <li v-for="item in PRACTICE" :key="item.href" class="pl-pcard gs-card">
          <div class="pl-pcard-art" aria-hidden="true">
            <BoardScene v-if="item.scene" :kind="item.scene" variant="strip" />
            <img v-else-if="item.image" :src="item.image" alt="" loading="lazy" />
            <span class="gs-chip" data-tone="gold">{{ item.mode }}</span>
          </div>
          <div class="pl-pcard-body">
            <h3 class="gs-h3">{{ item.title }}</h3>
            <p class="gs-muted">{{ item.pitch }}</p>
            <ul class="pl-pcard-tags">
              <li v-for="tag in item.tags" :key="tag">{{ tag }}</li>
            </ul>
            <a class="gs-btn gs-btn--gold pl-pcard-play" :href="item.href" @click="playUi('select')"
              ><SiteIcon name="play" /> {{ item.cta }}</a
            >
          </div>
        </li>
      </ul>
      <p class="pl-practice-more">
        <a href="/preview/festival"><SiteIcon name="eye" /> Preview the Festival investigation</a>
      </p>
    </section>
  </GameShell>
</template>

<style scoped>
.pl-head {
  margin-bottom: 22px;
}
.pl-head code {
  padding: 1px 6px;
  border-radius: 4px;
  background: #ffffff12;
  font-size: 0.92em;
}

.pl-ready {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 0 0 22px;
  padding: 8px;
  list-style: none;
}
.pl-ready li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 12px;
}
.pl-ready li + li {
  border-left: 1px solid #ffffff12;
}
.pl-ready li[data-state="current"] {
  background: #e7bf7c14;
}
.pl-mark {
  display: grid;
  place-items: center;
  flex: none;
  width: 32px;
  height: 32px;
  border: 1px solid #a77a48;
  border-radius: 50%;
  color: #f0cd92;
  font-weight: 700;
}
.pl-ready li[data-state="done"] .pl-mark {
  border-color: #9fd49a;
  background: #9fd49a22;
  color: #c9ecc4;
}
.pl-ready li[data-state="error"] .pl-mark {
  border-color: #e59a8a;
  color: #f0b4a4;
}
.pl-ready li[data-state="current"] .pl-mark {
  border-color: var(--gs-gold);
  background: linear-gradient(180deg, #f2d199, #c99a52);
  color: #1a1008;
}
.pl-step-text {
  display: grid;
  min-width: 0;
  flex: 1;
}
.pl-step-text strong {
  color: #f4e6cf;
  font-size: 15px;
}
.pl-step-text small {
  overflow: hidden;
  color: #cdbca1;
  font-size: 13px;
  text-overflow: ellipsis;
}
.pl-step-text a {
  color: var(--gs-gold-hi);
}
.pl-step-btn {
  min-height: 40px;
  padding: 0 16px;
  font-size: 14px;
}

.pl-modes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}
.pl-mode {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 72px;
  padding: 12px 16px;
  border: 1px solid #ffffff17;
  border-radius: 14px;
  background: #140d09cc;
  color: var(--gs-text);
  text-align: left;
  cursor: pointer;
  transition:
    border-color 200ms ease-out,
    background-color 200ms ease-out,
    transform 220ms var(--gs-ease);
}
.pl-mode:hover {
  transform: translateY(-2px);
  border-color: #e7bf7c55;
}
.pl-mode[aria-pressed="true"] {
  border-color: var(--gs-gold);
  background: linear-gradient(180deg, #3a2615f0, #24170ef0);
  box-shadow: 0 12px 30px #0009;
}
.pl-mode-icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 44px;
  height: 44px;
  border: 1px solid #a77a4899;
  border-radius: 50%;
  color: var(--gs-gold);
}
.pl-mode[aria-pressed="true"] .pl-mode-icon {
  background: linear-gradient(180deg, #f2d199, #c99a52);
  color: #1a1008;
}
.pl-mode-text {
  display: grid;
}
.pl-mode-text strong {
  font-size: 17px;
}
.pl-mode-text small {
  color: #cdbca1;
  font-size: 13px;
}

.pl-notice {
  margin-bottom: 16px;
}
.pl-search {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 360px;
  margin-bottom: 14px;
  padding: 0 14px;
  border: 1px solid #ffffff26;
  border-radius: 999px;
  background: #0f0a07cc;
}
.pl-search input {
  flex: 1;
  min-height: 44px;
  border: 0;
  background: transparent;
  color: var(--gs-text);
  font: inherit;
  outline: none;
}

.pl-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 18px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.pl-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #7a563055;
  border-radius: 16px;
  background: linear-gradient(180deg, #1d140ef0, #120c08f5);
  box-shadow: 0 20px 44px #000a;
  transition:
    transform 260ms var(--gs-ease),
    border-color 200ms ease-out;
}
.pl-card:hover {
  transform: translateY(-4px);
  border-color: #e7bf7c77;
}
.pl-card--ghost {
  min-height: 360px;
  background: linear-gradient(100deg, #1a120c 30%, #2a1c13 50%, #1a120c 70%) 0 0 / 300% 100%;
}
html[data-motion="full"] .pl-card--ghost {
  animation: pl-shimmer 1400ms linear infinite;
}
@keyframes pl-shimmer {
  to {
    background-position: -150% 0;
  }
}
.pl-cover {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-height: 170px;
  padding: 14px 18px;
  background-position: center;
  background-size: cover;
}
.pl-cover::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #0b070533 0%, #0b0705e6 100%);
}
.pl-cover > * {
  position: relative;
  z-index: 1;
}
.pl-cover-chip {
  align-self: flex-start;
  margin-bottom: 8px;
  background: #0b0705b3;
}
.pl-title {
  margin: 0;
  color: #f8eedc;
  font-family: var(--gs-serif);
  font-size: 28px;
  font-weight: 500;
  line-height: 1.1;
  text-shadow: 0 2px 12px #000;
}
.pl-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 10px;
  padding: 16px 18px 18px;
}
.pl-premise {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: #e3d3b8;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}
.pl-question {
  display: grid;
  gap: 2px;
  margin: 0;
  color: #f4e6cf;
  font-family: var(--gs-serif);
  font-size: 18px;
  line-height: 1.3;
}
.pl-question span {
  color: #d9aa62;
  font-family: var(--gs-sans);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.pl-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
}
.pl-start {
  width: 100%;
  margin-top: auto;
}

.pl-practice {
  margin-top: 34px;
  scroll-margin-top: 80px;
}
.pl-practice-head {
  margin-bottom: 16px;
}
.pl-practice-head p:last-child {
  margin: 6px 0 0;
}
.pl-practice-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.pl-pcard {
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
  transition:
    transform 220ms var(--gs-ease),
    border-color 220ms ease-out;
}
.pl-pcard:hover {
  border-color: #d9aa6288;
  transform: translateY(-3px);
}
.pl-pcard-art {
  position: relative;
  height: 128px;
  overflow: hidden;
  background: #0c0806;
}
.pl-pcard-art img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.pl-pcard-art .gs-chip {
  position: absolute;
  top: 10px;
  left: 10px;
  background: #0c0806cc;
}
.pl-pcard-body {
  display: grid;
  align-content: start;
  gap: 8px;
  padding: 16px 18px 18px;
}
.pl-pcard-body p {
  margin: 0;
  font-size: 14px;
}
.pl-pcard-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 2px 0 6px;
  padding: 0;
  list-style: none;
}
.pl-pcard-tags li {
  padding: 2px 9px;
  border: 1px solid #ffffff1f;
  border-radius: 999px;
  color: #dccdb3;
  font-size: 12px;
}
.pl-pcard-play {
  justify-self: start;
}
.pl-practice-more {
  margin: 14px 0 0;
  font-size: 14px;
}
.pl-practice-more a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--gs-muted);
}
.pl-practice-more a:hover {
  color: var(--gs-gold-hi);
}

@media (max-width: 900px) {
  .pl-ready,
  .pl-modes {
    grid-template-columns: minmax(0, 1fr);
  }
  .pl-ready li + li {
    border-left: 0;
    border-top: 1px solid #ffffff12;
  }
  .pl-practice-list {
    grid-template-columns: minmax(0, 1fr);
  }
}
.pl-preview { width: 100%; margin-bottom: 10px; }
</style>
