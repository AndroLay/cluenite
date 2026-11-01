<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import heroScene from "./landing/hero-scene.jpg";
import typewriterArt from "./landing/typewriter.jpg";
import iconKey from "./landing/icon-key.png";
import iconChat from "./landing/icon-chat.png";
import iconPeople from "./landing/icon-people.png";
import iconSearch from "./landing/icon-search.png";

// Shape of GET /api/cases. Only the fields the menu shows are typed here; clue teasers stay off the menu.
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
type AuthState = "checking" | "signed-in" | "signed-out" | "unreachable";
type ModeId = "quick" | "mystery" | "coop";

const MODE_TABS: readonly { id: ModeId; label: string; detail: string; icon: string }[] = [
  { id: "quick", label: "Quick Case", detail: "Short cases for the stream overlay.", icon: iconKey },
  { id: "mystery", label: "Mystery Live", detail: "A live, chat-driven round.", icon: iconChat },
  { id: "coop", label: "Co-op", detail: "Team up and solve together.", icon: iconPeople },
];
const MODE_LABELS: Record<string, string> = {
  quick: "Quick Case",
  mystery: "Mystery Live",
  coop: "Co-op",
};
const NETWORK_ERROR = "Cannot reach the server. Check that it is running, then retry.";

const cases = ref<CaseSummary[]>([]);
const casesState = ref<CasesState>("loading");
const casesError = ref("");

const activeMode = ref<ModeId>("quick");
const query = ref("");

const auth = ref<AuthState>("checking");
const authError = ref("");
const csrfToken = ref("");

const startingId = ref<string | null>(null);
const startError = ref("");

const modeCases = computed(() => cases.value.filter((item) => item.mode === activeMode.value));
const visibleCases = computed(() => {
  const needle = query.value.trim().toLowerCase();
  if (!needle) return modeCases.value;
  return modeCases.value.filter(
    (item) =>
      item.title.toLowerCase().includes(needle) || item.premise.toLowerCase().includes(needle),
  );
});
const canStart = computed(() => auth.value === "signed-in" && startingId.value === null);

