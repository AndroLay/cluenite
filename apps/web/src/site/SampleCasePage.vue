<script setup lang="ts">
/* global KeyboardEvent, MouseEvent, HTMLOListElement, HTMLButtonElement, HTMLHeadingElement */
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import PlateFrame from "./PlateFrame.vue";
import GameWorkspace from "./GameWorkspace.vue";
import EvidenceDialog from "./EvidenceDialog.vue";
import GameNotification from "./GameNotification.vue";
import SuspectPortrait from "./SuspectPortrait.vue";
import { MANUSCRIPT_PORTRAITS } from "./portraits/atlas";
import type { Portrait } from "../sampleCase/boardCases";
import SiteIcon from "./SiteIcon.vue";
import type { SiteIconName } from "./icons";
import { reduceMotion, siteSettings } from "./settings";
import { createSampleScore } from "../audio/sampleScore";
import type { StudyScene } from "../scene/studyScene";
import { DESIGN_H, DESIGN_W, SUSPECT_ANCHORS, type StageTransform } from "../scene/studyLayout";
import {
  CASE_PREMISE,
  CASE_TITLE,
  CLAIMS,
  CLUES,
  CULPRIT,
  EVENTS,
  FIND_ITEMS,
  GRID_CELL_H,
  GRID_CELL_W,
  GRID_COLS,
  GRID_LETTERS,
  GRID_ROWS,
  HINTS,
  LINKS,
  OPENING_LINES,
  PENALTY,
  POINTS,
  RECONSTRUCTION,
  REVEAL_BODY,
  REVEAL_TITLE,
  REVEAL_TWIST,
  SUSPECTS,
  TIMELINE_RESULT,
  evidenceById,
  findItemById,
  type ClaimId,
  type EvidenceId,
  type FindId,
  type SampleClaim,
  type SampleEvent,
  type SuspectId,
} from "../sampleCase/manuscript";
import {
  PARTNER_ITEMS,
  createCase,
  eventAvailable,
  findAssisted,
  findAt,
  followCall,
  itemAt,
  itemCell,
  openRequest,
  ownSearchDone,
  partnerFind,
  proofStatus,
  runCommand,
  scoreCase,
  startCase,
  suspectStates,
  type CaseMode,
  type CaseResult,
  type CaseState,
} from "../sampleCase/engine";
import {
  CALL_RIGHT,
  CALL_WRONG,
  MAX_CALLS,
  PARTNER_CHAT,
  PARTNER_LINES,
  PARTNER_NAME,
  PARTNER_REQUESTS,
  PARTNER_STATION,
  VIEWERS,
  chatPick,
  claimBelief,
  crewBoard,
  emptyCredits,
  liveCells,
  makeCall,
  viewerById,
  type CrewCall,
  type ViewerTone,
} from "../sampleCase/crowd";

// The public sample case: a complete mystery that plays in this browser. It is labeled as a sample, reads and
// writes nothing on the server, and is never sent to Twitch. The first half is a hidden-object search of the
// study; the second half is the analysis and the accusation. Typed commands and grid call-outs use the same
// path as clicks, and the chat lines from viewers are scripted and labeled as such.

type TabId = "chat" | "notebook" | "board" | "timeline" | "claims" | "verdict";
type Tone = "ok" | "warn" | "info";
interface FeedLine {
  id: number;
  /** crowd: Station A's chat; partner: Inspector Hale; crowdB: Station B's chat. */
  who: "you" | "case" | "crowd" | "partner" | "crowdB";
  name: string;
  text: string;
  tone: Tone;
  /** A grid call that can be followed from the feed. */
  call?: number;
  /** Name colour for a viewer. */
  hue?: ViewerTone;
}
interface Popup {
  id: number;
  x: number;
  y: number;
  text: string;
  sub: string;
  tone: "up" | "down";
}

const TABS: readonly { id: TabId; label: string; icon: SiteIconName }[] = [
  { id: "chat", label: "Chat", icon: "chat" },
  { id: "notebook", label: "Notebook", icon: "document" },
  { id: "board", label: "Board", icon: "link" },
  { id: "timeline", label: "Timeline", icon: "clock" },
  { id: "claims", label: "Claims", icon: "scales" },
  { id: "verdict", label: "Verdict", icon: "target" },
];

const BEST_KEY = "cluenite.sample.best.v1";
const number = new Intl.NumberFormat("en-US");
const fmt = (value: number): string => number.format(value);

// Scripted sample viewers. They react to what the room shows, raise the wrong theories a real chat would raise,
// and never send commands.
const CROWD: Record<string, readonly (readonly [string, string])[]> = {
  start: [
    ["inkwell_ivy", "the rain on this one, wow"],
    ["marlowe_fan", "I see the clock already. G3? H3?"],
  ],
  "look:WINDOW": [
    ["mudlark", "MUD on the latch. it's the gardener"],
    ["inkwell_ivy", "he climbed in, obviously"],
  ],
  "look:NOTE": [
    ["velvet_glove", "oxblood ink... that's Celeste's colour"],
    ["marlowe_fan", "meet at nine = the theft. it's her"],
  ],
  "look:BOX": [["ledger_lou", "no scratches? somebody had a key"]],
  "look:CLOCK": [["tick_tock_tess", "20:52. write that down"]],
  "look:REGISTER": [
    ["ledger_lou", "wait, A.W. had the key from 20:50 to 21:02??"],
    ["velvet_glove", "didn't the clerk say it was locked all evening"],
  ],
  "look:GUESTBOOK": [["inkwell_ivy", "Celeste was at dinner the whole time though"]],
  "look:GLOVES": [["mudlark", "the gardener's gloves. MUDDY. case closed (it is not)"]],
  "look:UMBRELLA": [["inkwell_ivy", "wet umbrella, someone came in from outside"]],
  "look:TEACUP": [["tick_tock_tess", "who stops for tea in the middle of a theft"]],
  "look:QUILL": [["ledger_lou", "black ink at this desk. the note is oxblood..."]],
  "look:KNIGHT": [["marlowe_fan", "a chess knight in the books, ok then"]],
  "look:MAGNIFIER": [["velvet_glove", "a reading glass. how fitting"]],
  combo: [
    ["mudlark", "SPEEDRUN"],
    ["tick_tock_tess", "eagle eyes"],
  ],
  "search-done": [["inkwell_ivy", "room cleared. now the board"]],
  "link:L_KEY": [
    ["tick_tock_tess", "the box opened while the key was OUT"],
    ["mudlark", "so... the clerk??"],
  ],
  "link:L_PAPER": [["velvet_glove", "the note is HER register page. that's a frame-up"]],
  "link:L_PEN": [["ledger_lou", "anyone at that desk could use the pen"]],
  "link:L_ROUND": [["mudlark", "fine, Tomas was just doing his round"]],
  "link:L_BOXKEY": [["ledger_lou", "no forced lock, and the key ring was signed out"]],
  miss: [
    ["marlowe_fan", "hmm, not that one"],
    ["inkwell_ivy", "close, but no"],
    ["tick_tock_tess", "try another record"],
  ],
  timeline: [
    ["tick_tock_tess", "the evening finally adds up"],
    ["velvet_glove", "Celeste at dinner, key out, clock stops"],
  ],
  "claim:INTRUDER": [["mudlark", "sorry, Tomas"]],
  "claim:RIVAL": [["velvet_glove", "Celeste is clear. told you"]],
  "claim:LOCKED": [
    ["ledger_lou", "SHE LIED"],
    ["inkwell_ivy", "locked all evening, sure"],
  ],
  hint: [["marlowe_fan", "hint taken. no shame"]],
  wrong: [["tick_tock_tess", "oof. the proof does not point there"]],
  solved: [
    ["mudlark", "CALLED IT (I did not call it)"],
    ["velvet_glove", "the alarm was the alibi!!"],
    ["ledger_lou", "GG, detective"],
  ],
};

const CAST_PORTRAITS: Record<SuspectId, Portrait> = MANUSCRIPT_PORTRAITS;

class TimerGroup {
  private ids = new Set<number>();
  later(ms: number, fn: () => void): void {
    const id = window.setTimeout(() => {
      this.ids.delete(id);
      fn();
    }, ms);
    this.ids.add(id);
  }
  clear(): void {
    for (const id of this.ids) window.clearTimeout(id);
    this.ids.clear();
  }
}

const game = reactive<CaseState>(createCase());
// The search opens on the chat, where the crew's calls arrive; the analysis moves to the Board.
const tab = ref<TabId>("chat");
const fileOpen = ref(false);
const findsOpen = ref(false);
const composerOpen = ref(false);
const optionsOpen = ref(false);
const roomView = ref(true);
const discovery = ref<{ title: string; code: string; text: string; image: string | null; fresh: boolean } | null>(null);
const foundNotice = ref<{ id: string; title: string; code: string; text: string; image: string | null } | null>(null);
const collectedArt = new Map<FindId, string | null>();
function inspectCollected(id: FindId): void {
  if (!game.found.includes(id)) return;
  const item = findItemById(id);
  discovery.value = { title: item.label, code: id, text: item.note || CLUES.find(clue => clue.id === item.clue)?.observation || "Collected from the study.", image: collectedArt.get(id) ?? null, fresh: false };
}
function openFile(id: TabId): void {
  findsOpen.value = false;
  fileOpen.value = true;
  if (ownSearchDone(game) && id !== "chat") roomView.value = false;
  selectTab(id);
  void nextTick(() => document.getElementById(`sc-tab-${id}`)?.focus());
}
function closeFile(): void {
  const wasOpen = fileOpen.value;
  findsOpen.value = false;
  fileOpen.value = false;
  roomView.value = true;
  if (wasOpen) void nextTick(() => document.getElementById("sc-room-tool")?.focus());
}
function closeComposer(): void {
  composerOpen.value = false;
  void nextTick(() => document.getElementById("sc-command-toggle")?.focus());
}
function toggleComposer(): void {
  optionsOpen.value = false;
  if (composerOpen.value) { closeComposer(); return; }
  composerOpen.value = true;
  void nextTick(() => document.getElementById("sc-command-input")?.focus());
}
function closeOptions(): void {
  optionsOpen.value = false;
  void nextTick(() => document.getElementById("sc-options-toggle")?.focus());
}
function toggleOptions(): void {
  composerOpen.value = false;
  if (optionsOpen.value) { closeOptions(); return; }
  optionsOpen.value = true;
  void nextTick(() => document.getElementById("sc-options-sound")?.focus());
}
function workspaceKey(event: KeyboardEvent): void {
  if (discovery.value || document.querySelector("dialog[open]")) return;
  if (event.key === "Escape" && composerOpen.value) { event.preventDefault(); closeComposer(); return; }
  if (event.key === "Escape" && optionsOpen.value) { event.preventDefault(); closeOptions(); return; }
  if (event.key === "Escape" && roomView.value && fileOpen.value) closeFile();
  if (event.key === "/" && game.phase === "investigating" && !event.ctrlKey && !event.metaKey && !event.altKey && !(event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable=true]"))) {
    event.preventDefault();
    optionsOpen.value = false;
    composerOpen.value = true;
    void nextTick(() => document.getElementById("sc-command-input")?.focus());
  }
}
function inspectRecord(id: EvidenceId): void {
  if (!game.evidence.includes(id)) return;
  const record = evidenceById(id);
  discovery.value = { title: record.label, code: id, text: record.detail, image: null, fresh: false };
}
function closeDiscovery(): void {
  const completedSearch = discovery.value?.fresh && ownSearchDone(game);
  discovery.value = null;
  if (completedSearch) void nextTick(() => document.getElementById("sc-tab-board")?.focus());
}
function readDiscovery(): void {
  discovery.value = null;
  if (ownSearchDone(game)) roomView.value = false;
  openFile("board");
}
const feed = ref<FeedLine[]>([]);
const crewNotice = computed(() => {
  const line = [...feed.value].reverse().find(item => item.who !== "you" && item.who !== "case");
  return line ? { id: line.id, title: `${line.name} · scripted`, text: line.text } : null;
});
let feedSeq = 0;
const toast = ref<{ text: string; tone: Tone; seq: number } | null>(null);
const delta = ref<{ value: number; seq: number } | null>(null);
const popups = ref<Popup[]>([]);
let popupSeq = 0;
const selected = ref<EvidenceId[]>([]);
const challengePick = reactive<Record<ClaimId, EvidenceId | "">>({ INTRUDER: "", RIVAL: "", LOCKED: "" });
const command = ref("");
const history: string[] = [];
let historyIndex = -1;
const now = ref(Date.now());
const best = ref<number | null>(readBest());
const newBest = ref(false);
const unseen = reactive<Record<TabId, boolean>>({
  chat: false,
  notebook: false,
  board: false,
  timeline: false,
  claims: false,
  verdict: false,
});
const latestHint = ref<string | null>(null);
const gridOn = ref(false);
const assist = ref(false);
const cursor = reactive({ col: 4, row: 2, active: false });
const banner = ref<{ text: string; seq: number } | null>(null);

// Community: the crew's grid calls, their credit, and how lively chat is. Co-op adds Station B.
// /?view=quick&play=coop (from the Co-op page) opens the cover with co-op already chosen.
const mode = ref<CaseMode>(new URLSearchParams(window.location.search).get("play") === "coop" ? "coop" : "solo");
if (mode.value === "coop") Object.assign(game, createCase("coop"));
const calls = ref<CrewCall[]>([]);
let callSeq = 0;
let nextCallAt = 0;
const credits = reactive(emptyCredits());
const energy = ref(30);
const shareChoice = ref<EvidenceId | "">("");
const partnerNote = ref("");
let ownDoneAnnounced = false;
let partnerChat = 0;

// Chat view: the Chat tab of the case file, with a filter that keeps only commands and results.
const chatFilter = ref<"all" | "commands">("all");
const unread = ref(0);
const shownFeed = computed(() =>
  chatFilter.value === "all"
    ? feed.value
    : feed.value.filter((line) => line.who === "you" || line.who === "case" || line.text.startsWith("!")),
);

function onFeedScroll(): void {
  const el = feedEl.value;
  if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 48) unread.value = 0;
}

function jumpToLatest(): void {
  const el = feedEl.value;
  if (el) el.scrollTop = el.scrollHeight;
  unread.value = 0;
}

type OpeningStep = "cover" | "story" | "cast" | "ready";
const opening = reactive({ step: "cover" as OpeningStep, line: 0, typed: "", cast: -1 });
const reveal = reactive({ beat: -1, done: false, report: false });
const shownScore = ref(0);

const stageEl = ref<HTMLDivElement | null>(null);
const sceneHost = ref<HTMLDivElement | null>(null);
const overlay = ref<HTMLDivElement | null>(null);
const feedEl = ref<HTMLOListElement | null>(null);
const openButton = ref<HTMLButtonElement | null>(null);
const startButton = ref<HTMLButtonElement | null>(null);
const searchSurface = ref<HTMLDivElement | null>(null);
const revealHeading = ref<HTMLHeadingElement | null>(null);
const reportHeading = ref<HTMLHeadingElement | null>(null);
const sceneFailed = ref(false);
let scene: StudyScene | null = null;
let disposed = false;
let clockTimer: number | null = null;
let countFrame = 0;
let transform: StageTransform = { tx: 0, ty: 0, k: 1 };
const sequence = new TimerGroup();
const crowd = new TimerGroup();
const toastTimer = new TimerGroup();
const bannerTimer = new TimerGroup();
const sound = createSampleScore();
sound.setMuted(!siteSettings.soundOn);

const proof = computed(() => proofStatus(game));
const proofCount = computed(() => [proof.value.link, proof.value.timeline, proof.value.claim].filter(Boolean).length);
const report = computed(() => scoreCase(game));
const canAct = computed(() => game.phase === "investigating");
const searching = computed(() => game.phase === "investigating" && !ownSearchDone(game));
const coop = computed(() => game.mode === "coop");
watch(() => game.phase, phase => { if (phase !== "investigating") { composerOpen.value = false; optionsOpen.value = false; } if (phase === "solved") { roomView.value = true; fileOpen.value = false; discovery.value = null; } });
watch(() => reveal.report, reportVisible => { if (reportVisible) { roomView.value = false; fileOpen.value = true; } });
const crew = computed(() => crewBoard(credits));
const mvp = computed(() => {
  const top = crew.value[0];
  return top && top.points > 0 ? top : null;
});
const pick = computed(() => chatPick(game));
const openAsk = computed(() => {
  const ask = game.requests.find((entry) => entry.answeredAt === null);
  if (!ask) return null;
  const meta = PARTNER_REQUESTS.find((entry) => entry.id === ask.id);
  const ready = game.evidence.includes(ask.wants);
  // Until the record is on this board, show its ID only, so the request does not give its content away.
  return { ...ask, label: ready ? evidenceById(ask.wants).label : ask.wants, ready, text: meta?.ask ?? "" };
});
const shareable = computed(() => game.evidence.filter((id) => !game.shared.includes(id)));
const answeredAsks = computed(() => game.requests.filter((entry) => entry.answeredAt !== null).length);
// What chat would have said at the end, against what the evidence said.
const chatCalled = computed(() => {
  const share = pick.value;
  const top = (Object.keys(share) as SuspectId[]).sort((a, b) => share[b] - share[a])[0] ?? "CLERK";
  const name = SUSPECTS.find((suspect) => suspect.id === top)?.name ?? top;
  return { right: top === CULPRIT, name, share: share[top] };
});
const foundCount = computed(() => game.found.length);
const ownLeft = computed(
  () =>
    FIND_ITEMS.filter((item) => !game.found.includes(item.id) && !(coop.value && PARTNER_ITEMS.includes(item.id)))
      .length,
);
const hintsLeft = computed(() => HINTS.length - game.hintsUsed);
const hintWait = computed(() => Math.max(0, Math.ceil((game.searchHintReadyAt - now.value) / 1000)));
const comboLive = computed(
  () => game.combo >= 2 && game.lastFindAt !== null && now.value - game.lastFindAt <= POINTS.comboWindowMs,
);
const elapsedLabel = computed(() => clockLabel(game.startedAt, game.solvedAt ?? now.value));
const searchLabel = computed(() => clockLabel(game.startedAt, game.searchDoneAt ?? game.solvedAt ?? now.value));
const records = computed(() => game.evidence.map((id) => evidenceById(id)));
const foundLinks = computed(() => LINKS.filter((entry) => game.links.includes(entry.id)));
const notebook = computed(() => game.found.map((id) => findItemById(id)));
const raisedClaims = computed(() =>
  game.raised
    .map((id) => CLAIMS.find((claim) => claim.id === id))
    .filter((claim): claim is SampleClaim => claim !== undefined),
);
const timelineCards = computed(() =>
  game.timeline
    .map((id) => EVENTS.find((event) => event.id === id))
    .filter((event): event is SampleEvent => event !== undefined),
);
const readyEvents = computed(() => EVENTS.filter((event) => eventAvailable(game, event.id)).length);
const allEventsReady = computed(() => readyEvents.value === EVENTS.length);
const suspects = computed(() => suspectStates(game));
const contradictedCount = computed(() => CLAIMS.filter((claim) => game.claims[claim.id] === "contradicted").length);
const counts = computed<Record<TabId, string>>(() => ({
  chat: calls.value.length > 0 ? `${calls.value.length} live` : "",
  notebook: `${foundCount.value}/${FIND_ITEMS.length}`,
  board: `${game.links.length}/${LINKS.length}`,
  timeline: game.timelineSolved ? "Done" : `${readyEvents.value}/${EVENTS.length}`,
  claims: `${contradictedCount.value}/${game.raised.length}`,
  verdict: `${proofCount.value}/3`,
}));
const cursorCell = computed(() => `${GRID_LETTERS[cursor.col] ?? "A"}${cursor.row + 1}`);
const gridVisible = computed(() => searching.value && (gridOn.value || cursor.active));
const cells = computed(() => {
  const list: { id: string; x: number; y: number }[] = [];
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      list.push({ id: `${GRID_LETTERS[col] ?? "A"}${row + 1}`, x: col * GRID_CELL_W, y: row * GRID_CELL_H });
    }
  }
  return list;
});