function modeLabel(mode: string): string {
  return MODE_LABELS[mode] ?? mode;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

async function readBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function errorCode(body: unknown): string {
  const record = asRecord(body);
  if (!record) return "";
  if (typeof record.error === "string") return record.error;
  const nested = asRecord(record.error);
  if (nested && typeof nested.code === "string") return nested.code;
  return typeof record.code === "string" ? record.code : "";
}

function isCaseSummary(value: unknown): value is CaseSummary {
  const record = asRecord(value);
  return (
    record !== null &&
    typeof record.id === "string" &&
    typeof record.title === "string" &&
    typeof record.mode === "string" &&
    Array.isArray(record.clues) &&
    Array.isArray(record.verdicts)
  );
}

async function loadCases(): Promise<void> {
  casesState.value = "loading";
  casesError.value = "";
  try {
    const response = await fetch("/api/cases", {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    const body = await readBody(response);
    if (!response.ok) {
      casesState.value = "error";
      casesError.value = `The case list did not load (server responded ${response.status}). Retry, or check the server log.`;
      return;
    }
    const list = asRecord(body)?.cases;
    cases.value = Array.isArray(list) ? list.filter(isCaseSummary) : [];
    casesState.value = cases.value.length === 0 ? "empty" : "ready";
  } catch {
    casesState.value = "error";
    casesError.value = NETWORK_ERROR;
  }
}

async function loadAuth(): Promise<void> {
  auth.value = "checking";
  authError.value = "";
  try {
    const response = await fetch("/api/me", {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    const body = asRecord(await readBody(response));
    if (response.status === 401 || (response.ok && body?.authenticated !== true)) {
      auth.value = "signed-out";
      csrfToken.value = "";
      return;
    }
    if (response.ok && typeof body?.csrfToken === "string") {
      auth.value = "signed-in";
      csrfToken.value = body.csrfToken;
      return;
    }
    auth.value = "unreachable";
    authError.value = `The sign-in check did not complete (server responded ${response.status}). Retry.`;
  } catch {
    auth.value = "unreachable";
    authError.value = NETWORK_ERROR;
  }
}

function retryAll(): void {
  void loadCases();
  void loadAuth();
}

// randomUUID exists only in secure contexts, so the menu falls back to a UUID v4 built from getRandomValues.
function newIdempotencyKey(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function describeStartError(status: number, code: string): string {
  if (status === 401) {
    return "Your Twitch host session ended. Sign in with Twitch again, then start the round.";
  }
  if (status === 403 && code === "origin_rejected") {
    return "The server refused the request because it came from another address. Open the case menu from the Cluenite address and try again.";
  }
  if (status === 403 && code === "csrf_rejected") {
    return "The page security token is out of date. Reload the menu, then start the round again.";
  }
  if (status === 403) {
    return "The server refused the request. Reload the menu, then try again.";
  }
  if (status === 404) {
    return "This case is no longer on the server. Reload the list and choose another case.";
  }
  if (status === 409) {
    return "The server is still handling a start request. Wait a moment, then try again.";
  }
  if (status === 400) {
    return "The server did not accept the start request. Reload the menu and try again.";
  }
  if (status >= 500) {
    return "The server could not create the round. Try again. If it keeps failing, check the server log.";
  }
  return `The round did not start (server responded ${status}). Try again.`;
}

async function startCase(caseItem: CaseSummary): Promise<void> {
  if (!canStart.value || caseItem.mode === "coop") return;
  startingId.value = caseItem.id;
  startError.value = "";
  try {
    const response = await fetch("/api/sessions", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Idempotency-Key": newIdempotencyKey(),
        "X-CSRF-Token": csrfToken.value,
      },
      body: JSON.stringify({ caseId: caseItem.id }),
    });
    const body = await readBody(response);
    const sessionId = asRecord(asRecord(body)?.snapshot)?.sessionId;
    if (response.status === 201 && typeof sessionId === "string") {
      // The host panel loads the new session. Keep the button busy until the page changes.
      window.location.assign(`/?session=${encodeURIComponent(sessionId)}&view=dashboard`);
      return;
    }
    const code = errorCode(body);
    startError.value = describeStartError(response.status, code);
    startingId.value = null;
    if (response.status === 401 || code === "csrf_rejected") void loadAuth();
  } catch {
    startError.value = NETWORK_ERROR;
    startingId.value = null;
  }
}

function quickStart(): void {
  activeMode.value = "quick";
  document.getElementById("case-list")?.scrollIntoView({ block: "start" });
}

onMounted(retryAll);
</script>

<template>
  <div class="play">
    <section class="play-hero" aria-labelledby="play-title">
      <div class="play-hero-copy">
        <h1 id="play-title">Choose a case.</h1>
        <p class="play-lede">
          Browse the case library and pick your next live detective story. Each case has its own
          premise, question, clues on file, and verdicts for the chat to work toward.
        </p>
        <div class="play-actions">
          <button type="button" class="site-button" @click="quickStart">Quick start: Quick Case</button>
          <a class="site-button site-button--quiet" href="/guide">Read the guide</a>
        </div>
      </div>
      <img class="play-hero-art" :src="heroScene" alt="" width="520" height="260" />
    </section>

    <div class="play-status" aria-live="polite">
      <p v-if="auth === 'checking'" role="status">Checking Twitch sign-in…</p>

      <div v-else-if="auth === 'signed-out'" class="site-notice" data-tone="warn">
        <p>
          Sign in with Twitch to start a round. The host panel needs your session before it can run
          the case.
        </p>
        <p class="menu-start-action">
          <a class="site-button site-button--quiet" href="/api/auth/twitch/start">Sign in with Twitch</a>
        </p>
      </div>

      <div v-else-if="auth === 'unreachable'" class="site-notice" data-tone="warn" role="alert">
        <p>{{ authError }}</p>
        <button type="button" class="site-button site-button--quiet menu-retry" @click="loadAuth">
          Retry sign-in check
        </button>
      </div>

      <div v-if="startError" class="site-notice" data-tone="warn" role="alert">
        <p>{{ startError }}</p>
      </div>
    </div>

    <div class="mode-tabs" role="group" aria-label="Case mode">
      <button
        v-for="tab in MODE_TABS"
        :key="tab.id"
        type="button"
        class="mode-tab"
        :aria-pressed="activeMode === tab.id"
        @click="activeMode = tab.id"
      >
        <span class="mode-tab-name">
          <img :src="tab.icon" alt="" width="22" height="22" />
          {{ tab.label }}
        </span>
        <span class="mode-tab-detail">{{ tab.detail }}</span>
      </button>
    </div>

    <section id="case-list" class="case-section" aria-labelledby="cases-title">
      <h2 id="cases-title" class="visually-hidden">{{ modeLabel(activeMode) }} cases</h2>

      <div class="case-tools">
        <label class="case-search">
          <span class="visually-hidden">Search cases</span>
          <img :src="iconSearch" alt="" width="16" height="16" />
          <input v-model="query" type="search" placeholder="Search cases…" />
        </label>
        <p v-if="casesState === 'ready'" class="case-count" role="status">
          {{ visibleCases.length }} of {{ modeCases.length }} {{ modeLabel(activeMode) }} cases
        </p>
      </div>

      <div v-if="activeMode === 'coop'" class="site-notice" data-tone="warn">
        <p>
          Co-op cases start from an invitation. Sending one from the browser is not available yet, so no
          co-op round can be started from this menu.
        </p>
      </div>

      <p v-if="casesState === 'loading'" class="site-prose" role="status">Loading cases…</p>

      <div v-else-if="casesState === 'error'" class="site-notice" data-tone="warn" role="alert">
        <p>{{ casesError }}</p>
        <button type="button" class="site-button site-button--quiet menu-retry" @click="retryAll">
          Retry loading cases
        </button>
      </div>

      <div v-else-if="casesState === 'empty'" class="site-notice" role="status">
        <p>No cases are available on this server yet. Retry once the server has loaded its case set.</p>
        <button type="button" class="site-button site-button--quiet menu-retry" @click="retryAll">
          Retry loading cases
        </button>
      </div>

      <p v-else-if="visibleCases.length === 0" class="site-prose" role="status">
        No {{ modeLabel(activeMode) }} cases match this search. Clear the search or choose another mode.
      </p>

      <ul v-else class="case-grid">
        <li v-for="item in visibleCases" :key="item.id" class="case-card">
          <div class="case-plate">
            <h3 class="case-title">{{ item.title }}</h3>
            <p class="case-meta">
              {{ item.clues.length }} {{ item.clues.length === 1 ? "clue" : "clues" }} ·
              {{ item.verdicts.length }} {{ item.verdicts.length === 1 ? "verdict" : "verdicts" }}
            </p>
          </div>
          <p class="case-premise">{{ item.premise }}</p>
          <p class="case-question"><span>Question</span> {{ item.question }}</p>
          <button
            type="button"
            class="site-button case-start"
            :disabled="!canStart || item.mode === 'coop'"
            @click="startCase(item)"
          >
            {{
              startingId === item.id
                ? "Starting the round…"
                : item.mode === "coop"
                  ? "Not available yet"
                  : "Start case"
            }}
          </button>
        </li>
      </ul>
    </section>

    <section class="play-previews" aria-labelledby="previews-title">
      <h2 id="previews-title">Previews</h2>
      <p class="site-prose">Previews run on sample data and are not connected to Twitch.</p>
      <ul class="menu-links">
        <li><a class="site-inline-link" href="/?view=quick">Quick Case preview (sample data)</a></li>
        <li><a class="site-inline-link" href="/?view=mystery">Mystery Live sample (sample data)</a></li>
      </ul>
    </section>

    <section class="play-band" aria-labelledby="band-title">
      <img :src="typewriterArt" alt="" width="330" height="150" />
      <div class="play-band-copy">
        <h2 id="band-title">Cases run from the stream.</h2>
        <p>
          Quick Case and Mystery Live rounds start from this menu after Twitch sign-in. Chat sends
          the commands, and the server accepts or rejects each verdict.
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.play {
  display: grid;
  gap: 22px;
  width: 880px;
  max-width: 100%;
  margin: 0 auto;
  color: var(--case-paper);
}

.play-hero {
  position: relative;
  min-height: 240px;
  overflow: hidden;
}

.play-hero::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(90deg, var(--case-bg) 0, var(--case-bg) 220px, rgba(16, 13, 10, 0) 520px);
}

.play-hero-copy {
  position: relative;
  z-index: 1;
  padding: 26px 0 22px 6px;
}

.play-hero h1 {
  margin: 0;
  font-size: 3.25rem;
  line-height: 1.04;
}

.play-lede {
  max-width: 400px;
  margin: 14px 0 0;
  font-size: 0.875rem;
  line-height: 1.45;
  color: var(--case-paper-dim);
}

.play-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 20px;
}

.play-hero-art {
  position: absolute;
  top: 0;
  right: 0;
  width: 62%;
  height: 100%;
  object-fit: cover;
  /* Feather the image's own left and bottom edges so no hard crop line shows. */
  -webkit-mask-image:
    linear-gradient(90deg, transparent 0, #000 30%),
    linear-gradient(180deg, #000 60%, transparent 100%);
  -webkit-mask-composite: source-in;
  mask-image:
    linear-gradient(90deg, transparent 0, #000 30%),
    linear-gradient(180deg, #000 60%, transparent 100%);
  mask-composite: intersect;
}

.play-status {
  display: grid;
  gap: 12px;
}

.play-status p {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--case-paper-dim);
}

.play-status .menu-start-action {
  margin: 12px 0 0;
}

.menu-retry {
  margin-top: 12px;
}

.menu-links {
  display: grid;
  gap: 8px;
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
}

.mode-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding: 10px;
  border: 1px solid var(--case-rule-strong);
  border-radius: 4px;
  background: var(--case-panel);
}

.mode-tab {
  display: grid;
  justify-items: center;
  gap: 4px;
  padding: 12px 14px;
  border: 1px solid var(--case-rule);
  border-radius: 3px;
  background: #2a1e15;
  color: var(--case-paper);
  font: inherit;
  text-align: center;
  cursor: pointer;
  transition:
    background-color 220ms cubic-bezier(0.16, 1, 0.3, 1),
    border-color 220ms cubic-bezier(0.16, 1, 0.3, 1);
}

.mode-tab:hover {
  border-color: var(--case-rule-strong);
}

.mode-tab:focus-visible {
  outline: 2px solid var(--case-gold);
  outline-offset: 3px;
}

.mode-tab-name {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-display);
  font-size: 1.1875rem;
  font-weight: 600;
}

.mode-tab img {
  flex: none;
}

.mode-tab-detail {
  font-size: 0.75rem;
  color: var(--case-paper-dim);
}

.mode-tab[aria-pressed="true"] {
  background: var(--case-paper);
  border-color: var(--case-gold);
  color: #211811;
}

.mode-tab[aria-pressed="false"] img {
  filter: brightness(0) invert(0.9);
}

.mode-tab[aria-pressed="true"] img {
  filter: brightness(0.3);
}

.mode-tab[aria-pressed="true"] .mode-tab-detail {
  color: #493021;
}

.case-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 20px;
  padding: 12px 0;
  border-top: 1px solid var(--case-rule);
  border-bottom: 1px solid var(--case-rule);
}

.case-search {
  display: flex;
  align-items: center;
  gap: 10px;
  box-sizing: border-box;
  width: 320px;
  max-width: 100%;
  height: 38px;
  padding: 0 12px;
  border: 1px solid var(--case-rule-strong);
  border-radius: 3px;
  background: var(--case-panel);
}

.case-search:focus-within {
  outline: 2px solid var(--case-gold);
  outline-offset: 3px;
}

.case-search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--case-paper);
  font: inherit;
  font-size: 0.8125rem;
}