// The objective names the next mechanic, not the answer.
const objective = computed(() => {
  if (searching.value) {
    if (foundCount.value === 0) {
      return coop.value
        ? "Search the study. Find the ten objects on your list; the hall desk is Station B's. Chat calls cells you can follow."
        : "Search the study. Find the twelve objects on the list under the room; six of them are clues. Chat calls cells you can follow.";
    }
    return `Keep searching: ${ownLeft.value} objects left. Clicking at random costs points.`;
  }
  const ask = openAsk.value;
  if (ask) {
    return ask.ready
      ? `Station B asked for ${ask.label}. Send it from the Station B card, or type !share ${ask.wants}.`
      : `Station B asked for ${ask.label}. Find it in the room first.`;
  }
  if (proof.value.complete) return "The proof holds. Name the culprit on the Verdict tab.";
  if (!game.timelineSolved && allEventsReady.value && game.links.length === 0) {
    return "The room is searched. Link two records that explain each other on the Board.";
  }
  if (!game.timelineSolved && allEventsReady.value) return "Every event has a record. Put the evening in order on the Timeline.";
  if (contradictedCount.value === 0) return "Chat has theories. Test them on the Claims tab.";
  if (!proof.value.claim) return "Someone’s statement does not survive the records. Break it on the Claims tab.";
  if (!proof.value.link) return "Pin down when the box opened, and who could open it.";
  return "Restore the timeline.";
});

// The stage shows this short form; the long objective stays in its tooltip and the mobile line.
const objectiveShort = computed(() => {
  if (searching.value) return `Find ${ownLeft.value} more ${ownLeft.value === 1 ? "object" : "objects"}`;
  const ask = openAsk.value;
  if (ask) return ask.ready ? `Send ${ask.wants} to Station B` : `Station B needs ${ask.wants}`;
  if (proof.value.complete) return "Name the culprit";
  if (!game.timelineSolved && allEventsReady.value && game.links.length === 0) return "Link two records";
  if (!game.timelineSolved && allEventsReady.value) return "Put the evening in order";
  if (contradictedCount.value === 0) return "Test chat’s theories";
  if (!proof.value.claim) return "Break the false statement";
  if (!proof.value.link) return "Time the theft";
  return "Restore the timeline";
});

function clockLabel(start: number | null, end: number): string {
  if (start === null) return "0:00";
  const total = Math.floor(Math.max(0, end - start) / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function readBest(): number | null {
  try {
    const raw = window.localStorage.getItem(BEST_KEY);
    const value = raw === null ? Number.NaN : Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function saveBest(total: number): void {
  newBest.value = best.value === null || total > best.value;
  if (!newBest.value) return;
  best.value = total;
  try {
    window.localStorage.setItem(BEST_KEY, String(total));
  } catch {
    // Storage can be blocked. The best score still shows for this visit.
  }
}

function pushFeed(
  who: FeedLine["who"],
  name: string,
  text: string,
  tone: Tone,
  extra: { call?: number; hue?: ViewerTone } = {},
): void {
  const el = feedEl.value;
  const stick = el === null || el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  if (!stick && tab.value === "chat") unread.value += 1;
  if (who !== "you" && who !== "case") markUnseen("chat");
  const hue = extra.hue ?? (who === "crowd" ? viewerById(name)?.tone : undefined);
  const line: FeedLine = { id: (feedSeq += 1), who, name, text, tone };
  if (extra.call !== undefined) line.call = extra.call;
  if (hue !== undefined) line.hue = hue;
  feed.value = [...feed.value.slice(-79), line];
  if (stick) {
    void nextTick(() => {
      const list = feedEl.value;
      if (list) list.scrollTop = list.scrollHeight;
    });
  }
}

function crowdSay(key: string): void {
  const lines = CROWD[key];
  if (!lines || lines.length === 0) return;
  const chosen = key === "miss" || key === "combo" ? [lines[Math.floor(Math.random() * lines.length)]] : lines;
  chosen.forEach((line, index) => {
    if (!line) return;
    crowd.later(650 + index * 1150 + Math.random() * 400, () => pushFeed("crowd", line[0], line[1], "info"));
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Community: the crew calls grid cells, the streamer chooses whose calls to follow, and every find through a call
// is credited to the viewer who made it. Chat energy rises with good play and makes the crew call more often.

const partnerTimer = new TimerGroup();

function bump(amount: number): void {
  energy.value = Math.max(0, Math.min(100, energy.value + amount));
}

function viewerSay(id: string, text: string, delay = 600): void {
  crowd.later(delay, () => pushFeed("crowd", id, text, "info"));
}

function pickLine(lines: readonly string[]): string {
  return lines[Math.floor(Math.random() * lines.length)] ?? "";
}

// Viewers who have called less speak first, so the whole crew takes part.
function pickCaller(): (typeof VIEWERS)[number] | undefined {
  const order = [...VIEWERS].sort(
    (a, b) => (credits[a.id]?.calls ?? 0) - (credits[b.id]?.calls ?? 0) + (Math.random() - 0.5) * 1.6,
  );
  return order.find((viewer) => !calls.value.some((call) => call.viewer === viewer.id));
}

function tickCommunity(at: number): void {
  if (game.phase !== "investigating") return;
  energy.value = Math.max(0, energy.value - 0.6);
  if (calls.value.length > 0) {
    const live = liveCells(game);
    calls.value = calls.value.filter((call) => call.expiresAt > at && (!call.hit || live.has(call.cell)));
  }
  if (!searching.value || calls.value.length >= MAX_CALLS || at < nextCallAt) return;
  nextCallAt = at + 8200 - energy.value * 40 + Math.random() * 2400;
  const viewer = pickCaller();
  if (!viewer) return;
  const taken = new Set(calls.value.map((call) => call.cell));
  const call = makeCall(game, viewer, taken, Math.random, at, (callSeq += 1));
  if (!call) return;
  calls.value = [...calls.value, call];
  const credit = credits[viewer.id];
  if (credit) credit.calls += 1;
  pushFeed("crowd", viewer.id, `!look ${call.cell}`, "info", { call: call.id });
}

function followCrewCall(id: number, echo?: string): void {
  const call = calls.value.find((entry) => entry.id === id);
  if (!call || !searching.value) return;
  calls.value = calls.value.filter((entry) => entry.id !== id);
  const before = scoreCase(game).total;
  const outcome = followCall(game, call.cell);
  const credit = credits[call.viewer];
  if (outcome.cue?.kind === "found") {
    if (credit) credit.finds += 1;
    bump(8);
    viewerSay(call.viewer, pickLine(CALL_RIGHT));
  } else if (outcome.cue?.kind === "misclick") {
    if (credit) credit.misses += 1;
    viewerSay(call.viewer, pickLine(CALL_WRONG));
  }
  settle(outcome, before, { echo: echo ?? `!look ${call.cell}`, via: call.viewer });
}

// A viewer who called the cell of an object the streamer then found alone still gets a spotting credit.
function creditSpotters(item: FindId): void {
  const cell = itemCell(findItemById(item));
  const spotters = calls.value.filter((call) => call.hit && call.cell === cell);
  if (spotters.length === 0) return;
  for (const call of spotters) {
    const credit = credits[call.viewer];
    if (credit) credit.spotted += 1;
  }
  calls.value = calls.value.filter((call) => !spotters.includes(call));
}

// Station B: Inspector Hale's team searches the hall desk, shares what it finds, and trades records with this
// station. The register, which the key deduction needs, arrives only after this station answers Hale.
function startPartner(): void {
  partnerTimer.clear();
  if (!coop.value) return;
  partnerNote.value = "Searching the hall desk.";
  partnerTimer.later(4500, () => partnerSay(PARTNER_LINES.hello));
  partnerTimer.later(15000, partnerCrowd);
  partnerTimer.later(26000, () => {
    partnerShare("GUESTBOOK");
    partnerSay(PARTNER_LINES.guestbook);
  });
  partnerTimer.later(31000, partnerCrowd);
  partnerTimer.later(38000, () => askPartner(0));
  partnerTimer.later(60000, partnerCrowd);
}

function partnerSay(text: string): void {
  if (game.phase !== "investigating" && text !== PARTNER_LINES.solved) return;
  partnerNote.value = text;
  pushFeed("partner", PARTNER_NAME, text, "info");
}

function partnerCrowd(): void {
  const line = PARTNER_CHAT[partnerChat % PARTNER_CHAT.length];
  partnerChat += 1;
  if (line && game.phase === "investigating") pushFeed("crowdB", line[0], line[1], "info");
}

function partnerShare(id: FindId): void {
  if (game.phase !== "investigating") return;
  const before = scoreCase(game).total;
  const outcome = partnerFind(game, id);
  if (outcome.code === "ACCEPTED_NEW") settle(outcome, before);
}

function askPartner(index: number): void {
  const request = PARTNER_REQUESTS[index];
  if (!request || game.phase !== "investigating") return;
  const already = game.shared.includes(request.wants);
  openRequest(game, request.id, request.wants);
  if (already) {
    partnerReply(index);
    return;
  }
  partnerSay(request.ask);
  sound.cue("hint");
  showBanner(`Station B asks for ${request.wants}`);
  bump(6);
  partnerTimer.later(35000, () => {
    const open = game.requests.find((entry) => entry.id === request.id);
    if (open && open.answeredAt === null) partnerSay(request.nudge);
  });
}

function partnerReply(index: number): void {
  const request = PARTNER_REQUESTS[index];
  if (!request) return;
  partnerTimer.later(2200, () => {
    if (game.phase !== "investigating") return;
    partnerSay(request.reply);
    if (request.unlocks) partnerShare(request.unlocks);
    if (PARTNER_REQUESTS[index + 1]) partnerTimer.later(9000, () => askPartner(index + 1));
  });
}

function sendToPartner(id: EvidenceId | ""): void {
  if (!id) return;
  act(`!share ${id}`);
  shareChoice.value = "";
}

/** The first sentence of a result, for the short toast over the stage. */
function headline(message: string): string {
  const match = /^.+?[.!?](?=\s|$)/.exec(message);
  return match ? match[0] : message;
}

function showToast(text: string, tone: Tone): void {
  toast.value = { text, tone, seq: (toast.value?.seq ?? 0) + 1 };
  toastTimer.clear();
  toastTimer.later(5000, () => {
    toast.value = null;
  });
}

function showBanner(text: string): void {
  banner.value = { text, seq: (banner.value?.seq ?? 0) + 1 };
  bannerTimer.clear();
  bannerTimer.later(3600, () => {
    banner.value = null;
  });
}

function popup(x: number, y: number, text: string, sub: string, tone: Popup["tone"]): void {
  const id = (popupSeq += 1);
  popups.value = [...popups.value.slice(-7), { id, x, y, text, sub, tone }];
  window.setTimeout(() => {
    popups.value = popups.value.filter((item) => item.id !== id);
  }, 1300);
}

function markUnseen(id: TabId): void {
  if (tab.value !== id) unseen[id] = true;
}

function selectTab(id: TabId): void {
  tab.value = id;
  unseen[id] = false;
  if (id === "chat") void nextTick(jumpToLatest);
}

function onTabKey(event: KeyboardEvent, id: TabId): void {
  const index = TABS.findIndex((item) => item.id === id);
  let next: number;
  if (event.key === "ArrowRight") next = (index + 1) % TABS.length;
  else if (event.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = TABS.length - 1;
  else return;
  event.preventDefault();
  const target = TABS[next];
  if (!target) return;
  selectTab(target.id);
  void nextTick(() => document.getElementById(`sc-tab-${target.id}`)?.focus());
}

function updateMood(): void {
  if (game.phase === "solved") sound.setMood("resolved");
  else if (game.phase === "opening") sound.setMood("opening");
  else sound.setMood(proofCount.value >= 2 || game.claims.LOCKED === "contradicted" ? "tension" : "investigation");
}

function toneOf(result: CaseResult): Tone {
  return result.code === "ACCEPTED_NEW" ? "ok" : result.code === "ACCEPTED_ALREADY_KNOWN" ? "info" : "warn";
}

// Every result lands here: a click in the room, an assisted find, a button on the desk, or a typed command.
function settle(
  result: CaseResult,
  before: number,
  options: { echo?: string; quietMiss?: boolean; via?: string } = {},
): void {
  const after = scoreCase(game).total;
  const tone = toneOf(result);
  const cue = result.cue;
  // A plain misclick in the room speaks through its popup only; a steadied hand still gets the toast.
  const quiet = options.quietMiss === true && cue?.kind === "misclick" && !cue.steady;
  if (options.echo) pushFeed("you", "You", options.echo, "info");
  if (!quiet) {
    pushFeed("case", "Case", result.message, tone);
    // The stage shows only the headline; the full result stays in the chat feed.
    if (cue?.kind !== "found") showToast(headline(result.message), tone);
  }
  if (after !== before) delta.value = { value: after - before, seq: (delta.value?.seq ?? 0) + 1 };
  react(result, after - before, options.via);
}

function act(text: string): void {
  if (!canAct.value) return;
  // Typing a cell that a viewer already called follows that call, so the viewer keeps the credit.
  const match = /^!?(?:look|inspect|find)\s+([a-z][0-9]+)$/i.exec(text.trim());
  const cell = match?.[1]?.toUpperCase();
  const call = cell ? calls.value.find((entry) => entry.cell === cell) : undefined;
  if (call) {
    followCrewCall(call.id, text);
    return;
  }
  const before = scoreCase(game).total;
  const result = runCommand(game, text);
  settle(result, before, { echo: text });
}

function react(result: CaseResult, gained: number, via?: string): void {
  const cue = result.cue;
  if (cue) {
    switch (cue.kind) {
      case "found": {
        const item = findItemById(cue.item);
        if (!cue.partner) {
          const image = scene?.discoveryImage(cue.item) ?? null;
          collectedArt.set(cue.item, image);
          foundNotice.value = { id: `${cue.item}-${game.found.length}`, title: item.label, code: cue.item, text: item.note || CLUES.find(clue => clue.id === item.clue)?.observation || "Collected from the study.", image };
        }
        scene?.found(cue.item);
        sound.cue("discover");
        const bonus = cue.searchDone ? cue.bonus : 0;
        if (cue.partner) {
          bump(12);
          if (cue.searchDone && bonus > 0) showBanner(`Search complete · time bonus +${fmt(bonus)}`);
        } else {
          if (cue.clue) scene?.inspect(cue.clue);
          if (!via) creditSpotters(cue.item);
          bump(8 + cue.combo * 3);
          crowdSay(`look:${cue.clue ?? cue.item}`);
          if (cue.combo === 4) crowdSay("combo");
        }
        if (cue.released.length > 0) markUnseen("board");
        if (cue.raised.length > 0) markUnseen("claims");
        markUnseen("notebook");
        if (allEventsReady.value && !game.timelineSolved) markUnseen("timeline");
        if (!cue.partner && !ownDoneAnnounced && ownSearchDone(game)) {
          ownDoneAnnounced = true;
          calls.value = [];
          sound.cue("timeline");
          if (cue.searchDone) showBanner(bonus > 0 ? `Room searched · time bonus +${fmt(bonus)}` : "Room searched");
          else showBanner("Your side is searched · Station B holds the hall desk");
          crowdSay("search-done");
          cursor.active = false;
          // The search surface leaves with the search; hand focus to the next step instead of the page body.
          const findsOpener = document.querySelector<HTMLButtonElement>('.sc-workspace .workspace-dock button[aria-label="Objects to find"]');
          findsOpen.value = false;
          roomView.value = false;
          fileOpen.value = true;
          selectTab("board");
          void nextTick(async () => {
            // Let the workspace finish restoring its closing drawer's focus first.
            await nextTick();
            if (document.querySelector("dialog[open]")) return;
            const focused = document.activeElement;
            const fallback = document.querySelector('.sc-workspace .workspace-dock button');
            if (focused === document.body || focused === findsOpener || (findsOpener && !findsOpener.isConnected && focused === fallback)) {
              document.getElementById("sc-tab-board")?.focus();
            }
          });
        }
        break;
      }
      case "partner-desk": {
        const item = findItemById(cue.item);
        popup(item.box.x, item.box.y - item.box.h / 2, "Station B’s desk", "Trade records instead", "down");
        break;
      }
      case "shared": {
        sound.cue("link");
        bump(14);
        const index = PARTNER_REQUESTS.findIndex((entry) => entry.id === cue.request);
        if (index >= 0) partnerReply(index);
        else partnerTimer.later(1500, () => partnerSay(PARTNER_LINES.extra));
        break;
      }
      case "misclick":
        scene?.missAt(cue.x, cue.y, cue.steady);
        sound.cue("miss");
        popup(cue.x, cue.y, `−${PENALTY.misclick}`, cue.steady ? "Steady…" : "", "down");
        break;
      case "search-hint":
        scene?.hintAt(cue.item);
        sound.cue("hint");
        break;
      case "link":
        scene?.linked(cue.link);
        sound.cue("link");
        bump(16);
        crowdSay(`link:${cue.link}`);
        break;
      case "miss":
        scene?.miss();
        sound.cue("miss");
        if (Math.random() < 0.6) crowdSay("miss");
        break;
      case "timeline":
        scene?.timeline();
        sound.cue("timeline");
        bump(16);
        crowdSay("timeline");
        break;
      case "contradiction": {
        scene?.contradiction(cue.clears);
        scene?.setSuspects(suspects.value);
        sound.cue("contradiction");
        bump(20);
        crowdSay(`claim:${cue.claim}`);
        const believers = claimBelief(game, cue.claim, Date.now());
        crowd.later(2600, () =>
          pushFeed("case", "Chat poll", `Only ${believers}% of chat still believes ${cue.claim}.`, "info"),
        );
        break;
      }
      case "hint":
        latestHint.value = HINTS[cue.level - 1] ?? null;
        scene?.hint();
        sound.cue("hint");
        crowdSay("hint");
        break;
      case "accused-wrong":
        scene?.accusedWrong(cue.suspect);
        sound.cue("miss");
        sound.thunder(1, 0.4);
        crowdSay("wrong");
        break;
      case "solved":
        beginReveal();
        break;
    }
  }
  if (proof.value.complete && game.phase === "investigating") markUnseen("verdict");
  updateMood();
}

// The stage: a click is mapped through the camera transform into design units, then hit-tested.
function onStageClick(event: MouseEvent): void {
  const stage = stageEl.value;
  if (!stage || !searching.value) return;
  const box = stage.getBoundingClientRect();
  const x = (event.clientX - box.left - transform.tx) / transform.k;
  const y = (event.clientY - box.top - transform.ty) / transform.k;
  // A click on a hidden object always counts as that object; if a viewer called its cell, the find follows the
  // call and credits them. A click on a call marker away from any object follows the call.
  const item = itemAt(x, y);
  const live = item !== null && !game.found.includes(item.id);
  const call = live
    ? calls.value.find((entry) => entry.cell === itemCell(item))
    : calls.value.find((entry) => Math.hypot(entry.x - x, entry.y - y) <= 56);
  if (call) {
    followCrewCall(call.id);
    return;
  }
  const before = scoreCase(game).total;
  settle(findAt(game, x, y), before, { quietMiss: true });
}

function onSearchKey(event: KeyboardEvent): void {
  if (!searching.value) return;
  const moves: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  };
  const move = moves[event.key];
  if (move) {
    event.preventDefault();
    cursor.active = true;
    cursor.col = Math.min(GRID_COLS - 1, Math.max(0, cursor.col + move[0]));
    cursor.row = Math.min(GRID_ROWS - 1, Math.max(0, cursor.row + move[1]));
    return;
  }
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    cursor.active = true;
    act(`!look ${cursorCell.value}`);
  }
}

function findFromList(id: FindId): void {
  if (!assist.value || !canAct.value) return;
  const before = scoreCase(game).total;
  settle(findAssisted(game, id), before);
}

function toggleEvidence(id: EvidenceId): void {
  const current = selected.value;
  if (current.includes(id)) selected.value = current.filter((item) => item !== id);
  else selected.value = [...current, id].slice(-2);
}

function linkSelected(): void {
  const [a, b] = selected.value;
  if (a === undefined || b === undefined) return;
  act(`!link ${a} ${b}`);
  // A pair that now holds (new or already known) clears; a miss keeps the pair so it can be adjusted.
  const holds = LINKS.some(
    (entry) => game.links.includes(entry.id) && [entry.a, entry.b].includes(a) && [entry.a, entry.b].includes(b),
  );
  if (holds) selected.value = [];
}

// The cell cursor shows for keyboard focus only, so a mouse click on the room does not draw the grid.
function onSurfaceFocus(): void {
  cursor.active = searchSurface.value?.matches(":focus-visible") ?? false;
}

function isStationB(id: FindId): boolean {
  return coop.value && PARTNER_ITEMS.includes(id);
}

function beliefOf(id: ClaimId): number {
  return claimBelief(game, id, now.value);
}

function isLiveCall(id: number | undefined): boolean {
  return id !== undefined && searching.value && calls.value.some((call) => call.id === id);
}

function followFromFeed(id: number | undefined): void {
  if (id !== undefined) followCrewCall(id);
}

function isLinked(id: EvidenceId): boolean {
  return foundLinks.value.some((entry) => entry.a === id || entry.b === id);
}

function moveEvent(index: number, dir: -1 | 1): void {
  if (game.timelineSolved || !canAct.value) return;
  const target = index + dir;
  const list = [...game.timeline];
  const a = list[index];
  const b = list[target];
  if (a === undefined || b === undefined) return;
  list[index] = b;
  list[target] = a;
  game.timeline = list;
  // Keep keyboard focus on the moved card's button, or its other button when it reaches an end.
  void nextTick(() => {
    const atEdge = target === 0 || target === list.length - 1;
    const side = atEdge ? (dir < 0 ? "down" : "up") : dir < 0 ? "up" : "down";
    document.getElementById(`sc-move-${a}-${side}`)?.focus();
  });
}

function eventNote(event: SampleEvent): string {
  if (game.timelineSolved) return event.time;
  if (event.needs === null) return "Known from the alarm";
  return eventAvailable(game, event.id) ? `Record: ${evidenceById(event.needs).label}` : "Find its record first";
}

function checkOrder(): void {
  act(`!order ${game.timeline.join(" ")}`);
}

function challenge(id: ClaimId): void {
  const evidence = challengePick[id];
  if (evidence) act(`!challenge ${id} ${evidence}`);
}

function accuse(id: SuspectId): void {
  act(`!solve ${id}`);
}

function askHint(): void {
  act("!hint");
}

function submitCommand(): void {
  const text = command.value.trim();
  if (!text || !canAct.value) return;
  history.unshift(text);
  history.splice(20);
  historyIndex = -1;
  command.value = "";
  act(text.startsWith("!") ? text : `!${text}`);
}

function onCommandKey(event: KeyboardEvent): void {
  if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
  if (history.length === 0) return;
  event.preventDefault();
  historyIndex =
    event.key === "ArrowUp" ? Math.min(history.length - 1, historyIndex + 1) : Math.max(-1, historyIndex - 1);
  command.value = historyIndex < 0 ? "" : (history[historyIndex] ?? "");
}

async function startSound(): Promise<void> {
  if (siteSettings.soundOn) await sound.start();
}

async function toggleSound(): Promise<void> {
  siteSettings.soundOn = !siteSettings.soundOn;
  sound.setMuted(!siteSettings.soundOn);
  if (siteSettings.soundOn && (game.phase !== "opening" || opening.step !== "cover")) await sound.start();
  updateMood();
}

// Opening: a cold open that types the briefing, then lights each suspect in turn.
async function openCase(): Promise<void> {
  await startSound();
  updateMood();
  sequence.clear();
  if (reduceMotion.value) {
    finishOpening();
    return;
  }
  opening.step = "story";
  playLine(0);
}

function playLine(index: number): void {
  const text = OPENING_LINES[index];
  if (text === undefined) {
    playCast(0);
    return;
  }
  opening.line = index;
  opening.typed = "";
  let n = 0;
  const step = (): void => {
    n += 1;
    opening.typed = text.slice(0, n);
    if (text[n - 1] !== " ") sound.cue("type");
    if (n < text.length) sequence.later(24, step);
    else sequence.later(1100, () => playLine(index + 1));
  };
  step();
}

function playCast(index: number): void {
  const suspect = SUSPECTS[index];
  if (!suspect) {
    finishOpening();
    return;
  }
  opening.step = "cast";
  opening.cast = index;
  scene?.introduce(suspect.id);
  sequence.later(2600, () => playCast(index + 1));
}

function finishOpening(): void {
  sequence.clear();
  scene?.introduce(null);
  opening.step = "ready";
  void nextTick(() => startButton.value?.focus());
}

async function beginInvestigation(): Promise<void> {
  await startSound();
  sequence.clear();
  startCase(game, Date.now());
  now.value = Date.now();
  nextCallAt = now.value + 5000;
  scene?.introduce(null);
  scene?.setPhase("investigating");
  updateMood();
  pushFeed(
    "case",
    "Case",
    coop.value
      ? "The study is open, and Station B has the hall desk. Search your side, follow chat's calls, and trade records with Hale."
      : "The study is open. Click an object from the list in the room, or follow a viewer's grid call such as !look H3.",
    "info",
  );
  crowdSay("start");
  startPartner();
  void nextTick(() => {
    const scroller = stageEl.value?.parentElement;
    if (scroller) scroller.scrollLeft = (scroller.scrollWidth - scroller.clientWidth) / 2;
    searchSurface.value?.focus({ preventScroll: true });
  });
}

// Ending: the stamp, the reconstruction one beat at a time, the twist, then the report.
function beginReveal(): void {
  sequence.clear();
  updateMood();
  sound.cue("reveal");
  scene?.setPhase("solved");
  scene?.setSuspects(suspects.value);
  reveal.beat = -1;
  reveal.done = false;
  reveal.report = false;
  saveBest(scoreCase(game).total);
  calls.value = [];
  partnerTimer.clear();
  crowdSay("solved");
  const called = chatCalled.value;
  crowd.later(3200, () =>
    pushFeed(
      "case",
      "Chat poll",
      called.right
        ? `Chat called it: ${called.share}% named ${called.name}.`
        : `Chat leaned toward ${called.name} (${called.share}%). The evidence did not.`,
      "info",
    ),
  );
  if (coop.value) partnerTimer.later(1800, () => partnerSay(PARTNER_LINES.solved));
  void nextTick(() => revealHeading.value?.focus());
  if (reduceMotion.value) {
    reveal.beat = RECONSTRUCTION.length - 1;
    scene?.finale();
    reveal.done = true;
    reveal.report = true;
    return;
  }
  sequence.later(1800, () => playBeat(0));
}

function playBeat(index: number): void {
  const beat = RECONSTRUCTION[index];
  if (!beat) {
    scene?.beat(null);
    scene?.finale();
    reveal.done = true;
    sequence.later(1900, () => sound.cue("stamp"));
    sequence.later(3400, () => {
      reveal.report = true;
    });
    return;
  }
  reveal.beat = index;
  scene?.beat(beat.beat);
  sequence.later(2800, () => playBeat(index + 1));
}

function skipReveal(): void {
  sequence.clear();
  scene?.beat(null);
  scene?.finale();
  reveal.beat = RECONSTRUCTION.length - 1;
  reveal.done = true;
  reveal.report = true;
  sound.cue("stamp");
}

function resetState(): void {
  sequence.clear();
  crowd.clear();
  partnerTimer.clear();
  toastTimer.clear();
  bannerTimer.clear();
  Object.assign(game, createCase(mode.value));
  calls.value = [];
  Object.assign(credits, emptyCredits());
  energy.value = 30;
  shareChoice.value = "";
  partnerNote.value = "";
  ownDoneAnnounced = false;
  partnerChat = 0;
  unread.value = 0;
  feed.value = [];
  popups.value = [];
  selected.value = [];
  for (const claim of CLAIMS) challengePick[claim.id] = "";
  for (const item of TABS) unseen[item.id] = false;
  tab.value = "chat";
  fileOpen.value = false;
  findsOpen.value = false;
  composerOpen.value = false;
  optionsOpen.value = false;
  roomView.value = true;
  discovery.value = null;
  foundNotice.value = null;
  collectedArt.clear();
  toast.value = null;
  delta.value = null;
  banner.value = null;
  latestHint.value = null;
  cursor.active = false;
  opening.step = "cover";
  opening.line = 0;
  opening.typed = "";
  opening.cast = -1;
  reveal.beat = -1;
  reveal.done = false;
  reveal.report = false;
  newBest.value = false;
  scene?.reset();
  scene?.setPhase("opening");
  updateMood();
  void nextTick(() => openButton.value?.focus());
}

// The cover offers solo play or co-op with Station B. The choice holds for "Play again".
function chooseMode(next: CaseMode): void {
  if (game.phase !== "opening" || mode.value === next) return;
  mode.value = next;
  Object.assign(game, createCase(next));
}

function restart(): void {
  if (game.phase === "investigating" && !window.confirm("Restart the case? Your progress in this run is lost.")) return;
  resetState();
}

watch(
  () => reveal.report,
  (on) => {
    window.cancelAnimationFrame(countFrame);
    if (!on) return;
    const target = report.value.total;
    void nextTick(() => reportHeading.value?.focus());
    if (reduceMotion.value) {
      shownScore.value = target;
      return;
    }
    const startAt = window.performance.now();
    const step = (time: number): void => {
      const p = Math.min(1, (time - startAt) / 1400);
      shownScore.value = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) countFrame = window.requestAnimationFrame(step);
    };
    countFrame = window.requestAnimationFrame(step);
  },
);

watch(reduceMotion, (value) => scene?.setReducedMotion(value));
watch(
  () => siteSettings.soundOn,
  (on) => sound.setMuted(!on),
);

// The camera moves; the label layer follows it with one transform per frame, outside Vue's reactivity.
function placeOverlay(next: StageTransform): void {
  transform = next;
  const el = overlay.value;
  if (el) el.style.transform = `translate(${next.tx}px, ${next.ty}px) scale(${next.k})`;
}

function at(x: number, y: number): Record<string, string> {
  return { left: `${x}px`, top: `${y}px` };
}

function onLightning(strength: number): void {
  sound.thunder(strength, 0.7 + (1 - strength) * 2.2);
}

onMounted(async () => {
  window.addEventListener("keydown", workspaceKey);
  clockTimer = window.setInterval(() => {
    if (game.phase !== "investigating") return;
    now.value = Date.now();
    tickCommunity(now.value);
  }, 500);
  const host = sceneHost.value;
  if (!host) return;
  try {
    // PixiJS loads on demand, so the page and its controls work before (or without) the scene.
    const { createStudyScene } = await import("../scene/studyScene");
    const created = await createStudyScene(host, {
      reduced: reduceMotion.value,
      ...(stageEl.value ? { pointerTarget: stageEl.value } : {}),
      onLightning,
      onCamera: placeOverlay,
    });
    if (disposed) {
      created.destroy();
      return;
    }
    scene = created;
    scene.setPhase(game.phase);
    scene.setFound(game.found);
    scene.setSuspects(suspects.value);
    scene.setThreads(game.links);
  } catch (error) {
    sceneFailed.value = true;
    assist.value = true;
    console.warn("The study scene could not start", error);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", workspaceKey);
  disposed = true;
  sequence.clear();
  crowd.clear();
  partnerTimer.clear();
  toastTimer.clear();
  bannerTimer.clear();
  window.cancelAnimationFrame(countFrame);
  if (clockTimer !== null) window.clearInterval(clockTimer);
  scene?.destroy();
  scene = null;
  sound.dispose();
});
</script>

<template>
  <PlateFrame active="cases" game immersive>
    <GameWorkspace class="sc-workspace" :title="CASE_TITLE" label="Practice / scripted chat" cinematic :panel="findsOpen ? 'finds' : null" panel-title="Objects to find" @close-panel="findsOpen = false">
      <template #actions>
        <div v-if="game.phase !== 'opening'" class="sc-workspace-stats"><span aria-label="Case score"><small>Score</small><strong :key="report.total">{{ fmt(report.total) }}</strong></span><span aria-label="Case elapsed time"><small>Case time</small><strong>{{ elapsedLabel }}</strong></span></div>
        <button v-if="game.phase !== 'opening'" class="sc-header-hint" type="button" :disabled="!canAct || (searching ? hintWait > 0 : hintsLeft === 0)" @click="askHint"><SiteIcon name="hint" /><span>Hint</span></button>
      </template>
    <div class="sc" :data-phase="game.phase" :class="{ 'is-room': roomView, 'has-file': fileOpen, 'is-deduction': !roomView }">


      <div class="sc-grid">
        <div class="sc-stage-wrap">
          <div class="sc-stage-box">
            <div class="sc-stage-scroller">
              <div ref="stageEl" class="sc-stage" :class="{ 'is-failed': sceneFailed, 'is-searching': searching }">
                <div ref="sceneHost" class="sc-canvas" aria-hidden="true"></div>
                <p v-if="sceneFailed" class="sc-fallback">
                  The animated room could not start in this browser. Assist mode is on, so the list below still
                  finds every object.
                </p>

                <!-- The search surface takes clicks and the keyboard cursor. -->
                <div
                  v-if="searching"
                  ref="searchSurface"
                  class="sc-search"
                  :tabindex="fileOpen || findsOpen ? -1 : 0"
                  role="application"
                  aria-roledescription="search grid"
                  :aria-label="`Search the study. Arrow keys move the cell cursor, now on ${cursorCell}. Enter searches that cell.`"
                  @click="onStageClick"
                  @keydown="onSearchKey"
                  @focus="onSurfaceFocus"
                  @blur="cursor.active = false"
                ></div>

                <!-- Labels, grid, and popups live in design units; placeOverlay keeps them on the camera. -->
                <div
                  ref="overlay"
                  class="sc-overlay"
                  :style="{ width: `${DESIGN_W}px`, height: `${DESIGN_H}px` }"
                  aria-hidden="true"
                >
                  <div v-if="gridVisible" class="sc-gridlines">
                    <span
                      v-for="cell in cells"
                      :key="cell.id"
                      class="sc-cell"
                      :class="{ 'is-cursor': cursor.active && cell.id === cursorCell }"
                      :style="{ ...at(cell.x, cell.y), width: `${GRID_CELL_W}px`, height: `${GRID_CELL_H}px` }"
                      ><span>{{ cell.id }}</span></span
                    >
                  </div>
                  <template v-if="game.phase === 'investigating' && !searching">
                    <span
                      v-for="suspect in SUSPECTS"
                      :key="suspect.id"
                      class="sc-name"
                      :data-state="suspects[suspect.id]"
                      :style="at(SUSPECT_ANCHORS[suspect.id].x, SUSPECT_ANCHORS[suspect.id].y)"
                    >
                      {{ suspect.name }}
                      <small>{{ suspects[suspect.id] === "cleared" ? "Cleared" : suspect.role }}</small>
                    </span>
                  </template>
                  <span
                    v-for="call in calls"
                    :key="`call-${call.id}`"
                    class="sc-ping"
                    :data-hue="viewerById(call.viewer)?.tone"
                    :style="at(call.x, call.y)"
                  >
                    <span class="sc-ping-ring"></span>
                    <span class="sc-ping-tag"><b>{{ call.cell }}</b>{{ call.viewer }}</span>
                  </span>
                  <span
                    v-for="item in popups"
                    :key="item.id"
                    class="sc-popup"
                    :class="`is-${item.tone}`"
                    :style="at(item.x, item.y)"
                  >
                    {{ item.text }}<small v-if="item.sub">{{ item.sub }}</small>
                  </span>
                </div>

              </div>
            </div>
                <!-- Viewport controls stay in place while the room pans beneath them. -->
                <div v-if="game.phase === 'investigating'" class="sc-objective" :title="objective">
                  <SiteIcon :name="searching ? 'search' : 'target'" />
                  <p>{{ objectiveShort }}</p>
                </div>
                <p v-if="latestHint && !searching && game.phase === 'investigating'" class="sc-hint-chip">
                  <SiteIcon name="hint" /> {{ latestHint }}
                </p>

                <p v-if="banner" :key="banner.seq" class="sc-banner-stage" aria-hidden="true">{{ banner.text }}</p>

                <p class="sc-toast" role="status" aria-live="polite">
                  <span v-if="toast && game.phase === 'investigating'" :key="toast.seq" :data-tone="toast.tone">{{
                    toast.text
                  }}</span>
                </p>
            <!-- The opening stays inside the viewport, with space for the translucent controls. -->
            <section
              v-if="game.phase === 'opening'"
              class="sc-opening"
              :data-step="opening.step"
              aria-labelledby="sc-opening-title"
            >
              <div v-if="opening.step === 'cover'" class="sc-cover">
                <p class="sc-eyebrow">Sample case &middot; Ashgrove House</p>
                <h2 id="sc-opening-title" class="sc-cover-title">A rare manuscript is missing.</h2>
                <p class="sc-cover-lede">{{ CASE_PREMISE }}</p>
                <fieldset class="sc-mode">
                  <legend class="visually-hidden">How to play</legend>
                  <label class="sc-mode-opt">
                    <input
                      type="radio"
                      name="sc-mode"
                      value="solo"
                      :checked="mode === 'solo'"
                      @change="chooseMode('solo')"
                    />
                    <SiteIcon name="search" />
                    <span><strong>Solo</strong><small>You and your chat search the whole study.</small></span>
                  </label>
                  <label class="sc-mode-opt">
                    <input
                      type="radio"
                      name="sc-mode"
                      value="coop"
                      :checked="mode === 'coop'"
                      @change="chooseMode('coop')"
                    />
                    <SiteIcon name="people" />
                    <span
                      ><strong>Co-op with Station B</strong
                      ><small>A partner station holds the hall desk. Trade records to finish the proof.</small></span
                    >
                  </label>
                </fieldset>
                <div class="sc-actions">
                  <button ref="openButton" class="btn gold" type="button" @click="openCase">
                    <SiteIcon name="play" /> Open the case
                  </button>
                  <button class="btn ghost" type="button" @click="beginInvestigation">Skip the intro</button>
                </div>
                <p class="sc-fine">
                  Sound is {{ siteSettings.soundOn ? "on" : "off" }}. The case runs in this browser; nothing is sent to
                  Twitch or saved on the server.
                </p>
              </div>

              <template v-else>
                <h2 id="sc-opening-title" class="visually-hidden">Case briefing</h2>
                <ol class="visually-hidden">
                  <li v-for="line in OPENING_LINES" :key="line">{{ line }}</li>
                  <li v-for="suspect in SUSPECTS" :key="suspect.id">
                    {{ suspect.name }}, {{ suspect.role }}: {{ suspect.statement }}
                  </li>
                </ol>
                <div class="sc-subtitle" aria-hidden="true">
                  <template v-if="opening.step === 'story'">
                    <span class="sc-subtitle-count">{{ opening.line + 1 }} / {{ OPENING_LINES.length }}</span>
                    <p class="sc-subtitle-line">{{ opening.typed }}<span class="sc-caret"></span></p>
                  </template>
                  <template v-else-if="opening.step === 'cast'">
                    <span class="sc-subtitle-count">The suspects</span>
                    <p class="sc-subtitle-name">
                      {{ SUSPECTS[opening.cast]?.name }} <small>{{ SUSPECTS[opening.cast]?.role }}</small>
                    </p>
                    <p class="sc-subtitle-line">&ldquo;{{ SUSPECTS[opening.cast]?.statement }}&rdquo;</p>
                  </template>
                </div>
                <div v-if="opening.step === 'ready'" class="sc-ready">
                  <ul class="sc-cast-row" aria-label="Suspects">
                    <li v-for="suspect in SUSPECTS" :key="suspect.id">
                      <SuspectPortrait class="sc-portrait" :kind="CAST_PORTRAITS[suspect.id]" />
                      <span
                        ><strong>{{ suspect.name }}</strong> {{ suspect.role }}</span
                      >
                    </li>
                  </ul>
                  <p class="sc-goal">
                    <strong>Your job:</strong> search the study for twelve objects, then prove who took the manuscript.
                    In this sample, chat commands search by grid cell, such as <code>!look H3</code>.
                  </p>
                  <button ref="startButton" class="btn gold" type="button" @click="beginInvestigation">
                    <SiteIcon name="search" /> Start the search
                  </button>
                </div>
                <button v-else class="btn sm ghost sc-skip" type="button" @click="finishOpening">Skip</button>
              </template>
            </section>

            <section v-if="game.phase === 'solved'" class="sc-reveal" aria-labelledby="sc-reveal-title">
              <p class="sc-stamp" :class="{ 'is-landed': reveal.done }">Case closed</p>
              <h2 id="sc-reveal-title" ref="revealHeading" tabindex="-1" class="sc-reveal-title">{{ REVEAL_TITLE }}</h2>
              <ol class="sc-beats" aria-live="polite">
                <li
                  v-for="(item, index) in RECONSTRUCTION"
                  v-show="index <= reveal.beat"
                  :key="item.time"
                  :class="{ 'is-current': index === reveal.beat && !reveal.done }"
                >
                  <span class="sc-beat-time">{{ item.time }}</span> {{ item.text }}
                </li>
              </ol>
              <p v-if="reveal.done" class="sc-twist">{{ REVEAL_TWIST }}</p>
              <p class="visually-hidden">{{ REVEAL_BODY }}</p>
              <button v-if="!reveal.report" class="btn sm ghost sc-skip" type="button" @click="skipReveal">
                Skip to the report
              </button>
            </section>
          </div>

        </div>

        <aside id="sc-case-file" class="sc-desk" aria-label="Case file">
          <button v-if="roomView && game.phase !== 'opening'" class="sc-file-close" type="button" @click="closeFile"><SiteIcon name="close" /> Close case file</button>
          <div v-if="!roomView && game.phase !== 'opening'" class="sc-deduction-heading"><span>Search complete</span><h2>Reconstruct the evening</h2><p>{{ objective }}</p></div>
          <section v-if="!reveal.report" class="panel sc-desk-panel">
            <div class="sc-tablist" role="tablist" aria-label="Case file">
              <button
                v-for="item in TABS"
                :id="`sc-tab-${item.id}`"
                :key="item.id"
                type="button"
                role="tab"
                class="sc-tab"
                :aria-selected="tab === item.id"
                :aria-controls="`sc-panel-${item.id}`"
                :tabindex="tab === item.id ? 0 : -1"
                @click="selectTab(item.id)"
                @keydown="onTabKey($event, item.id)"
              >
                <SiteIcon :name="item.icon" />
                <span class="sc-tab-label">{{ item.label }}</span>
                <span class="sc-tab-count">{{ counts[item.id] }}</span>
                <span v-if="unseen[item.id] && tab !== item.id" class="sc-new"><span class="visually-hidden">, new</span></span>
              </button>
            </div>

            <!-- Chat: the crew, Station B in co-op, and the feed. It reads like a stream chat: names in colour,
                 commands as code, results from the case in between. -->
            <div
              v-show="tab === 'chat'"
              id="sc-panel-chat"
              class="sc-panel sc-panel--chat"
              role="tabpanel"
              aria-labelledby="sc-tab-chat"
              tabindex="-1"
            >
              <div class="sc-chat-bar">
                <span class="tag subtle">Scripted sample &middot; not Twitch</span>
                <div class="sc-seg" role="group" aria-label="Show messages">
                  <button type="button" :aria-pressed="chatFilter === 'all'" @click="chatFilter = 'all'">All</button>
                  <button type="button" :aria-pressed="chatFilter === 'commands'" @click="chatFilter = 'commands'">
                    Commands
                  </button>
                </div>
              </div>
              <div class="sc-crew">
                <ol class="sc-crew-top" aria-label="Top of the crew">
                  <li v-for="row in crew.slice(0, 3)" :key="row.id">
                    <span class="sc-who" :data-hue="row.tone">{{ row.id }}</span>
                    <strong>{{ row.points }}</strong>
                  </li>
                </ol>
                <div
                  class="sc-energy"
                  role="meter"
                  aria-label="Chat energy"
                  :aria-valuenow="Math.round(energy)"
                  aria-valuemin="0"
                  aria-valuemax="100"
                >
                  <span>Energy</span>
                  <span class="sc-energy-bar" aria-hidden="true"><span :style="{ width: `${energy}%` }"></span></span>
                </div>
              </div>
              <section v-if="coop" class="sc-partner" aria-labelledby="sc-partner-title">
                <SuspectPortrait class="sc-partner-face" kind="beard" />
                <div class="sc-partner-body">
                  <h3 id="sc-partner-title" class="sc-partner-name">
                    {{ PARTNER_NAME }} <small>{{ PARTNER_STATION }}</small>
                  </h3>
                  <p class="sc-partner-note">{{ partnerNote || "Waiting for the case to open." }}</p>
                  <div v-if="openAsk" class="sc-partner-ask">
                    <span
                      >Asks for <strong>{{ openAsk.label }}</strong></span
                    >
                    <button
                      class="btn tiny gold"
                      type="button"
                      :disabled="!canAct || !openAsk.ready"
                      @click="sendToPartner(openAsk.wants)"
                    >
                      {{ openAsk.ready ? "Send" : "Not found yet" }}
                    </button>
                  </div>
                  <form class="sc-partner-share" @submit.prevent="sendToPartner(shareChoice)">
                    <label for="sc-share" class="visually-hidden">Send a record to Station B</label>
                    <select id="sc-share" v-model="shareChoice" :disabled="!canAct || shareable.length === 0">
                      <option value="">Send a record&hellip;</option>
                      <option v-for="id in shareable" :key="id" :value="id">{{ id }}</option>
                    </select>
                    <button class="btn tiny" type="submit" :disabled="!canAct || !shareChoice">Send</button>
                  </form>
                </div>
              </section>
              <div class="sc-feed-wrap">
                <ol
                  ref="feedEl"
                  class="sc-feed"
                  role="log"
                  aria-live="off"
                  aria-label="Chat and case results"
                  @scroll.passive="onFeedScroll"
                >
                  <li v-if="shownFeed.length === 0" class="sc-feed-empty">
                    {{ feed.length === 0 ? "Chat wakes up when the case opens." : "No commands yet." }}
                  </li>
                  <li
                    v-for="line in shownFeed"
                    :key="line.id"
                    :data-who="line.who"
                    :data-tone="line.tone"
                    :data-command="line.text.startsWith('!') ? 'true' : undefined"
                  >
                    <span class="sc-who" :data-hue="line.hue">{{
                      line.who === "crowdB" ? `B · ${line.name}` : line.name
                    }}</span>
                    <span class="sc-msg"
                      >{{ line.text
                      }}<button
                        v-if="isLiveCall(line.call)"
                        class="sc-follow"
                        type="button"
                        :aria-label="`Follow ${line.name}'s call: ${line.text}`"
                        @click="followFromFeed(line.call)"
                      >
                        Follow
                      </button></span
                    >
                  </li>
                </ol>
                <button v-if="unread > 0" type="button" class="sc-unread" @click="jumpToLatest">
                  <SiteIcon name="arrow-down" /> {{ unread }} new {{ unread === 1 ? "message" : "messages" }}
                </button>
              </div>
            </div>

            <div
              v-show="tab === 'notebook'"
              id="sc-panel-notebook"
              class="sc-panel"
              role="tabpanel"
              aria-labelledby="sc-tab-notebook"
              tabindex="0"
            >
              <p v-if="notebook.length === 0" class="sc-empty">Nothing found yet. The list is under the room.</p>
              <ul v-else class="sc-list">
                <li v-for="item in notebook" :key="item.id">
                  <article class="sc-card sc-clue" :class="{ 'is-clue': item.clue !== null }">
                    <header class="sc-card-head">
                      <span class="sc-id">{{ item.id }}</span>
                      <span class="sc-where">{{
                        item.clue ? CLUES.find((clue) => clue.id === item.clue)?.place : "Object"
                      }}</span>
                      <span v-if="item.clue" class="tag subtle">Clue</span>
                    </header>
                    <h3 class="sc-card-title">{{ item.label }}</h3>
                    <p class="sc-card-text">
                      {{ item.clue ? CLUES.find((clue) => clue.id === item.clue)?.observation : item.note }}
                    </p>
                    <ul v-if="item.clue" class="sc-chiprow" aria-label="Records released">
                      <li
                        v-for="id in CLUES.find((clue) => clue.id === item.clue)?.releases ?? []"
                        :key="id"
                        class="tag subtle"
                      >
                        {{ id }}
                      </li>
                    </ul>
                  </article>
                </li>
              </ul>
            </div>

            <div
              v-show="tab === 'board'"
              id="sc-panel-board"
              class="sc-panel"
              role="tabpanel"
              aria-labelledby="sc-tab-board"
              tabindex="0"
            >
              <p class="sc-intro">Pick two records that explain each other.</p>
              <div v-if="coop && openAsk" class="sc-request">
                <SiteIcon name="people" />
                <p>
                  <strong>Station B asks for {{ openAsk.label }}.</strong>
                  {{ openAsk.ready ? "Send it to keep both stations moving." : "Find it in the room first." }}
                </p>
                <button
                  class="btn sm gold"
                  type="button"
                  :disabled="!canAct || !openAsk.ready"
                  @click="sendToPartner(openAsk.wants)"
                >
                  <SiteIcon name="send" /> Send
                </button>
              </div>
              <p v-if="records.length === 0" class="sc-empty">Find clues in the room to put records on the board.</p>
              <ul v-else class="sc-records">
                <li v-for="item in records" :key="item.id">
                  <button
                    type="button"
                    class="sc-record"
                    :class="{ 'is-linked': isLinked(item.id) }"
                    :aria-pressed="selected.includes(item.id)"
                    :disabled="!canAct"
                    @click="toggleEvidence(item.id)"
                  >
                    <span class="sc-id">{{ item.id }}</span>
                    <strong>{{ item.label }}</strong>
                    <span class="sc-detail">{{ item.detail }}</span>
                  </button>
                  <button class="sc-record-inspect" type="button" :aria-label="`Inspect ${item.label}`" @click="inspectRecord(item.id)"><SiteIcon name="search" /> Inspect</button>
                </li>
              </ul>
              <div class="sc-panel-actions">
                <button
                  class="btn sm gold"
                  type="button"
                  :disabled="!canAct || selected.length !== 2"
                  @click="linkSelected"
                >
                  <SiteIcon name="link" /> Link selected ({{ selected.length }}/2)
                </button>
                <button v-if="selected.length > 0" class="btn sm ghost" type="button" @click="selected = []">
                  Clear selection
                </button>
              </div>
              <h3 class="sc-sub">Deductions &middot; {{ foundLinks.length }} of {{ LINKS.length }}</h3>
              <p v-if="foundLinks.length === 0" class="sc-empty">No deduction yet.</p>
              <ul v-else class="sc-list">
                <li v-for="entry in foundLinks" :key="entry.id" class="sc-card sc-deduction">
                  <h4 class="sc-card-title">
                    <SiteIcon name="link" /> {{ entry.title }}
                    <span v-if="entry.required" class="tag success">Part of the proof</span>
                  </h4>
                  <p class="sc-card-text">{{ entry.text }}</p>
                </li>
              </ul>
            </div>

            <div
              v-show="tab === 'timeline'"
              id="sc-panel-timeline"
              class="sc-panel"
              role="tabpanel"
              aria-labelledby="sc-tab-timeline"
              tabindex="0"
            >
              <p class="sc-intro">Put the evening in order, first to last.</p>
              <ol class="sc-events">
                <li
                  v-for="(event, index) in timelineCards"
                  :key="event.id"
                  class="sc-event"
                  :class="{ 'is-locked': !eventAvailable(game, event.id), 'is-fixed': game.timelineSolved }"
                >
                  <span class="sc-pos" aria-hidden="true">{{ index + 1 }}</span>
                  <div class="sc-event-body">
                    <span class="sc-id">{{ event.id }}</span>
                    <strong>{{ eventAvailable(game, event.id) ? event.label : "An event without its record" }}</strong>
                    <span class="sc-detail">{{ eventNote(event) }}</span>
                  </div>
                  <div v-if="!game.timelineSolved" class="sc-move">
                    <button
                      :id="`sc-move-${event.id}-up`"
                      class="btn tiny ghost"
                      type="button"
                      :disabled="index === 0 || !canAct"
                      :aria-label="`Move ${event.id} earlier`"
                      @click="moveEvent(index, -1)"
                    >
                      <SiteIcon name="arrow-up" />
                    </button>
                    <button
                      :id="`sc-move-${event.id}-down`"
                      class="btn tiny ghost"
                      type="button"
                      :disabled="index === timelineCards.length - 1 || !canAct"
                      :aria-label="`Move ${event.id} later`"
                      @click="moveEvent(index, 1)"
                    >
                      <SiteIcon name="arrow-down" />
                    </button>
                  </div>
                </li>
              </ol>
              <div class="sc-panel-actions">
                <button
                  class="btn sm gold"
                  type="button"
                  :disabled="!canAct || !allEventsReady || game.timelineSolved"
                  @click="checkOrder"
                >
                  <SiteIcon name="clock" /> Check the order
                </button>
              </div>
              <p v-if="!allEventsReady" class="sc-empty">
                {{ EVENTS.length - readyEvents }} of {{ EVENTS.length }} events still need their record.
              </p>
              <p v-if="game.timelineSolved" class="sc-banner"><SiteIcon name="check" /> {{ TIMELINE_RESULT }}</p>
            </div>

            <div
              v-show="tab === 'claims'"
              id="sc-panel-claims"
              class="sc-panel"
              role="tabpanel"
              aria-labelledby="sc-tab-claims"
              tabindex="0"
            >
              <p class="sc-intro">Break a theory with the one record it cannot survive.</p>
              <ul class="sc-list">
                <li
                  v-for="claim in raisedClaims"
                  :key="claim.id"
                  class="sc-card sc-claim"
                  :data-status="game.claims[claim.id]"
                >
                  <header class="sc-card-head">
                    <span class="sc-id">{{ claim.id }}</span>
                    <span class="sc-where">{{ claim.source === "chat" ? "Chat says" : "Ada Wren says" }}</span>
                    <span class="tag" :class="game.claims[claim.id] === 'contradicted' ? 'success' : 'subtle'">{{
                      game.claims[claim.id] === "contradicted" ? "Disproven" : "Standing"
                    }}</span>
                  </header>
                  <p class="sc-claim-text">&ldquo;{{ claim.claim }}&rdquo;</p>
                  <p class="sc-poll">
                    <span class="sc-poll-label">Chat believes it</span>
                    <span class="sc-poll-bar" aria-hidden="true"
                      ><span :style="{ width: `${beliefOf(claim.id)}%` }"></span
                    ></span>
                    <strong>{{ beliefOf(claim.id) }}%</strong>
                  </p>
                  <p v-if="game.claims[claim.id] === 'contradicted'" class="sc-card-text">{{ claim.contradiction }}</p>
                  <div v-else class="sc-challenge">
                    <label :for="`sc-challenge-${claim.id}`">Challenge with</label>
                    <select
                      :id="`sc-challenge-${claim.id}`"
                      v-model="challengePick[claim.id]"
                      :disabled="!canAct || records.length === 0"
                    >
                      <option value="">Choose a record</option>
                      <option v-for="item in records" :key="item.id" :value="item.id">
                        {{ item.id }} &middot; {{ item.label }}
                      </option>
                    </select>
                    <button
                      class="btn sm gold"
                      type="button"
                      :disabled="!canAct || !challengePick[claim.id]"
                      @click="challenge(claim.id)"
                    >
                      <SiteIcon name="scales" /> Challenge
                    </button>
                  </div>
                </li>
              </ul>
              <p v-if="raisedClaims.length < CLAIMS.length" class="sc-empty">
                More theories appear in chat as the room gives them up.
              </p>
            </div>

            <div
              v-show="tab === 'verdict'"
              id="sc-panel-verdict"
              class="sc-panel"
              role="tabpanel"
              aria-labelledby="sc-tab-verdict"
              tabindex="0"
            >
              <ul class="sc-proof" aria-label="Proof">
                <li :class="{ 'is-ok': proof.link }">
                  <SiteIcon :name="proof.link ? 'check' : 'square'" />
                  <span>A deduction that times the theft</span><small>Board</small>
                </li>
                <li :class="{ 'is-ok': proof.timeline }">
                  <SiteIcon :name="proof.timeline ? 'check' : 'square'" />
                  <span>The evening in order</span><small>Timeline</small>
                </li>
                <li :class="{ 'is-ok': proof.claim }">
                  <SiteIcon :name="proof.claim ? 'check' : 'square'" />
                  <span>A false statement broken</span><small>Claims</small>
                </li>
              </ul>
              <ul class="sc-list">
                <li
                  v-for="suspect in SUSPECTS"
                  :key="suspect.id"
                  class="sc-card sc-suspect"
                  :data-state="suspects[suspect.id]"
                  :class="{ 'is-accused': game.accused.includes(suspect.id) }"
                >
                  <SuspectPortrait class="sc-portrait" :kind="CAST_PORTRAITS[suspect.id]" />
                  <div class="sc-suspect-body">
                    <h3 class="sc-card-title">{{ suspect.name }}</h3>
                    <span class="sc-where">
                      {{ suspect.role }} &middot; <span class="sc-id">{{ suspect.id }}</span>
                      <template v-if="suspects[suspect.id] === 'cleared'"> &middot; Cleared</template>
                    </span>
                    <p class="sc-card-text">&ldquo;{{ suspect.statement }}&rdquo;</p>
                    <p class="sc-poll sc-poll--pick">
                      <span class="sc-poll-label">Chat’s pick</span>
                      <span class="sc-poll-bar" aria-hidden="true"
                        ><span :style="{ width: `${pick[suspect.id]}%` }"></span
                      ></span>
                      <strong>{{ pick[suspect.id] }}%</strong>
                    </p>
                  </div>
                  <button
                    class="btn sm"
                    :class="{ gold: proof.complete }"
                    type="button"
                    :disabled="!canAct || !proof.complete"
                    :aria-label="`Accuse ${suspect.name}`"
                    @click="accuse(suspect.id)"
                  >
                    Accuse
                  </button>
                </li>
              </ul>
              <p v-if="!proof.complete" class="sc-empty">Accusations open when all three parts of the proof hold.</p>
            </div>

            <!-- The command line stays under every tab, like a stream chat box. -->
            <div class="sc-desk-foot">

              <details class="sc-help">
                <summary>Commands</summary>
                <dl>
                  <div><dt><code>!look H3</code></dt><dd>Search a grid cell of the room (turn on Grid).</dd></div>
                  <div><dt><code>!link &lt;record&gt; &lt;record&gt;</code></dt><dd>Link two records by their IDs.</dd></div>
                  <div><dt><code>!order &lt;event&gt; &hellip;</code></dt><dd>Check all six events in order.</dd></div>
                  <div><dt><code>!challenge &lt;claim&gt; &lt;record&gt;</code></dt><dd>Test a claim with a record.</dd></div>
                  <div><dt><code>!hint</code></dt><dd>Take a hint (costs points).</dd></div>
                  <div><dt><code>!solve &lt;suspect&gt;</code></dt><dd>Name GARDENER, GUEST, or CLERK once the proof holds.</dd></div>
                  <div v-if="coop">
                    <dt><code>!share CLOCK_STOP</code></dt>
                    <dd>Send a record to Station B.</dd>
                  </div>
                </dl>
              </details>
            </div>
          </section>

          <section v-else class="panel sc-report" aria-labelledby="sc-report-title">
            <div class="panel-head">
              <h2 id="sc-report-title" ref="reportHeading" tabindex="-1" class="panel-title">Case report</h2>
              <span class="tag success">SOLVED</span>
            </div>
            <div class="panel-body">
              <div class="sc-rating">
                <div class="sc-seals" :aria-label="`${report.seals} of 3 seals`" role="img">
                  <span v-for="n in 3" :key="n" class="sc-seal" :class="{ 'is-on': n <= report.seals }" aria-hidden="true"
                    ><SiteIcon name="sparkle"
                  /></span>
                </div>
                <span class="sc-rating-stamp">{{ report.rating }}</span>
              </div>
              <p class="sc-final">
                <strong>{{ fmt(shownScore) }}</strong><span>points</span>
              </p>
              <p class="sc-card-text">{{ report.note }}</p>
              <dl class="sc-facts">
                <div>
                  <dt>Case time</dt>
                  <dd>{{ elapsedLabel }}</dd>
                </div>
                <div>
                  <dt>Search time</dt>
                  <dd>{{ searchLabel }}</dd>
                </div>
                <div>
                  <dt>Best combo</dt>
                  <dd>&times;{{ game.bestCombo }}</dd>
                </div>
                <div>
                  <dt>Best here</dt>
                  <dd>{{ best === null ? "—" : fmt(best) }}<span v-if="newBest" class="sc-newbest"> New best</span></dd>
                </div>
              </dl>
              <h3 class="sc-sub">Your crew</h3>
              <p v-if="mvp" class="sc-mvp">
                <SiteIcon name="sparkle" />
                <span
                  >MVP <strong :data-hue="mvp.tone">{{ mvp.id }}</strong>: {{ mvp.finds }}
                  {{ mvp.finds === 1 ? "call" : "calls" }} you followed to a find, {{ mvp.spotted }} spotted.</span
                >
              </p>
              <p v-else class="sc-card-text">No call led to a find this time. Follow chat’s calls to share the credit.</p>
              <ol class="sc-crew-list">
                <li v-for="row in crew.slice(0, 4)" :key="row.id">
                  <span class="sc-who" :data-hue="row.tone">{{ row.id }}</span>
                  <span class="sc-crew-stats">{{ row.finds }} found &middot; {{ row.spotted }} spotted &middot; {{ row.misses }} missed</span>
                  <strong>{{ row.points }}</strong>
                </li>
              </ol>
              <p class="sc-card-text">
                {{
                  chatCalled.right
                    ? `Chat called it: ${chatCalled.share}% named ${chatCalled.name}.`
                    : `Chat leaned toward ${chatCalled.name} (${chatCalled.share}%). The evidence did not.`
                }}
              </p>
              <p v-if="coop" class="sc-card-text">
                Station B shared {{ game.partnerFound.length }} of {{ PARTNER_ITEMS.length }} hall-desk objects. You
                answered {{ answeredAsks }} of {{ game.requests.length }} of Hale’s requests.
              </p>
              <h3 class="sc-sub">Points</h3>
              <ul class="sc-lines">
                <li v-for="line in report.earned" :key="line.label">
                  <span>{{ line.label }}</span><strong class="is-up">+{{ fmt(line.points) }}</strong>
                </li>
                <li v-for="line in report.lost" :key="line.label">
                  <span>{{ line.label }}</span><strong class="is-down">&minus;{{ fmt(Math.abs(line.points)) }}</strong>
                </li>
              </ul>
              <details v-if="report.missed.length > 0" class="sc-missed">
                <summary>What you missed ({{ report.missed.length }})</summary>
                <ul>
                  <li v-for="line in report.missed" :key="line">{{ line }}</li>
                </ul>
              </details>
              <div class="sc-actions">
                <button class="btn gold" type="button" @click="resetState">
                  <SiteIcon name="restart" /> Play again
                </button>
                <a class="btn ghost" href="/play">Run a live case <SiteIcon name="arrow-right" /></a>
              </div>
              <p class="sc-fine">
                This score stays in this browser. In a live round the server checks every command from Twitch chat.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
      <template #panel>          <section class="sc-findbar" aria-labelledby="sc-findbar-title">
            <div class="sc-findbar-head">
              <h2 id="sc-findbar-title" class="sc-findbar-title">
                Find in the study <span>{{ foundCount }}/{{ FIND_ITEMS.length }}</span>
              </h2>
              <p v-if="comboLive" :key="game.lastFindAt ?? 0" class="sc-combo" aria-live="off">
                Combo &times;{{ game.combo }}<span class="sc-combo-bar"></span>
              </p>
              <div class="sc-findbar-tools">
                <button
                  class="btn tiny ghost"
                  type="button"
                  :aria-pressed="gridOn"
                  :disabled="!searching"
                  @click="gridOn = !gridOn"
                >
                  Grid
                </button>
                <button
                  class="btn tiny ghost"
                  type="button"
                  :aria-pressed="assist"
                  aria-describedby="sc-assist-note"
                  @click="assist = !assist"
                >
                  Assist
                </button>
              </div>
            </div>
            <p v-if="game.phase === 'investigating'" class="sc-objective-mobile">{{ objective }}</p>
            <p id="sc-assist-note" class="sc-assist-note">
              {{
                assist
                  ? "Assist is on: select a name to find it. Assisted finds score, but end combos and the time bonus."
                  : "Quick finds build a combo. Turn on Grid for chat cells. Pan the room on a small screen."
              }}
            </p>
            <ul class="sc-findlist">
              <li
                v-for="item in FIND_ITEMS"
                :key="item.id"
                :class="{ 'is-found': game.found.includes(item.id), 'is-clue': item.clue !== null }"
              >
                <button
                  v-if="assist && searching && !game.found.includes(item.id) && !isStationB(item.id)"
                  class="sc-find-button"
                  type="button"
                  @click="findFromList(item.id)"
                >
                  Find {{ item.label }}
                </button>
                <button v-else-if="game.found.includes(item.id)" class="sc-find-label sc-collected-find" type="button" :aria-label="`Inspect ${item.label}`" @click="inspectCollected(item.id)"><SiteIcon name="check" /><span>{{ item.label }}</span><SiteIcon name="eye" /></button>
                <span v-else class="sc-find-label">
                  <SiteIcon v-if="game.found.includes(item.id)" name="check" />
                  <span>{{ item.label }}</span>
                  <small v-if="isStationB(item.id)" class="sc-find-b" aria-hidden="true">B</small>
                  <span v-if="isStationB(item.id)" class="visually-hidden">, at Station B</span>
                  <span v-if="game.found.includes(item.id)" class="visually-hidden">, found</span>
                </span>
              </li>
            </ul>
          </section></template>
      <template #tools>
        <template v-if="game.phase !== 'opening'">
        <div class="sc-primary-tools">
        <button v-if="searching" type="button" aria-label="Objects to find" :aria-pressed="findsOpen" @click="findsOpen = !findsOpen; fileOpen = false; roomView = true"><SiteIcon name="document" /><span>Finds <span class="sc-find-count" aria-hidden="true">{{ foundCount }}/{{ FIND_ITEMS.length }}</span></span></button>
        <button id="sc-room-tool" type="button" :aria-pressed="roomView && !fileOpen && !findsOpen" @click="closeFile"><SiteIcon name="search" /><span>Room</span></button>
        <button type="button" :aria-pressed="fileOpen && tab === 'chat'" aria-controls="sc-case-file" @click="fileOpen && tab === 'chat' ? closeFile() : openFile('chat')"><SiteIcon name="chat" /><span>Chat</span><span v-if="unseen.chat" class="sc-tool-new" aria-hidden="true"></span></button>
        <button type="button" aria-label="Case file" :aria-pressed="fileOpen && tab !== 'chat'" aria-controls="sc-case-file" @click="fileOpen && tab !== 'chat' ? closeFile() : openFile(tab === 'chat' ? 'notebook' : tab)"><SiteIcon name="document" /><span>Case file</span><span v-if="TABS.some(item => item.id !== 'chat' && unseen[item.id])" class="sc-tool-new" aria-hidden="true"></span></button>
        <button id="sc-command-toggle" type="button" aria-label="Open command input" :aria-expanded="composerOpen" aria-controls="sc-command-composer" title="Open commands (/)" @click="toggleComposer"><SiteIcon name="send" /><span class="sc-command-tool-label">Command</span><kbd aria-hidden="true">/</kbd></button>
        </div>
        <div class="sc-utility-tools">
        <button id="sc-options-toggle" type="button" aria-label="Case options" title="Case options" :aria-expanded="optionsOpen" aria-controls="sc-options-panel" @click="toggleOptions"><SiteIcon name="settings" /></button>
        </div>
        </template>
        <p v-else class="sc-intro-note">Practice case &middot; No Twitch chat &middot; Progress stays in this browser</p>
      </template>
      <template v-if="(composerOpen && game.phase === 'investigating') || optionsOpen" #composer>
        <section v-if="optionsOpen" id="sc-options-panel" class="sc-composer sc-options-panel" aria-label="Case options">
          <button id="sc-options-sound" type="button" :aria-pressed="siteSettings.soundOn" aria-label="Toggle sound" @click="toggleSound"><SiteIcon :name="siteSettings.soundOn ? 'sound-on' : 'sound-off'" />{{ siteSettings.soundOn ? 'Sound on' : 'Sound off' }}</button>
          <button type="button" aria-label="Restart case" @click="restart"><SiteIcon name="restart" /> Restart case</button>
        </section>
        <section v-else id="sc-command-composer" class="sc-composer" aria-label="Practice command input">
          <div class="sc-composer-heading"><label for="sc-command-input">Chat command</label><button type="button" aria-label="Close command input" @click="closeComposer"><SiteIcon name="close" /></button></div>
              <form class="sc-command" @submit.prevent="submitCommand">
                <input
                  id="sc-command-input"
                  v-model="command"
                  type="text"
                  maxlength="120"
                  autocomplete="off"
                  spellcheck="false"
                  :disabled="!canAct"
                  :placeholder="searching ? 'For example: !look C4' : 'For example: !hint'"
                  @keydown="onCommandKey"
                />
                <button class="btn sm gold" type="submit" :disabled="!canAct || command.trim() === ''">
                  <SiteIcon name="send" /> Send
                </button>
              </form>
          <p>Practice commands stay in this browser. Press Esc to close.</p>
        </section>
      </template>
      <template #notifications>
        <GameNotification :entry="foundNotice" />
        <GameNotification v-if="game.phase === 'investigating' && !(fileOpen && tab === 'chat')" :entry="crewNotice" kind="crew" />
      </template>
    </GameWorkspace>
    <EvidenceDialog v-if="discovery" :key="discovery.code" :title="discovery.title" :code="discovery.code" :text="discovery.text" :action="ownSearchDone(game) ? 'Open deduction board' : 'Read collected records'" @close="closeDiscovery" @action="readDiscovery">
      <template v-if="discovery.image" #art><img :src="discovery.image" alt="Close-up of the object found in the study" /></template>
    </EvidenceDialog>
  </PlateFrame>
</template>

<style scoped>
.sc {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* Header */
.sc-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px 24px;
}
.sc-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 10px;
  padding: 0;
  list-style: none;
}
.sc-place {
  margin-top: 6px;
  color: var(--muted);
  font-size: 14px;
}
.sc-status {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 10px;
}
.sc-stat {
  position: relative;
  display: grid;
  align-content: center;
  min-width: 78px;
  padding: 6px 12px;
  border: 1px solid #58402a;
  border-radius: 8px;
  background: #160f0b;
}
.sc-stat--score {
  min-width: 112px;
  border-color: #8d6134;
  background: linear-gradient(#24170f, #160f0b);
}
.sc-stat > span:first-child {
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}
.sc-stat strong {
  font-family: var(--plate-serif);
  font-size: 24px;
  font-weight: 600;
  line-height: 1.1;
  color: var(--pale);
  font-variant-numeric: tabular-nums;
}
.sc-delta {
  position: absolute;
  top: -11px;
  right: 6px;
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  background: #120b08;
}
.sc-delta.is-up,
.is-up {
  color: #c9e2b8;
}
.sc-delta.is-down,
.is-down {
  color: #f0b4a4;
}
.sc-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.sc-cost {
  color: var(--muted);
  font-weight: 500;
}

/* Grid: the stage, find bar, and chat on the left; the case file on the right. */
.sc-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 430px;
  grid-template-areas: "stage desk";
  gap: 16px 18px;
}
.sc-stage-wrap {
  grid-area: stage;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}
.sc-stage-box {
  position: relative;
}
.sc-desk {
  grid-area: desk;
  min-width: 0;
  min-height: 0;
  /* The desk takes the height of the stage and chat rows and scrolls inside. */
  contain: size;
}

/* Stage */
.sc-stage-scroller {
  border-radius: 12px;
}
.sc-stage {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border: 1px solid #8d6134;
  border-radius: 12px;
  background: radial-gradient(ellipse at 60% 40%, #2b1d14, #0b0806 70%);
  box-shadow: var(--shadow), inset 0 1px #b1864a55;
  isolation: isolate;
}
.sc-stage.is-searching {
  cursor: crosshair;
}
.sc-canvas {
  position: absolute;
  inset: 0;
}
.sc-canvas :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}
.sc-fallback {
  position: absolute;
  inset: auto 20px 50% 20px;
  text-align: center;
  color: var(--pale);
}
.sc-search {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: 12px;
}
.sc-search:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: -4px;
}
.sc-overlay {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  transform-origin: 0 0;
  pointer-events: none;
}
.sc-gridlines {
  position: absolute;
  inset: 0;
}
.sc-cell {
  position: absolute;
  box-sizing: border-box;
  border: 1.5px solid #d9b68140;
}
/* Labels sit centred at the top of each cell, clear of the strip the camera crops at the frame edges. */
.sc-cell span {
  position: absolute;
  top: 20px;
  left: 50%;
  translate: -50% 0;
  padding: 1px 6px;
  border-radius: 4px;
  background: #120b08b0;
  color: #f0dfc3;
  font-family: var(--font-mono);
  font-size: 20px;
  font-weight: 600;
}
.sc-cell.is-cursor {
  border: 5px solid var(--gold);
  background: #d9b6811f;
}
.sc-name {
  position: absolute;
  translate: -50% 10px;
  display: grid;
  justify-items: center;
  padding: 4px 14px 5px;
  border: 2px solid #6e4a2c;
  border-radius: 8px;
  background: #120b08d0;
  color: var(--pale);
  font-size: 22px;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
}
.sc-name small {
  color: var(--muted);
  font-size: 18px;
  font-weight: 500;
}
.sc-name[data-state="cleared"] {
  opacity: 0.7;
}
.sc-name[data-state="cleared"] small {
  color: #c9e2b8;
}
.sc-popup {
  position: absolute;
  translate: -50% -100%;
  display: grid;
  justify-items: center;
  color: #ffe2a8;
  font-family: var(--plate-serif);
  font-size: 40px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  text-shadow:
    0 2px 0 #3a2210,
    0 0 18px #000;
}
.sc-popup small {
  margin-top: 4px;
  font-family: var(--plate-sans);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.sc-popup.is-down {
  color: #f6b9a8;
  font-size: 30px;
}
/* A slim pill over the room: one short line, so the scene stays clear. */
.sc-objective {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: min(360px, 46%);
  padding: 7px 14px 7px 12px;
  border: 1px solid #86603a99;
  border-radius: 999px;
  background: #120b08cc;
  color: var(--gold);
  backdrop-filter: blur(4px);
}
.sc-objective p {
  margin: 0;
  overflow: hidden;
  color: var(--pale);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sc-hint-chip {
  position: absolute;
  top: 52px;
  left: 12px;
  z-index: 3;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  max-width: min(420px, 52%);
  margin: 0;
  padding: 6px 12px;
  border: 1px solid #d9b68155;
  border-radius: 10px;
  background: #1d140dcc;
  color: #e8c995;
  font-size: 13px;
  line-height: 1.4;
}
.sc-eyebrow {
  display: block;
  color: var(--gold);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.sc-banner-stage {
  position: absolute;
  top: 42%;
  left: 50%;
  z-index: 4;
  margin: 0;
  padding: 12px 26px;
  translate: -50% -50%;
  border: 2px solid #d9b681;
  border-radius: 6px;
  background: #120b08e8;
  color: #f6dca6;
  font-family: var(--plate-serif);
  font-size: 30px;
  white-space: nowrap;
  pointer-events: none;
}
/* Results show at the top right of the room: that strip holds no object on the list and no name tag. */
.sc-toast {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 3;
  width: min(48%, 460px);
  margin: 0;
  pointer-events: none;
}
.sc-toast span {
  display: block;
  padding: 10px 14px;
  border: 1px solid #86603a;
  border-radius: 8px;
  background: #120b08ec;
  color: var(--pale);
  font-size: 14px;
  line-height: 1.45;
}
.sc-toast span[data-tone="ok"] {
  border-color: #6f8a5a;
}
.sc-toast span[data-tone="warn"] {
  border-color: #9a5446;
}

/* Find bar */
.sc-findbar {
  padding: 12px 16px 14px;
  border: 1px solid #8d6134;
  border-radius: 12px;
  background:
    linear-gradient(180deg, #2a1b11, #170f0b),
    #170f0b;
  box-shadow: inset 0 1px #b1864a55;
}
.sc-findbar-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
}
.site .plate .sc-findbar-title {
  margin: 0;
  color: var(--pale);
  font-family: var(--plate-serif);
  font-size: 22px;
  font-weight: 500;
  line-height: 1.2;
}
.sc-findbar-title span {
  margin-left: 6px;
  color: var(--gold);
  font-family: var(--plate-sans);
  font-size: 14px;
  font-weight: 700;
}
.sc-combo {
  position: relative;
  margin: 0;
  padding: 2px 10px 5px;
  border: 1px solid #d9b681;
  border-radius: 4px;
  color: #ffe2a8;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  overflow: hidden;
}
.sc-combo-bar {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 3px;
  background: #d9b681;
  transform-origin: left center;
}
.sc-findbar-tools {
  display: flex;
  gap: 6px;
  margin-left: auto;
}
.sc-findbar-tools .btn.tiny {
  min-height: 32px;
  padding: 5px 12px;
  font-size: 12px;
}
.sc-findbar-tools .btn[aria-pressed="true"] {
  border-color: #e4b16b;
  color: #ffe2a8;
  background: #3b2718;
}
.sc-assist-note {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}
.sc-objective-mobile {
  display: none;
  margin: 8px 0 0;
  color: var(--pale);
  font-size: 14px;
  line-height: 1.45;
}
.sc-findlist {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 6px 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.sc-findlist li {
  min-width: 0;
}
.sc-find-label,
.sc-find-button {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-height: 34px;
  padding: 6px 8px;
  border: 1px solid #58402a;
  border-radius: 6px;
  background: #120b08;
  color: var(--pale);
  font: inherit;
  font-family: var(--plate-serif);
  font-size: 16px;
  line-height: 1.15;
  text-align: left;
}
.sc-findlist li.is-clue .sc-find-label,
.sc-findlist li.is-clue .sc-find-button {
  border-color: #86603a;
}
.sc-find-button {
  cursor: pointer;
  color: #ffe2a8;
}
.sc-find-button:hover {
  background: #2a1b11;
}
.sc-findlist li.is-found .sc-find-label {
  color: #a7c99a;
  border-color: #3e5a3c;
  background: #121a12;
  text-decoration: line-through;
  text-decoration-color: #a7c99a;
}

/* Opening */
.sc-opening,
.sc-reveal {
  position: absolute;
  inset: 0;
  z-index: 5;
  border-radius: 12px;
}
.sc-opening[data-step="cover"] {
  display: grid;
  place-items: center;
  padding: 24px;
  background: radial-gradient(ellipse at 50% 55%, #0b0806b8, #0b0806f2 75%);
}
.sc-cover {
  max-width: 560px;
  text-align: center;
}
.sc-cover-title {
  margin-top: 10px;
  font-family: var(--plate-serif);
  font-size: 44px;
  font-weight: 500;
  line-height: 1.04;
  color: var(--pale);
}
.sc-cover-lede {
  margin-top: 14px;
  color: #d8c6aa;
  font-size: 16px;
  line-height: 1.6;
}
.sc-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 22px;
}
.sc-fine {
  margin-top: 14px;
  color: var(--muted);
  font-size: 12px;
}
.sc-opening:not([data-step="cover"]) {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 20px 26px;
  background: linear-gradient(180deg, transparent 40%, #0b0806c4 64%, #0b0806f2 100%);
  pointer-events: none;
}
.sc-opening:not([data-step="cover"]) button,
.sc-opening:not([data-step="cover"]) .sc-ready {
  pointer-events: auto;
}
.sc-subtitle {
  max-width: 760px;
  min-height: 92px;
}
.sc-subtitle-count {
  color: var(--gold);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.sc-subtitle-line {
  margin-top: 6px;
  font-family: var(--plate-serif);
  font-size: 26px;
  line-height: 1.25;
  color: var(--pale);
  text-shadow: 0 2px 10px #000;
}
.sc-subtitle-name {
  margin-top: 6px;
  font-family: var(--plate-serif);
  font-size: 30px;
  color: var(--pale);
}
.sc-subtitle-name small {
  margin-left: 8px;
  font-family: var(--plate-sans);
  font-size: 14px;
  color: var(--gold);
}
.sc-caret {
  display: inline-block;
  width: 2px;
  height: 0.9em;
  margin-left: 3px;
  vertical-align: -0.1em;
  background: var(--gold);
}
.sc-skip {
  position: absolute;
  top: 14px;
  right: 14px;
}
.sc-ready {
  max-width: 760px;
}
.sc-cast-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 22px;
  margin: 0 0 12px;
  padding: 0;
  list-style: none;
}
.sc-cast-row li {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-size: 13px;
}
.sc-cast-row strong {
  display: block;
  color: var(--pale);
  font-size: 14px;
}
.sc-portrait {
  flex: none;
  width: 40px;
  height: 40px;
  border: 1px solid #86603a;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 30%, #3b2717, #150e0a);
  fill: #0b0806;
  stroke: #d9b681;
  stroke-width: 1;
  stroke-opacity: 0.55;
}
.sc-goal {
  margin-bottom: 14px;
  color: #d8c6aa;
  font-size: 15px;
  line-height: 1.55;
}
.sc-goal strong {
  color: var(--gold);
}
.sc-goal code,
.sc-help code {
  padding: 1px 6px;
  border-radius: 3px;
  background: #00000040;
  color: #f1d29f;
  font-family: var(--font-mono);
  font-size: 12px;
  white-space: nowrap;
}

/* Reveal */
.sc-reveal {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 20px 26px;
  background: linear-gradient(180deg, #0b0806a0 0%, transparent 28%, transparent 46%, #0b0806e6 78%);
  pointer-events: none;
}
.sc-reveal button {
  pointer-events: auto;
}
.sc-stamp {
  position: absolute;
  top: 20px;
  left: 24px;
  margin: 0;
  padding: 6px 14px;
  border: 3px double #d9b681;
  border-radius: 4px;
  color: #f0cf96;
  font-family: var(--plate-serif);
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  rotate: -6deg;
}
.sc-reveal-title {
  position: absolute;
  top: 74px;
  left: 24px;
  max-width: 60%;
  font-family: var(--plate-serif);
  font-size: 40px;
  font-weight: 500;
  line-height: 1.05;
  color: var(--pale);
  text-shadow: 0 2px 14px #000;
}
.sc-reveal-title:focus {
  outline: none;
}
.sc-beats {
  display: grid;
  gap: 4px;
  max-width: 760px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.sc-beats li {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.4;
}
.sc-beats li.is-current {
  color: var(--pale);
  font-size: 17px;
}
.sc-beat-time {
  display: inline-block;
  min-width: 46px;
  color: var(--gold);
  font-family: var(--font-mono);
  font-size: 13px;
}
.sc-twist {
  margin-top: 10px;
  font-family: var(--plate-serif);
  font-size: 24px;
  color: #f0cf96;
}

/* Case file */
.sc-desk-panel,
.sc-report {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.sc-report .panel-body {
  overflow-y: auto;
}
.sc-tablist {
  display: flex;
  flex: none;
  gap: 2px;
  padding: 6px 6px 0;
  border-bottom: 1px solid #6e4a2c;
  background: linear-gradient(90deg, #312013, #20140c);
}
.sc-tab {
  position: relative;
  display: grid;
  flex: 1 1 0;
  justify-items: center;
  gap: 1px;
  min-width: 0;
  min-height: 52px;
  padding: 6px 4px 7px;
  border: 1px solid transparent;
  border-bottom: 0;
  border-radius: 7px 7px 0 0;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.sc-tab .site-icon {
  font-size: 16px;
}
.sc-tab[aria-selected="true"] {
  border-color: #8d6134;
  background: #1a110c;
  color: var(--pale);
}
.sc-tab:hover {
  color: var(--pale);
}
.sc-tab-count {
  color: var(--gold);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.sc-new {
  position: absolute;
  top: 6px;
  right: 10px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #e8b46a;
  box-shadow: 0 0 0 2px #20140c;
}
.sc-panel {
  flex: 1;
  min-height: 0;
  padding: 14px 16px 18px;
  overflow-y: auto;
}
.sc-panel:focus-visible {
  outline-offset: -3px;
}
.sc-intro {
  margin-bottom: 12px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}
.sc-empty {
  margin: 10px 0;
  color: var(--muted);
  font-size: 13px;
}
.sc-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.sc-card {
  padding: 12px 14px;
  border: 1px solid #58402a;
  border-radius: 8px;
  background: #1b120d;
}
.sc-card-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
}
.sc-card-head .tag {
  margin-left: auto;
}
.sc-id {
  color: #e8c995;
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.02em;
}
.sc-where {
  color: var(--muted);
  font-size: 12px;
}
.site .plate .sc-card-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  margin-top: 4px;
  color: var(--pale);
  font-family: var(--plate-sans);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
}
.sc-card-text {
  margin-top: 6px;
  color: #d3c3ab;
  font-size: 13px;
  line-height: 1.5;
}
.sc-clue.is-clue {
  border-color: #6f5434;
  background: linear-gradient(135deg, #2a1c12, #1b120d);
}
.sc-chiprow {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}
.sc-records {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.sc-record {
  display: grid;
  gap: 3px;
  width: 100%;
  min-height: 100%;
  padding: 10px 11px 11px;
  border: 1px solid #ad8e5e;
  border-radius: 4px;
  background: linear-gradient(135deg, #e9d9b9, #cdb48d);
  color: #3d291c;
  font: inherit;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 4px 12px #0007;
}
.sc-record .sc-id {
  color: #55391f;
}
.sc-record strong {
  color: #2b1a11;
  font-size: 13px;
  line-height: 1.3;
}
.sc-record .sc-detail {
  color: #4e3726;
  font-size: 12px;
  line-height: 1.4;
}
.sc-record[aria-pressed="true"] {
  outline: 3px solid #f0c27a;
  outline-offset: 2px;
  box-shadow:
    0 0 0 6px #f0c27a33,
    0 6px 16px #0009;
}
.sc-record.is-linked {
  border-color: #8a5a2a;
  background: linear-gradient(135deg, #f0e2c4, #d8bf96);
}
.sc-record:disabled {
  cursor: default;
}
.sc-panel-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0 4px;
}
.site .plate .sc-sub {
  margin-top: 16px;
  color: var(--pale);
  font-family: var(--plate-sans);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.4;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.sc-deduction .site-icon {
  color: var(--gold);
}
.sc-events {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.sc-event {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid #6a4a2a;
  border-radius: 8px;
  background: #22170f;
}
.sc-event.is-locked {
  border-style: dashed;
  background: #170f0b;
}
.sc-event.is-locked strong {
  color: var(--muted);
}
.sc-event.is-fixed {
  border-color: #6f8a5a;
}
.sc-pos {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid #d6a75e;
  border-radius: 50%;
  color: #f0d3a7;
  font-family: var(--plate-serif);
  font-size: 16px;
}
.sc-event-body {
  display: grid;
  gap: 1px;
  min-width: 0;
}
.sc-event-body strong {
  color: var(--pale);
  font-size: 13px;
  line-height: 1.3;
}
.sc-detail {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.35;
}
.sc-move {
  display: flex;
  gap: 4px;
}
.sc-move .btn.tiny {
  min-width: 36px;
  min-height: 36px;
  padding: 0;
  font-size: 14px;
}
.sc-banner {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  padding: 10px 12px;
  border: 1px solid #6f8a5a;
  border-radius: 8px;
  background: #19291c;
  color: #cfe6c1;
  font-size: 13px;
  line-height: 1.5;
}
.sc-claim-text {
  margin-top: 8px;
  color: var(--pale);
  font-family: var(--plate-serif);
  font-size: 18px;
  line-height: 1.3;
}
.sc-claim[data-status="contradicted"] .sc-claim-text {
  color: var(--muted);
  text-decoration: line-through;
  text-decoration-color: #c87d68;
}
.sc-challenge {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 6px 8px;
  margin-top: 10px;
}
.sc-challenge label {
  grid-column: 1 / -1;
  color: var(--muted);
  font-size: 12px;
}
.sc-challenge select {
  min-width: 0;
  min-height: 36px;
  padding: 6px 8px;
  border: 1px solid #654629;
  border-radius: 6px;
  background: #0f0b08;
  color: var(--pale);
  font: inherit;
  font-size: 12px;
}
.sc-proof {
  display: grid;
  gap: 6px;
  margin: 0 0 14px;
  padding: 0;
  list-style: none;
}
.sc-proof li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid #58402a;
  border-radius: 8px;
  color: var(--muted);
  font-size: 13px;
}
.sc-proof li span {
  flex: 1;
}
.sc-proof li small {
  color: var(--muted);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.sc-proof li.is-ok {
  border-color: #6f8a5a;
  color: #cfe6c1;
}
.sc-suspect {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
}
.sc-suspect[data-state="cleared"] {
  opacity: 0.72;
}
.sc-suspect.is-accused .sc-portrait {
  border-color: #9a5446;
}
.site .plate .sc-suspect-body .sc-card-title {
  margin-top: 0;
}

/* Report */
.sc-rating {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.sc-seals {
  display: flex;
  gap: 6px;
}
.sc-seal {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 2px solid #5e3d22;
  border-radius: 50%;
  background: #1a110c;
  color: #5e3d22;
  font-size: 20px;
}
.sc-seal.is-on {
  border-color: #c87d68;
  background: radial-gradient(circle at 40% 35%, #a2493c, #5c1f19 70%);
  color: #ffd9a0;
  box-shadow: 0 4px 12px #0008;
}
.sc-rating-stamp {
  padding: 6px 12px;
  border: 3px double #d9b681;
  border-radius: 4px;
  color: #f0cf96;
  font-family: var(--plate-serif);
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.06em;
  rotate: -3deg;
}
.sc-final {
  margin: 12px 0 0;
  color: var(--pale);
}
.sc-final strong {
  font-family: var(--plate-serif);
  font-size: 56px;
  font-weight: 600;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.sc-final span {
  margin-left: 8px;
  color: var(--muted);
  font-size: 16px;
}
.sc-facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 14px 0 0;
}
.sc-facts div {
  padding: 8px 10px;
  border: 1px solid #58402a;
  border-radius: 8px;
}
.sc-facts dt {
  color: var(--muted);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.sc-facts dd {
  margin: 2px 0 0;
  color: var(--pale);
  font-size: 16px;
  font-weight: 600;
}
.sc-newbest {
  display: block;
  color: #e8c995;
  font-size: 11px;
  font-weight: 600;
}
.sc-lines {
  display: grid;
  gap: 4px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}
.sc-lines li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
  border-bottom: 1px solid #51371f;
  color: #d3c3ab;
  font-size: 13px;
}
.sc-missed {
  margin-top: 14px;
  color: #d3c3ab;
  font-size: 13px;
}
.sc-missed summary,
.sc-help summary {
  min-height: 32px;
  color: var(--gold);
  cursor: pointer;
}
.sc-missed ul {
  margin: 8px 0 0;
  padding-left: 18px;
  line-height: 1.5;
}
.sc-report .sc-actions {
  justify-content: flex-start;
}

/* Chat tab: the bar, the crew, Station B, and a feed that fills the rest and scrolls. */
.sc-panel--chat {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
}
.sc-chat-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.sc-seg {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  border: 1px solid #5a3d22;
  border-radius: 999px;
  background: #0f0a07;
}
.sc-seg button {
  min-height: 30px;
  padding: 0 12px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #d8c6aa;
  font: 600 12px/1 var(--plate-sans);
  cursor: pointer;
}
.sc-seg button[aria-pressed="true"] {
  background: #d9b681;
  color: #1a1008;
}
.sc-panel--chat .sc-crew {
  margin: 0 -16px;
}
.sc-panel--chat .sc-partner {
  margin: 0 -16px;
}
.sc-feed-wrap {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 140px;
}
.sc-panel--chat .sc-feed {
  flex: 1;
  height: auto;
  min-height: 0;
  padding: 4px 0;
}
.sc-feed li[data-command] .sc-msg {
  color: #f6dcae;
  font-family: var(--font-mono);
  font-size: 12.5px;
}
.sc-feed li[data-who="case"] {
  margin: 2px 0;
  padding: 4px 0 4px 8px;
  border-left: 2px solid #6e4a2c;
  font-size: 12.5px;
}
.sc-unread {
  position: absolute;
  left: 50%;
  bottom: 8px;
  translate: -50% 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  padding: 0 12px;
  border: 1px solid #d9b681;
  border-radius: 999px;
  background: #2a1b11f2;
  color: #f6dcae;
  font: 600 12px/1 var(--plate-sans);
  cursor: pointer;
  box-shadow: 0 6px 16px #000a;
}
.sc-desk-foot {
  border-top: 1px solid #51371f;
  background: #140d09;
}
.sc-title-tag {
  margin-left: 12px;
  vertical-align: middle;
  font-family: var(--plate-sans);
  font-size: 11px;
}
.sc-feed {
  height: 168px;
  margin: 0;
  padding: 10px 16px;
  overflow-y: auto;
  list-style: none;
  font-size: 13px;
}
.sc-feed li {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  gap: 10px;
  padding: 4px 0;
  line-height: 1.45;
}
.sc-who {
  overflow: hidden;
  color: #e8c48d;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sc-msg {
  color: #d3c3ab;
}
.sc-feed li[data-who="you"] .sc-msg {
  color: #f1d29f;
  font-family: var(--font-mono);
  font-size: 12px;
}
.sc-feed li[data-who="case"] .sc-who {
  color: var(--pale);
  font-weight: 700;
}
.sc-feed li[data-who="case"][data-tone="warn"] .sc-msg {
  color: #f0b4a4;
}
.sc-feed li[data-who="case"][data-tone="ok"] .sc-msg {
  color: #d9e8cc;
}
.sc-feed-empty {
  display: block !important;
  color: var(--muted);
}
.sc-command {
  display: flex;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid #51371f;
}
.sc-command input {
  flex: 1;
  min-width: 0;
  min-height: 40px;
  padding: 8px 12px;
  border: 1px solid #654629;
  border-radius: 6px;
  background: #0f0b08;
  color: var(--pale);
  font-family: var(--font-mono);
  font-size: 13px;
}
.sc-command input::placeholder {
  color: #a8957e;
}
.sc-help {
  padding: 0 16px 12px;
  font-size: 12px;
}
.sc-help dl {
  display: grid;
  gap: 4px;
  margin: 6px 0 0;
}
.sc-help dl div {
  display: grid;
  grid-template-columns: minmax(0, 220px) minmax(0, 1fr);
  gap: 10px;
}
.sc-help dd {
  margin: 0;
  color: #d3c3ab;
}

/* Community: viewer name colours, grid calls on the stage, the crew strip, polls, and Station B. */
[data-hue="gold"] {
  color: #ecc78d;
}
[data-hue="ember"] {
  color: #f2a865;
}
[data-hue="ivory"] {
  color: #ecdfc8;
}
[data-hue="brass"] {
  color: #d6aa6e;
}
[data-hue="rose"] {
  color: #eaae9f;
}
[data-hue="copper"] {
  color: #dd9466;
}
.sc-feed li[data-who="partner"] .sc-who {
  color: var(--pale);
  font-weight: 700;
}
.sc-feed li[data-who="partner"] .sc-msg {
  color: #efdcbc;
}
.sc-feed li[data-who="crowdB"] .sc-who {
  color: #c6b49a;
}
.sc-follow {
  margin-left: 10px;
  min-height: 26px;
  padding: 2px 10px;
  border: 1px solid #a77a48;
  border-radius: 999px;
  background: #2a1c12;
  color: #f3d7a6;
  font: 600 12px/1.2 var(--plate-sans);
  cursor: pointer;
}
.sc-follow:hover {
  border-color: var(--gold);
  background: #3a2615;
}

.sc-ping {
  position: absolute;
  width: 0;
  height: 0;
}
.sc-ping-ring {
  position: absolute;
  left: -46px;
  top: -46px;
  width: 92px;
  height: 92px;
  border: 4px solid currentColor;
  border-radius: 50%;
  box-shadow:
    0 0 0 3px #120b0899,
    0 0 26px currentColor;
  opacity: 0.85;
}
/* The ring and the tag take the viewer's colour from data-hue; the cell name stays parchment. */
.sc-ping-tag {
  position: absolute;
  left: 0;
  top: -54px;
  translate: -50% -100%;
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  padding: 4px 12px 5px;
  border: 2px solid currentColor;
  border-radius: 999px;
  background: #120b08e6;
  font: 600 20px/1.2 var(--plate-sans);
  white-space: nowrap;
}
.sc-ping-tag b {
  color: #f4e6cf;
  font-family: var(--font-mono);
  font-size: 21px;
}

.sc-find-b {
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 20px;
  height: 20px;
  margin-left: auto;
  border: 1px solid #a77a48;
  border-radius: 50%;
  color: #f0d4a4;
  font: 700 11px/1 var(--plate-sans);
}

.sc-request {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px 12px;
  margin: 0 0 14px;
  padding: 12px 14px;
  border: 1px solid #a77a48;
  border-radius: 8px;
  background: linear-gradient(90deg, #3a2615, #1d140d);
  color: #ecdcc0;
  font-size: 13px;
}
.sc-request p {
  margin: 0;
}
.sc-request strong {
  color: #f6dcae;
}

.sc-poll {
  display: grid;
  grid-template-columns: auto minmax(60px, 1fr) 40px;
  align-items: center;
  gap: 10px;
  margin: 8px 0 0;
  font-size: 12px;
  color: #cdbba0;
}
.sc-poll strong {
  text-align: right;
  color: #f1dbb4;
  font-variant-numeric: tabular-nums;
}
.sc-poll-bar {
  position: relative;
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: #2b1d13;
}
.sc-poll-bar span {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: inherit;
  background: linear-gradient(90deg, #8d6134, #e0b56f);
  transition: width 900ms var(--ease-out-expo);
}
.sc-claim[data-status="contradicted"] .sc-poll-bar span {
  background: #6b5038;
}

.sc-crew {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  padding: 8px 16px;
  border-bottom: 1px solid #3c2817;
  background: #150e0a;
}
.sc-crew-top {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.sc-crew-top li {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border: 1px solid #4e3520;
  border-radius: 999px;
  background: #1f150e;
  font-size: 12px;
}
.sc-crew-top li .sc-who {
  max-width: 120px;
}
.sc-crew-top strong {
  color: #f6dcae;
  font-variant-numeric: tabular-nums;
}
.sc-energy {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #cdbba0;
  font-size: 12px;
}
.sc-energy-bar {
  position: relative;
  width: 110px;
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: #2b1d13;
}
.sc-energy-bar span {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: inherit;
  background: linear-gradient(90deg, #a45a2a, #f0b45e);
  transition: width 500ms linear;
}

.sc-partner {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #3c2817;
  background: linear-gradient(90deg, #22170f, #160f0a);
}
.sc-partner-face {
  width: 52px;
  height: 52px;
  border: 1px solid #7a5630;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 30%, #4a3220, #1a110b);
  fill: #0d0907;
}
.sc-partner .sc-partner-name {
  margin: 0;
  color: var(--pale);
  font: 700 15px/1.3 var(--plate-sans);
  letter-spacing: 0;
}
.sc-partner-name small {
  margin-left: 6px;
  color: #bfa98b;
  font-size: 12px;
  font-weight: 500;
}
.sc-partner-note {
  margin: 4px 0 0;
  color: #e3d2b6;
  font-size: 13px;
  line-height: 1.45;
}
.sc-partner-ask {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 8px;
  padding: 6px 8px 6px 10px;
  border: 1px solid #a77a48;
  border-radius: 6px;
  background: #2c1d12;
  color: #ecdcc0;
  font-size: 12px;
}
.sc-partner-ask strong {
  color: #f6dcae;
}
.sc-partner-share {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.sc-partner-share select {
  flex: 1;
  min-width: 0;
  min-height: 32px;
  padding: 4px 8px;
  border: 1px solid #654629;
  border-radius: 6px;
  background: #0f0b08;
  color: var(--pale);
  font: 12px var(--font-mono);
}

.sc-mode {
  display: grid;
  gap: 8px;
  margin: 16px 0 0;
  padding: 0;
  border: 0;
}
.sc-mode-opt {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #5a3d22;
  border-radius: 8px;
  background: #160f0acc;
  cursor: pointer;
}
.sc-mode-opt:has(input:checked) {
  border-color: var(--gold);
  background: #2a1b11e6;
}
.sc-mode-opt:has(input:focus-visible) {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
}
.sc-mode-opt input {
  accent-color: #d9b681;
}
.sc-mode-opt span {
  display: grid;
  gap: 2px;
}
.sc-mode-opt strong {
  color: var(--pale);
  font-size: 14px;
}
.sc-mode-opt small {
  color: #cbb799;
  font-size: 12px;
  line-height: 1.4;
}

.sc-mvp {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px;
  color: #ecdcc0;
  font-size: 14px;
}
.sc-crew-list {
  display: grid;
  gap: 4px;
  margin: 0 0 10px;
  padding: 0;
  list-style: none;
}
.sc-crew-list li {
  display: grid;
  grid-template-columns: minmax(0, 130px) minmax(0, 1fr) auto;
  align-items: baseline;
  gap: 10px;
  font-size: 13px;
}
.sc-crew-stats {
  color: #bfa98b;
  font-size: 12px;
}
.sc-crew-list strong {
  color: #f6dcae;
  font-variant-numeric: tabular-nums;
}

/* Motion: full-motion only. Reduced motion keeps every state static. */
@keyframes sc-float {
  from {
    opacity: 0;
    translate: 0 6px;
  }
  20% {
    opacity: 1;
    translate: 0 0;
  }
  80% {
    opacity: 1;
  }
  to {
    opacity: 0;
    translate: 0 -10px;
  }
}
@keyframes sc-pop {
  0% {
    opacity: 0;
    scale: 0.6;
  }
  18% {
    opacity: 1;
    scale: 1.12;
  }
  30% {
    scale: 1;
  }
  75% {
    opacity: 1;
    translate: -50% -130%;
  }
  100% {
    opacity: 0;
    translate: -50% -170%;
  }
}
@keyframes sc-rise {
  from {
    opacity: 0;
    translate: 0 10px;
  }
  to {
    opacity: 1;
    translate: 0 0;
  }
}
@keyframes sc-stamp-in {
  from {
    opacity: 0;
    scale: 1.8;
  }
  to {
    opacity: 1;
    scale: 1;
  }
}
@keyframes sc-banner-in {
  0% {
    opacity: 0;
    scale: 0.8;
  }
  12% {
    opacity: 1;
    scale: 1.04;
  }
  20% {
    scale: 1;
  }
  85% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}
@keyframes sc-drain {
  from {
    scale: 1 1;
  }
  to {
    scale: 0 1;
  }
}
@keyframes sc-blink {
  50% {
    opacity: 0;
  }
}
@keyframes sc-glow {
  0%,
  100% {
    box-shadow: 0 0 0 0 #e8b46a00;
  }
  50% {
    box-shadow: 0 0 0 4px #e8b46a33;
  }
}
@keyframes sc-found {
  0% {
    background: #3b2718;
  }
  100% {
    background: #121a12;
  }
}
.sc-delta {
  opacity: 0;
}
html[data-motion="full"] .sc-delta {
  animation: sc-float 1500ms var(--ease-out-expo) both;
}
html:not([data-motion="full"]) .sc-delta {
  opacity: 1;
}
html[data-motion="full"] .sc-popup {
  animation: sc-pop 1300ms var(--ease-out-expo) both;
}
html:not([data-motion="full"]) .sc-popup {
  translate: -50% -130%;
}
html[data-motion="full"] .sc-banner-stage {
  animation: sc-banner-in 3600ms var(--ease-out-expo) both;
}
html[data-motion="full"] .sc-combo-bar {
  animation: sc-drain 4000ms linear both;
}
html[data-motion="full"] .sc-findlist li.is-found .sc-find-label {
  animation: sc-found 900ms ease-out both;
}
html[data-motion="full"] .sc-toast span,
html[data-motion="full"] .sc-feed li,
html[data-motion="full"] .sc-card,
html[data-motion="full"] .sc-record,
html[data-motion="full"] .sc-banner,
html[data-motion="full"] .sc-beats li {
  animation: sc-rise 420ms var(--ease-out-expo) backwards;
}
html[data-motion="full"] .sc-caret {
  animation: sc-blink 900ms steps(1) infinite;
}
html[data-motion="full"] .sc-stamp,
html[data-motion="full"] .sc-rating-stamp,
html[data-motion="full"] .sc-seal.is-on {
  animation: sc-stamp-in 520ms cubic-bezier(0.2, 1.4, 0.4, 1) backwards;
}
html[data-motion="full"] .sc-seal.is-on:nth-child(2) {
  animation-delay: 160ms;
}
html[data-motion="full"] .sc-seal.is-on:nth-child(3) {
  animation-delay: 320ms;
}
html[data-motion="full"] .sc-reveal-title {
  animation: sc-rise 900ms var(--ease-out-expo) 300ms backwards;
}
html[data-motion="full"] .sc-new {
  animation: sc-glow 1600ms ease-in-out infinite;
}
html[data-motion="full"] .sc-record,
html[data-motion="full"] .sc-tab {
  transition:
    transform 200ms var(--ease-out-expo),
    background-color 200ms ease,
    color 200ms ease;
}
html[data-motion="full"] .sc-record:not(:disabled):hover {
  transform: translateY(-2px) rotate(-0.4deg);
}

/* Narrow screens: the room scrolls sideways at a playable size; the opening and reveal sit below it. */
@media (max-width: 1100px) {
  .sc-grid {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      "stage"
      "desk";
  }
  .sc-desk {
    contain: none;
  }
  .sc-panel {
    max-height: 70vh;
  }
  .sc-findlist {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
@media (max-width: 900px) {
  .sc-stage-scroller {
    overflow-x: auto;
    overscroll-behavior-x: contain;
  }
  .sc-stage {
    width: 860px;
  }
  .sc-opening,
  .sc-reveal {
    position: relative;
    inset: auto;
    margin-top: 12px;
    border: 1px solid #6e4a2c;
    background: #120b08 !important;
  }
  .sc-opening:not([data-step="cover"]),
  .sc-reveal {
    padding: 16px;
  }
  .sc-stamp,
  .sc-reveal-title {
    position: static;
  }
  .sc-reveal-title {
    max-width: none;
    margin: 12px 0;
    font-size: 30px;
  }
  .sc-stamp {
    align-self: flex-start;
  }
  .sc-skip {
    position: static;
    align-self: flex-start;
    margin-top: 10px;
  }
  .sc-cover-title {
    font-size: 32px;
  }
  .sc-subtitle-line {
    font-size: 20px;
  }
  .sc-objective {
    display: none;
  }
  .sc-objective-mobile {
    display: block;
  }
  /* The toast stays in the accessibility tree as the live region; only its box leaves the small stage. */
  .sc-toast {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
  .sc-findlist {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 760px) {
  .sc-records {
    grid-template-columns: minmax(0, 1fr);
  }
  .sc-feed li {
    grid-template-columns: 90px minmax(0, 1fr);
  }
  .sc-help dl div {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
  }
  .sc-findlist {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .sc-stat {
    min-width: 64px;
  }
  .sc-crew-list li {
    grid-template-columns: minmax(0, 1fr) auto;
  }
  .sc-crew-stats {
    grid-column: 1 / -1;
    grid-row: 2;
  }
  .sc-energy-bar {
    width: 72px;
  }
}

/* Calls breathe so the eye finds them; reduced motion keeps a steady ring. */
html[data-motion="full"] .sc-ping-ring {
  animation: sc-ping 1700ms ease-in-out infinite;
}
html[data-motion="full"] .sc-ping-tag {
  animation: sc-tag-in 460ms var(--ease-out-expo) both;
}
@keyframes sc-ping {
  0%,
  100% {
    scale: 0.92;
    opacity: 0.95;
  }
  50% {
    scale: 1.1;
    opacity: 0.45;
  }
}
@keyframes sc-tag-in {
  from {
    opacity: 0;
    translate: -50% -70%;
  }
  to {
    opacity: 1;
    translate: -50% -100%;
  }
}

/* The shared workspace owns the viewport; the room and file scroll only inside it. */
.sc { height: 100%; width: 100%; max-width: none; margin: 0; display: block; overflow: hidden; }
.sc .sc-grid { position: relative; height: 100%; min-height: 0; gap: 0; grid-template-columns: minmax(0, 1fr); grid-template-areas: "stage"; }
.sc .sc-stage-wrap { min-height: 0; height: 100%; gap: 0; display: block; }
.sc .sc-stage-box, .sc .sc-stage-scroller { height: 100%; min-height: 0; border-radius: 0; }
.sc .sc-stage { height: 100%; width: 100%; min-width: 0; aspect-ratio: auto; border: 0; border-radius: 0; }
.sc .sc-findbar { padding: 10px 18px; border-radius: 0; max-height: 190px; overflow: auto; }
.sc .sc-findlist { grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 4px 14px; }
.sc .sc-findlist li { min-height: 24px; font-size: 12px; }
.sc .sc-assist-note { margin: 4px 0; font-size: 11px; }
.sc .sc-desk { display: none; height: 100%; min-height: 0; contain: none; overflow: hidden; }
.sc.has-file.is-room .sc-grid { grid-template-columns: minmax(0, 1fr); grid-template-areas: "stage"; }
.sc.has-file.is-room .sc-desk { display: grid; position: absolute; z-index: 4; top: var(--workspace-header-space); bottom: var(--workspace-dock-space); right: 20px; width: min(420px, calc(100% - 40px)); height: auto; grid-template-rows: auto minmax(0, 1fr); border: 1px solid #bd93574a; border-radius: 12px; background: #21170edb; box-shadow: 0 16px 48px #0006; backdrop-filter: blur(16px); }
.sc.is-deduction .sc-grid { grid-template-columns: minmax(0, 1fr); grid-template-areas: "desk"; }
.sc.is-deduction .sc-stage-wrap { display: none; }
.sc.is-deduction .sc-desk { display: grid; grid-template-rows: auto minmax(0, 1fr); padding: calc(var(--workspace-header-space) + 12px) clamp(16px, 3vw, 48px) calc(var(--workspace-dock-space) + 12px); background: radial-gradient(ellipse at 50% 0%, #704d2c40, transparent 65%), #302218; animation: sc-board-arrive 600ms ease both; }
.sc-deduction-heading { display: flex; align-items: baseline; gap: 18px; margin: 0 0 16px; flex-wrap: wrap; }
.sc-deduction-heading > span { color: #d7b276; text-transform: uppercase; letter-spacing: .12em; font-size: 10px; }
.sc-deduction-heading h2 { margin: 0; font: 600 30px var(--font-display); }
.sc-deduction-heading p { margin: 0; color: #c6b293; font-size: 12px; }
.sc-desk-panel { min-height: 0; border-radius: 0; }
.sc-panel { min-height: 0; }
.sc.is-deduction .sc-records { display: grid; grid-template-columns: repeat(auto-fit, minmax(205px, 1fr)); gap: 18px; }
.sc.is-deduction .sc-records > li { position: relative; padding-top: 9px; }
.sc.is-deduction .sc-records > li::before { content: ""; position: absolute; top: 2px; left: 50%; width: 10px; height: 10px; border-radius: 50%; background: #a34431; box-shadow: 1px 3px 3px #0006; z-index: 1; }
.sc.is-deduction .sc-record { min-height: 170px; height: calc(100% - 44px); background: #e8d7b6; color: #3c291b; border-color: #96744c; box-shadow: 0 6px 14px #0005; }
.sc.is-deduction .sc-record .sc-detail { color: #614b35; }
.sc.is-deduction .sc-record .sc-id { color: #80452a; }
.sc.is-deduction .sc-record[aria-pressed="true"] { outline: 3px solid #dab26b; outline-offset: 3px; background: #f9eaca; }
.sc-record-inspect, .sc-file-close { display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 8px 14px; color: #e3c99d; border: 1px solid #84603b; background: #332319; font: 12px var(--font-body); cursor: pointer; }
.sc-record-inspect { width: 100%; justify-content: center; }
.sc-workspace-stats { position: absolute; z-index: 6; top: calc(var(--workspace-header-space) + 8px); right: 20px; display: flex; align-items: center; gap: 22px; padding: 12px 20px; border: 1px solid #c19a5c50; border-radius: 10px; background: #20160cb5; backdrop-filter: blur(10px); color: #d9c3a1; white-space: nowrap; pointer-events: none; }
.sc-workspace-stats > span { display: grid; gap: 4px; }
.sc-workspace-stats small { font-size: 10px; letter-spacing: .08em; text-transform: uppercase; }
.sc-workspace-stats strong { color: #f6d59a; font: 600 38px/1 var(--font-display); font-variant-numeric: tabular-nums; }
.sc-workspace-stats > span:first-child strong { animation: sc-score-arrive 350ms ease both; }
.sc-workspace-stats > span:last-child strong { font-size: 32px; color: #f6e8ce; }
.sc.is-deduction .sc-deduction-heading { padding-right: 250px; }
.sc-header-hint { display: flex; align-items: center; gap: 6px; min-height: 44px; padding: 8px 12px; background: #332319; border: 1px solid #84603b; color: #e3c99d; border-radius: 8px; cursor: pointer; }
.sc-header-hint:disabled { opacity: .4; }
.sc-command { width: 100%; max-width: none; margin: 0; padding: 0; border: 0; }
.sc-command input { min-width: 100px; min-height: 44px; }
.sc-workspace :deep(.workspace-dock) { justify-content: center; overflow: visible; }
.sc-primary-tools, .sc-utility-tools { display: flex; align-items: center; gap: 8px; }
.sc-primary-tools { min-width: 0; overflow-x: auto; padding: 4px; scrollbar-width: thin; scrollbar-color: #b5905960 transparent; }
.sc-utility-tools { flex-shrink: 0; padding-left: 16px; border-left: 1px solid #d8b77c38; }
.sc-workspace :deep(.workspace-dock .sc-utility-tools button) { width: 44px; padding: 8px; background: transparent; }
.sc-workspace kbd { margin-left: 4px; color: #d2b78a; font: 11px var(--font-mono); }
.sc-composer { padding: 12px 16px 16px; border: 1px solid #bd935760; border-radius: 12px; background: #20160ee8; color: #efdfc4; box-shadow: 0 16px 48px #0007; backdrop-filter: blur(16px); }
.sc-composer-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 0 0 8px; }
.sc-composer-heading label { font-size: 13px; font-weight: 600; }
.sc-composer-heading button { display: grid; place-items: center; width: 44px; height: 44px; margin: -4px -8px -4px 0; border: 0; border-radius: 8px; background: transparent; color: #e4c38f; cursor: pointer; }
.sc-composer p { margin: 12px 0 0; color: #d2bda0; font-size: 11px; line-height: 1.5; }
.sc-composer button:focus-visible, .sc-composer input:focus-visible { outline: 2px solid #f0ce97; outline-offset: 3px; }
.sc.has-file.is-room .sc-file-close { justify-content: space-between; margin: 0; padding: 12px 16px; min-height: 44px; border: 0; border-bottom: 1px solid #bd93573b; border-radius: 12px 12px 0 0; background: transparent; }
.sc.has-file.is-room .sc-desk-panel { border: 0; background: transparent; border-radius: 0 0 12px 12px; overflow: hidden; }
.sc.has-file.is-room .sc-tablist { background: #281b128c; }
.sc .sc-objective { display: inline-flex; top: calc(var(--workspace-header-space) + 8px); left: 20px; max-width: min(360px, calc(100% - 280px)); background: #150f09a6; }
.sc .sc-hint-chip { top: calc(var(--workspace-header-space) + 52px); left: 20px; background: #20160dcf; }
.sc .sc-toast { top: calc(var(--workspace-header-space) + 100px); right: 20px; }
.sc-header-hint { min-width: 44px; background: #2b1e118c; border-color: #c69a5a45; }
.sc-options-panel { display: grid; gap: 4px; max-width: 220px; margin-left: auto; padding: 8px; }
.sc-options-panel button { display: flex; align-items: center; gap: 12px; min-height: 44px; padding: 10px 12px; border: 0; border-radius: 8px; color: #efdfc4; background: transparent; font: 13px var(--font-body); cursor: pointer; text-align: left; }
.sc-options-panel button:hover { background: #75532680; }
.sc-tool-new { width: 5px; height: 5px; background: #eac281; border-radius: 50%; }
.sc-portrait { overflow: hidden; border-radius: 8px; }
.sc-collected-find { width: 100%; display: flex; align-items: center; gap: 8px; border: 0; background: transparent; text-align: left; cursor: pointer; }
.sc-collected-find > span { flex: 1; }
.sc-collected-find:focus-visible { outline: 2px solid #e5c183; outline-offset: -2px; }
@keyframes sc-board-arrive { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@keyframes sc-score-arrive { from { transform: translateY(4px) scale(.94); color: #fff4d9; } to { transform: none; } }
html[data-motion="full"] .sc-feed li { animation: none; }
html[data-motion="full"] .sc-feed li:nth-last-child(-n+3) { animation: sc-crew-arrive 380ms cubic-bezier(.16,1,.3,1) both; }
.sc-feed li[data-who="partner"] { border-left: 2px solid #d6ad6a70; padding-left: 10px; background: linear-gradient(90deg, #ad793020, transparent); }
@keyframes sc-crew-arrive { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
@media(max-width: 760px) {
  .sc.has-file.is-room .sc-desk { right: 12px; width: calc(100% - 24px); background: #21170ef2; }
  .sc.has-file.is-room .sc-stage-wrap { display: block; }
  .sc .sc-stage-scroller { overflow-x: auto; overflow-y: hidden; touch-action: pan-x; }
  .sc .sc-stage { min-width: 720px; }
  .sc .sc-findlist { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .sc .sc-findbar { padding: 8px 12px; max-height: 210px; }
  .sc-workspace-stats { right: 12px; gap: 14px; padding: 10px 12px; }
  .sc-workspace-stats strong, .sc-workspace-stats > span:last-child strong { font-size: 26px; }
  .sc-workspace-stats small { font-size: 9px; }
  .sc-header-hint > span { display: none; }
  .sc.is-deduction .sc-deduction-heading { padding-right: 160px; min-height: 72px; }
  .sc .sc-objective { max-width: calc(100% - 190px); }
  .sc.is-deduction .sc-desk { padding: var(--workspace-header-space) 12px var(--workspace-dock-space); }
  .sc-deduction-heading { gap: 6px; margin-bottom: 10px; }
  .sc-deduction-heading h2 { font-size: 24px; }
  .sc.is-deduction .sc-records { grid-template-columns: repeat(auto-fit, minmax(165px, 1fr)); gap: 12px; }
  .sc-primary-tools { gap: 4px; padding: 4px 0; }
  .sc-utility-tools { gap: 0; padding-left: 4px; }
  .sc-workspace :deep(.workspace-dock .sc-primary-tools button) { flex-direction: column; gap: 3px; min-width: 52px; min-height: 48px; padding: 6px 8px; font-size: 11px; }
  .sc-command-tool-label, .sc-find-count, .sc-workspace kbd { display: none; }
  .sc-workspace :deep(.workspace-identity h1), .sc-workspace :deep(.workspace-identity > span) { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .sc .sc-objective, .sc .sc-hint-chip { left: 12px; }
  .sc .sc-toast { top: calc(var(--workspace-header-space) + 52px); right: 12px; width: calc(100% - 24px); }
}
@media(prefers-reduced-motion: reduce) { .sc.is-deduction .sc-desk, .sc-workspace-stats strong { animation: none; } }
@media(min-width: 761px) { .sc .sc-opening .sc-skip { top: calc(var(--workspace-header-space) + 16px); right: 24px; } }
html[data-motion="reduced"] .sc.is-deduction .sc-desk, html[data-motion="reduced"] .sc-workspace-stats strong { animation: none; }


.sc .sc-opening, .sc .sc-reveal { position: absolute; inset: 0; margin: 0; border: 0; border-radius: 0; max-height: 100%; overflow: auto; }
.sc .sc-opening[data-step="cover"] { padding: calc(var(--workspace-header-space) + 16px) clamp(20px, 4vw, 64px) calc(var(--workspace-dock-space) + 16px); background: radial-gradient(ellipse at center, #160f0ba8, #100b07db) !important; }
.sc .sc-opening:not([data-step="cover"]) { background: linear-gradient(transparent 35%, #120b08ee) !important; }
.sc .sc-opening:not([data-step="cover"]), .sc .sc-reveal { padding-top: var(--workspace-header-space); padding-bottom: var(--workspace-dock-space); }
.sc[data-phase="opening"] .sc-stage-wrap { display: block; }
.sc[data-phase="opening"] .sc-desk { display: none; }
.sc-findbar { padding: 0; border: 0; background: none; }
.sc-findbar .sc-findlist { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; margin-top: 14px; }
.sc-findbar .sc-findlist li { min-height: 44px; font-size: 14px; }
.sc-findbar .sc-find-button, .sc-findbar .sc-find-label { width: 100%; min-height: 44px; padding: 10px 12px; }
.sc-findbar .sc-findbar-title { font: 600 25px var(--font-display); color: #eedaba; }
.sc-findbar .sc-assist-note { margin-block: 12px; font-size: 12px; line-height: 1.7; color: #cbb391; }
.sc-intro-note { font: 12px/1.5 var(--font-body); color: #c9b18b; margin: 4px; text-align: center; }
.sc .sc-stage-scroller { display: flex; align-items: flex-start; overflow: auto; padding-bottom: var(--workspace-dock-space); overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: #b5905960 transparent; }
.sc .sc-stage { width: 100%; min-width: max(100%, calc(100dvh * 16 / 9)); min-height: 100dvh; height: auto; flex: 0 0 auto; aspect-ratio: 16 / 9; }
@media(max-width: 760px) {
  .sc .sc-stage-scroller { touch-action: pan-x pan-y; }
  .sc .sc-opening[data-step="cover"] { place-items: safe center; }
  .sc .sc-cover-title { font-size: 34px; }
  .sc .sc-cover-lede { font-size: 14px; line-height: 1.6; }
  .sc .sc-mode { margin-block: 18px; }
  .sc .sc-opening .sc-skip { position: relative; top: auto; right: auto; align-self: center; margin-top: 12px; }
}
@media(prefers-reduced-transparency: reduce) { .sc.has-file.is-room .sc-desk, .sc-composer { background: #21170ef7; backdrop-filter: none; } }

</style>