.case-search input::placeholder {
  color: var(--case-paper-dim);
}

.case-count {
  margin: 0;
  font-size: 0.75rem;
  color: var(--case-paper-dim);
}

.case-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.case-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--case-rule-strong);
  border-radius: 4px;
  background: var(--case-panel);
}

.case-plate {
  padding-bottom: 10px;
  border-bottom: 1px solid var(--case-rule);
}

.case-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.2;
  color: var(--case-paper);
}

.case-meta {
  margin: 6px 0 0;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.04em;
  color: var(--case-gold);
}

.case-premise,
.case-question {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.45;
}

.case-premise {
  color: var(--case-paper-dim);
}

.case-question {
  color: var(--case-paper);
}

.case-question span {
  margin-right: 6px;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--case-gold);
}

.case-start {
  align-self: flex-start;
  margin-top: auto;
}

.case-section > .site-notice {
  margin-bottom: 16px;
}

.play-previews h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 600;
}

.play-previews .site-prose {
  margin: 6px 0 0;
  font-size: 0.8125rem;
  color: var(--case-paper-dim);
}

.play-band {
  display: grid;
  grid-template-columns: 330px 1fr;
  box-sizing: border-box;
  border: 1px solid var(--case-rule-strong);
  border-radius: 4px;
  background: var(--case-panel);
  overflow: hidden;
}

.play-band img {
  display: block;
  width: 330px;
  height: 150px;
  object-fit: cover;
}

.play-band-copy {
  align-self: center;
  padding: 18px 36px 18px 28px;
}

.play-band h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.2;
}

.play-band p {
  max-width: 440px;
  margin: 10px 0 0;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--case-paper-dim);
}

@media (max-width: 760px) {
  .play {
    width: 100%;
  }

  .play-hero::after {
    display: none;
  }

  .play-hero-art {
    position: relative;
    width: 100%;
    height: 180px;
  }

  .mode-tabs,
  .case-grid {
    grid-template-columns: 1fr;
  }

  .play-band {
    grid-template-columns: 1fr;
  }

  .play-band img {
    width: 100%;
  }

  .case-search {
    width: 100%;
  }
}
</style>
