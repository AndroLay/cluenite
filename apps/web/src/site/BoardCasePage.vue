<script setup lang="ts">
/* global KeyboardEvent, ResizeObserver, HTMLInputElement, HTMLButtonElement */
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { gsap } from "gsap";
import "./boardCase.css";
import GameShell from "./GameShell.vue";
import GameWorkspace from "./GameWorkspace.vue";
import EvidenceDialog from "./EvidenceDialog.vue";
import GameNotification from "./GameNotification.vue";
import BoardScene from "./BoardScene.vue";
import CardArt from "./CardArt.vue";
import SiteIcon from "./SiteIcon.vue";
import SuspectPortrait from "./SuspectPortrait.vue";
import { createSampleScore, type ScoreCue } from "../audio/sampleScore";
import { reduceMotion, siteSettings } from "./settings";
import { playUi } from "./uiSound";
import type { ViewerTone } from "../sampleCase/crowd";
import {
  BOARD_CASES,
  BOARD_CREW,
  EXPRESS,
  PARTNER_CREW,
  type BoardCard,
  type BoardCaseDef,
  type BoardClaim,
  type BoardSuspect,
  type PartnerScript,
} from "../sampleCase/boardCases";
import {
  QUICK_HANDOFF_MS,
  accuse,
  ask,
  challenge,
  createBoard,
  flip,
  link,
  openRequest,
  parseBoardCommand,
  partnerFinds,
  proof,
  proofGap,
  receive,
  scoreBoard,
  share,
  startBoard,
  type BoardResult,
} from "../sampleCase/boardEngine";

// A board case: the Quick practice case (Pearls on the Night Express) or the co-op practice case (The Lighthouse
// Went Dark). The streamer runs the board; the scripted practice chat votes on which card to turn, posts hunches
// for links, and polls on every theory and suspect. In co-op, Station B (a scripted partner streamer with her own
// chat) holds half the evidence: cards move between the stations by request. Nothing here talks to Twitch.
const props = defineProps<{ caseId: string }>();
const def: BoardCaseDef = BOARD_CASES[props.caseId] ?? EXPRESS;
const coop = def.mode === "coop";
const partner = def.partner;
const panel = ref<"chat" | "theories" | "suspects" | null>(null);
const panelTitle = computed(() => panel.value === "chat" ? "Chat" : panel.value === "theories" ? "Theories" : "Suspects");
const inspectId = ref<string | null>(null);
const newDiscovery = ref(false);
const composerOpen = ref(false);
const commandInput = ref<HTMLInputElement | null>(null);
const commandButton = ref<HTMLButtonElement | null>(null);
async function toggleComposer(): Promise<void> {
  composerOpen.value = !composerOpen.value;
  await nextTick();
  if (composerOpen.value) commandInput.value?.focus(); else commandButton.value?.focus();
}
const foundNotice = ref<{ id: number; title: string; text: string; code: string; art: BoardCard["art"] } | null>(null);
const inspected = computed(() => inspectId.value ? cardOf(inspectId.value) : undefined);
function togglePanel(value: "chat" | "theories" | "suspects"): void { panel.value = panel.value === value ? null : value; }
function pinInspected(): void { if (inspected.value) selected.value = inspected.value.id; inspectId.value = null; }
function shareInspected(): void { if (inspected.value) sendToPartner(inspected.value.id); inspectId.value = null; }
const sceneKind = def.id === "lighthouse" ? "lighthouse" : "express";
const modeLabel = coop ? "Co-op" : "Quick Case";

const cardsById = new Map(def.cards.map((card) => [card.id, card]));
const cardOf = (id: string): BoardCard | undefined => cardsById.get(id);
const titleOf = (id: string): string => cardOf(id)?.title ?? id;
const lower = (text: string): string => text.charAt(0).toLowerCase() + text.slice(1);
const suspectOf = (id: string): BoardSuspect | undefined => def.suspects.find((entry) => entry.id === id);
const claimOf = (id: string): BoardClaim | undefined => def.claims.find((entry) => entry.id === id);
const rowA = def.cards.filter((card) => card.station === "A");
const rowB = def.cards.filter((card) => card.station === "B");
/** Cards the proof needs: chat's sharper viewers vote for these more often. */
const keyCards = new Set<string>([
  ...def.links.filter((entry) => entry.required).flatMap((entry) => [entry.a, entry.b]),
  ...def.claims.filter((claim) => claim.required).map((claim) => claim.decisive),
]);
const TILTS = [-1.6, 1.2, -0.7, 1.7, -1.1, 0.8, -1.4, 1.0];
const tiltOf = (id: string): number => TILTS[def.cards.findIndex((card) => card.id === id) % TILTS.length] ?? 0;

// State -------------------------------------------------------------------------------------------------------------

type Phase = "cover" | "opening" | "playing" | "reveal" | "report";
const board = reactive(createBoard(def));
const phase = ref<Phase>("cover");
/** Game time in ms. It only moves while the board is running, so a pause also pauses chat and Station B. */
const clock = ref(0);
const paused = ref(false);
const selected = ref<string | null>(null);
const hovered = ref<string | null>(null);
const challengeFor = ref<string | null>(null);
const confirmAccuse = ref<string | null>(null);
const hinted = ref<string | null>(null);
const hintsUsed = ref(0);
const fresh = ref<string | null>(null);
const arriving = ref<string[]>([]);
const shaking = ref<string[]>([]);
const command = ref("");

// Feed ---------------------------------------------------------------------------------------------------------------

type FeedBody =
  | { kind: "chat"; who: string; tone: ViewerTone; text: string; station: "A" | "B"; command: boolean }
  | { kind: "partner"; text: string }
  | { kind: "system"; text: string; tone: "good" | "bad" | "info"; points: number }
  | { kind: "hunch"; who: string; tone: ViewerTone; a: string; b: string; status: "open" | "held" | "missed" | "done" };
type FeedItem = FeedBody & { id: number };
const feed = reactive<FeedItem[]>([]);
const crewNotice = computed(() => {
  const item = [...feed].reverse().find(entry => entry.kind === "partner" || (entry.kind === "chat" && entry.who !== "you"));
  if (!item || (item.kind !== "partner" && item.kind !== "chat")) return null;
  return { id: item.id, title: item.kind === "partner" ? `${partner?.name ?? 'Station B'} · scripted` : `${item.who} · scripted`, text: item.text };
});
let feedSeq = 0;

function post(body: FeedBody): void {
  feed.push({ ...body, id: ++feedSeq } as FeedItem);
  if (feed.length > 90) feed.splice(0, feed.length - 90);
}
function toneOf(who: string): ViewerTone {
  return BOARD_CREW.find((viewer) => viewer.id === who)?.tone ?? PARTNER_CREW[who] ?? "brass";
}
function say(who: string, text: string, station: "A" | "B" = "A", isCommand = false): void {
  post({ kind: "chat", who, tone: toneOf(who), text, station, command: isCommand });
}
function sys(text: string, tone: "good" | "bad" | "info", points = 0): void {
  post({ kind: "system", text, tone, points });
}

// Scripted moments run on the game clock.
const timers: { at: number; run: () => void }[] = [];
function later(ms: number, run: () => void): void {
  timers.push({ at: clock.value + ms, run });
}
function runTimers(): void {
  timers.sort((x, y) => x.at - y.at);
  while (timers.length > 0 && (timers[0]?.at ?? Infinity) <= clock.value) timers.shift()?.run();
}
function crowdSay(key: string): void {
  (def.crowd[key] ?? []).forEach(([who, text], index) => later(650 + index * 1150, () => say(who, text)));
}

// Feedback ----------------------------------------------------------------------------------------------------------

const toast = reactive({ text: "", tone: "info" as "good" | "bad" | "info", seq: 0 });
let toastTimer = 0;
function notify(text: string, tone: "good" | "bad" | "info", ms = 3800): void {
  toast.text = text;
  toast.tone = tone;
  toast.seq += 1;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (toast.text = ""), ms);
}

const score = computed(() => scoreBoard(def, board));
let lastTotal = 0;
const floaters = reactive<{ id: number; points: number }[]>([]);
let floaterSeq = 0;
/** Recounts the score and floats the change next to it. */
function settleScore(): number {
  const total = scoreBoard(def, board).total;
  const diff = total - lastTotal;
  lastTotal = total;
  if (diff !== 0) {
    const id = ++floaterSeq;
    floaters.push({ id, points: diff });
    window.setTimeout(() => {
      const index = floaters.findIndex((entry) => entry.id === id);
      if (index >= 0) floaters.splice(index, 1);
    }, 1500);
  }
  return diff;
}
const signed = (points: number): string => (points > 0 ? `+${points}` : `${points}`);
const formatScore = (points: number): string => points.toLocaleString("en-US");

const sound = createSampleScore();
sound.setMuted(!siteSettings.soundOn);
const cue = (name: ScoreCue): void => sound.cue(name);
function onLightning(strength: number): void {
  sound.thunder(strength, 0.9);
}

function flash(list: typeof arriving, ids: string[], ms: number): void {
  list.value = [...list.value, ...ids];
  window.setTimeout(() => (list.value = list.value.filter((id) => !ids.includes(id))), ms);
}

// Derived board state -----------------------------------------------------------------------------------------------

const proofState = computed(() => proof(def, board));
const cleared = computed(
  () => new Set(def.claims.filter((claim) => claim.clears && board.broken.includes(claim.id)).map((c) => c.clears ?? "")),
);
const raisedClaims = computed(() => def.claims.filter((claim) => board.raised.includes(claim.id)));
const faceDownOwn = computed(() => rowA.filter((card) => !board.seen.includes(card.id)).map((card) => card.id));
const openRequests = computed(() => board.requests.filter((entry) => entry.answered === null));
const received = computed(() => rowB.filter((card) => board.seen.includes(card.id)).length);
const running = computed(() => phase.value === "playing" && board.phase === "playing" && !paused.value);

function beliefOf(claim: BoardClaim): number {
  if (board.broken.includes(claim.id)) return 6;
  return Math.max(12, claim.belief - (board.seen.includes(claim.decisive) ? 18 : 0));
}

/** Whom chat would accuse right now, in whole percentages that add up to 100. */
const verdictPoll = computed<Record<string, number>>(() => {
  const weights = def.suspects.map((suspect) => {
    if (cleared.value.has(suspect.id)) return 0.15;
    let weight = 1;
    for (const claim of def.claims) {
      const standing = board.raised.includes(claim.id) && !board.broken.includes(claim.id);
      if (claim.source === "chat" && claim.clears === suspect.id && standing) weight += claim.belief / 25;
    }
    if (suspect.id === def.culprit) {
      weight += def.links.filter((entry) => board.links.includes(entry.id)).length * 1.2;
      weight += def.claims.filter((claim) => claim.required && board.broken.includes(claim.id)).length * 2.4;
    }
    return weight;
  });
  const sum = weights.reduce((total, weight) => total + weight, 0);
  const raw = weights.map((weight) => (weight / sum) * 100);
  const whole = raw.map((value) => Math.floor(value));
  let left = 100 - whole.reduce((total, value) => total + value, 0);
  const order = raw.map((value, index) => ({ rest: value - Math.floor(value), index })).sort((x, y) => y.rest - x.rest);
  for (const { index } of order) {
    if (left <= 0) break;
    whole[index] = (whole[index] ?? 0) + 1;
    left -= 1;
  }
  return Object.fromEntries(def.suspects.map((suspect, index) => [suspect.id, whole[index] ?? 0]));
});

const objective = computed(() => {
  if (board.phase === "solved") return "Case closed";
  const request = openRequests.value[0];
  if (partner && request) return `${partner.name} needs your ${lower(titleOf(request.card))}`;
  if (board.seen.length === 0) return vote.value ? "Chat is picking the first card" : "Turn a card, or let chat pick";
  const check = proofState.value;
  if (check.linksLeft > 0) {
    const ready = def.links.some(
      (entry) => entry.required && !board.links.includes(entry.id) && board.seen.includes(entry.a) && board.seen.includes(entry.b),
    );
    if (ready) return "Link two cards that explain each other";
    const missingB = rowB.some((card) => keyCards.has(card.id) && !board.seen.includes(card.id));
    if (partner && missingB && board.seen.length >= 2) return `Ask ${partner.name} for her harbour files`;
    return "Turn more cards";
  }
  if (check.claimsLeft.length > 0) {
    const decisive = claimOf(check.claimsLeft[0] ?? "")?.decisive ?? "";
    if (partner && cardOf(decisive)?.station === "B" && !board.seen.includes(decisive)) {
      return `Ask ${partner.name} for what breaks the lie`;
    }
    return "Break the key lie with a card";
  }
  return "Proof complete: name the culprit";
});

const clockText = computed(() => {
  const seconds = Math.floor(clock.value / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
});
const parText = `${Math.floor(def.par / 60)}:${String(def.par % 60).padStart(2, "0")}`;

// Chat votes on the next card ---------------------------------------------------------------------------------------

interface VoteRound {
  endsAt: number;
  tallies: Record<string, number>;
  ballots: Record<string, string>;
  nextAt: number;
}
const vote = ref<VoteRound | null>(null);
const VOTE_MS = 7000;
let nextRoundAt = 2400;
const voteTotal = computed(() => Object.values(vote.value?.tallies ?? {}).reduce((sum, count) => sum + count, 0));
const voteLeader = computed(() => {
  const entries = Object.entries(vote.value?.tallies ?? {});
  const best = entries.reduce<[string, number] | null>((top, entry) => (!top || entry[1] > top[1] ? entry : top), null);
  return best && best[1] > 0 ? best[0] : null;
});
const voteLeft = computed(() => (vote.value ? Math.max(0, Math.ceil((vote.value.endsAt - clock.value) / 1000)) : 0));
const votesFor = (id: string): number => vote.value?.tallies[id] ?? 0;

function pickWeighted(ids: string[], eye: number): string {
  const weights = ids.map((id) => (keyCards.has(id) ? 1 + eye * 3 : 1));
  let roll = Math.random() * weights.reduce((sum, weight) => sum + weight, 0);
  for (let index = 0; index < ids.length; index += 1) {
    roll -= weights[index] ?? 0;
    if (roll <= 0) return ids[index] ?? "";
  }
  return ids[ids.length - 1] ?? "";
}

function runVote(): void {
  if (board.phase !== "playing") {
    vote.value = null;
    return;
  }
  const open = faceDownOwn.value;
  const round = vote.value;
  if (!round) {
    if (open.length > 0 && clock.value >= nextRoundAt) {
      vote.value = {
        endsAt: clock.value + VOTE_MS,
        tallies: Object.fromEntries(open.map((id) => [id, 0])),
        ballots: {},
        nextAt: clock.value + 450,
      };
    }
    return;
  }
  for (const id of Object.keys(round.tallies)) if (!open.includes(id)) delete round.tallies[id];
  const choices = Object.keys(round.tallies);
  if (choices.length === 0) {
    vote.value = null;
    nextRoundAt = clock.value + 2500;
    return;
  }
  while (round.nextAt <= clock.value && round.nextAt < round.endsAt) {
    const waiting = BOARD_CREW.filter((viewer) => !(viewer.id in round.ballots));
    const viewer = waiting.length > 0 && Math.random() < 0.55 ? waiting[Math.floor(Math.random() * waiting.length)] : undefined;
    const card = pickWeighted(choices, viewer?.eye ?? 0.45);
    round.tallies[card] = (round.tallies[card] ?? 0) + 1;
    if (viewer) {
      round.ballots[viewer.id] = card;
      say(viewer.id, `!look ${card}`, "A", true);
    }
    round.nextAt += 380 + Math.random() * 620;
  }
  if (clock.value >= round.endsAt) closeVote();
}

/** Ends the vote and turns chat's card. "Go with chat" calls this early. */
function closeVote(): void {
  const round = vote.value;
  if (!round) return;
  vote.value = null;
  nextRoundAt = clock.value + 3200;
  const choices = Object.keys(round.tallies);
  if (choices.length === 0) return;
  const winner = voteLeaderOf(round) ?? pickWeighted(choices, 0.5);
  for (const [viewer, card] of Object.entries(round.ballots)) if (card === winner) credit(viewer, "picks");
  turn(winner, "chat");
}
function voteLeaderOf(round: VoteRound): string | null {
  let best: string | null = null;
  for (const [id, count] of Object.entries(round.tallies)) if (count > 0 && (best === null || count > (round.tallies[best] ?? 0))) best = id;
  return best;
}

// Crew credit for the report ----------------------------------------------------------------------------------------

const crew = reactive<Record<string, { picks: number; hunches: number }>>({});
function credit(who: string, what: "picks" | "hunches"): void {
  const entry = (crew[who] ??= { picks: 0, hunches: 0 });
  entry[what] += 1;
}
const crewRanking = computed(() =>
  Object.entries(crew)
    .map(([id, entry]) => ({ id, tone: toneOf(id), ...entry, points: entry.picks + entry.hunches * 3 }))
    .sort((x, y) => y.points - x.points)
    .slice(0, 3),
);

// Actions -------------------------------------------------------------------------------------------------------------

function turn(id: string, by: "you" | "chat"): void {
  const result = flip(def, board, id, by);
  if (result.code !== "ACCEPTED_NEW") {
    notify(result.message, "info");
    return;
  }
  if (by === "you" && vote.value) {
    vote.value = null;
    nextRoundAt = clock.value + 3200;
  }
  cue("discover");
  const discovered = cardOf(id);
  if (discovered) foundNotice.value = { id: board.seen.length, title: discovered.title, text: discovered.text, code: id, art: discovered.art };
  sys(by === "chat" ? `Chat turned ${titleOf(id)}` : `You turned ${titleOf(id)}`, "good", settleScore());
  crowdSay(`card:${id}`);
  if (result.cue?.kind === "flip") announceClaims(result.cue.raised);
}

function announceClaims(ids: readonly string[]): void {
  ids.forEach((id, index) => {
    const claim = claimOf(id);
    if (!claim) return;
    const voice = BOARD_CREW[(def.claims.indexOf(claim) * 2 + 1) % BOARD_CREW.length]?.id ?? "inkwell_ivy";
    later(900 + index * 900, () => {
      say(voice, claim.text);
      sys(`New theory on the board: ${claim.id}`, "info");
    });
  });
}

function tie(a: string, b: string, hunch: boolean): BoardResult {
  const result = link(def, board, a, b, hunch);
  if (result.code === "ACCEPTED_NEW" && result.cue?.kind === "link") {
    const linkId = result.cue.link;
    const entry = def.links.find((item) => item.id === linkId);
    cue("link");
    fresh.value = linkId;
    window.setTimeout(() => (fresh.value = fresh.value === linkId ? null : fresh.value), 1400);
    sys(`Deduction: ${entry?.title ?? linkId}`, "good", settleScore());
    notify(`${entry?.title ?? ""}. ${entry?.text ?? ""}`, "good", 6500);
    crowdSay(`link:${linkId}`);
    for (const item of feed) {
      if (item.kind === "hunch" && item.status === "open" && [item.a, item.b].sort().join() === [a, b].sort().join()) {
        item.status = "done";
      }
    }
  } else if (result.code === "INVALID" && result.cue?.kind === "miss") {
    cue("miss");
    sys("That link did not hold", "bad", settleScore());
    notify(result.message, "bad");
    flash(shaking, [a, b], 600);
  } else {
    notify(result.message, "info");
  }
  return result;
}

function startChallenge(claimId: string): void {
  panel.value = null;
  selected.value = null;
  confirmAccuse.value = null;
  challengeFor.value = challengeFor.value === claimId ? null : claimId;
  if (challengeFor.value) playUi("select");
}

function tryChallenge(claimId: string, cardId: string): void {
  challengeFor.value = null;
  const claim = claimOf(claimId);
  const result = challenge(def, board, claimId, cardId);
  if (result.code === "ACCEPTED_NEW" && claim) {
    cue("contradiction");
    sys(`Broken: ${claim.id}`, "good", settleScore());
    notify(claim.contradiction, "good", 6500);
    crowdSay(`claim:${claim.id}`);
    if (claim.clears) later(500, () => sys(`${suspectOf(claim.clears ?? "")?.name ?? ""} is cleared`, "info"));
  } else if (result.code === "INVALID" && result.cue?.kind === "miss") {
    cue("miss");
    sys("That challenge missed", "bad", settleScore());
    notify(result.message, "bad");
    flash(shaking, [cardId], 600);
  } else {
    notify(result.message, "info");
  }
}

function askAccuse(id: string): void {
  if (!running.value) return;
  if (!proofState.value.complete) {
    notify(`Not yet: ${proofGap(def, proofState.value)}.`, "info", 5000);
    return;
  }
  selected.value = null;
  challengeFor.value = null;
  confirmAccuse.value = confirmAccuse.value === id ? null : id;
}

function accuseNow(id: string): void {
  confirmAccuse.value = null;
  if (!running.value) return;
  const result = accuse(def, board, id, clock.value);
  if (result.code === "ACCEPTED_NEW") {
    cue("reveal");
    sound.setMood("resolved");
    vote.value = null;
    sys(`Case closed: ${suspectOf(id)?.name ?? id}`, "good", settleScore());
    notify(result.message, "good");
    crowdSay("solved");
    if (partner) later(700, () => post({ kind: "partner", text: partner.agree }));
    later(reduceMotion.value ? 1400 : 2600, goReveal);
  } else if (result.cue?.kind === "wrong-accusation") {
    cue("miss");
    sys(`Wrong accusation: ${suspectOf(id)?.name ?? id}`, "bad", settleScore());
    notify(result.message, "bad");
    crowdSay("wrong");
    if (partner) later(900, () => post({ kind: "partner", text: partner.disagree }));
  } else {
    notify(result.message, "info", 5000);
  }
}

// Co-op: Station B ----------------------------------------------------------------------------------------------------

function deliver(ids: readonly string[]): void {
  const landed: string[] = [];
  for (const id of ids) {
    if (board.seen.includes(id) || !board.partnerFound.includes(id) || board.phase !== "playing") continue;
    const raised = receive(def, board, id);
    landed.push(id);
    sys(`Station B sent ${titleOf(id)}`, "good", settleScore());
    crowdSay(`card:${id}`);
    announceClaims(raised);
  }
  if (landed.length === 0) return;
  cue("timeline");
  flash(arriving, landed, 1700);
  const latest = cardOf(landed[landed.length - 1]!);
  if (latest) foundNotice.value = { id: board.seen.length, title: latest.title, text: `${partner?.name ?? "Station B"} shared this finding. ${latest.text}`, code: latest.id, art: latest.art };
  notify(`${partner?.name ?? "Station B"} sent ${landed.map(titleOf).join(" and ")}.`, "good");
}

function replyToShare(request: PartnerScript["requests"][number]): void {
  if (!partner) return;
  // A response cannot mention or deliver a file before Station B finds it.
  const replyDelay = Math.max(1300, ...request.sends.map((id) =>
    (partner.finds.find((entry) => entry.card === id)?.after ?? clock.value) - clock.value + 900,
  ));
  later(replyDelay, () => {
    if (board.phase === "playing" && request.sends.some((id) => !board.seen.includes(id))) {
      post({ kind: "partner", text: request.reply });
    }
  });
  later(replyDelay + 1600, () => deliver(request.sends));
}

function sendToPartner(id: string): void {
  if (!partner || !running.value) return;
  const request = partner.requests.find((entry) => entry.card === id);
  const result = share(def, board, id, clock.value);
  if (result.code !== "ACCEPTED_NEW" || result.cue?.kind !== "shared") {
    notify(result.message, result.code === "ACCEPTED_ALREADY_KNOWN" ? "info" : "bad");
    return;
  }
  const quick = result.cue.quick;
  selected.value = null;
  playUi("success");
  sys(`You sent ${titleOf(id)} to Station B${quick ? " · quick hand-off" : ""}`, "good", settleScore());
  notify(`Sent ${titleOf(id)} to ${partner.name}.`, "good");
  if (result.cue.request && request) {
    replyToShare(request);
  } else {
    later(1200, () => post({ kind: "partner", text: "Got it. That helps over here." }));
  }
}

function sendSelected(): void {
  if (selected.value) sendToPartner(selected.value);
}

function askFor(id: string): void {
  if (!partner || !running.value) return;
  const result = ask(def, board, id);
  if (result.code !== "ACCEPTED_NEW" || result.cue?.kind !== "asked") {
    notify(result.message, "info");
    return;
  }
  playUi("select");
  sys(result.message, "info");
  if (result.cue.ready) {
    later(1100, () => post({ kind: "partner", text: partner.sending }));
    later(2200, () => deliver([id]));
  } else {
    later(1000, () => post({ kind: "partner", text: partner.digging }));
  }
}

function slotState(card: BoardCard): "missing" | "found" | "asked" | "here" {
  if (board.seen.includes(card.id)) return "here";
  if (board.asked.includes(card.id)) return "asked";
  return board.partnerFound.includes(card.id) ? "found" : "missing";
}

function schedulePartner(): void {
  if (!partner) return;
  later(1400, () => post({ kind: "partner", text: partner.hello }));
  for (const find of partner.finds) {
    later(find.after, () => {
      if (board.phase !== "playing") return;
      partnerFinds(board, find.card);
      post({ kind: "partner", text: find.line });
      if (board.asked.includes(find.card) && !board.seen.includes(find.card)) {
        later(900, () => post({ kind: "partner", text: "Found it. Sending it over." }));
        later(2000, () => deliver([find.card]));
      } else if (keyCards.has(find.card)) {
        later(9000, () => {
          if (board.phase !== "playing" || board.seen.includes(find.card) || board.asked.includes(find.card)) return;
          post({ kind: "partner", text: `I have the ${lower(titleOf(find.card))} here. Want it? Just ask.` });
        });
      }
    });
  }
  for (const request of partner.requests) {
    later(request.after, () => {
      if (board.phase !== "playing" || board.requests.some((entry) => entry.card === request.card)) return;
      if (board.shared.includes(request.card)) {
        replyToShare(request);
        return;
      }
      openRequest(board, request.card, clock.value);
      post({ kind: "partner", text: request.ask });
      cue("hint");
      notify(`${partner.name} asks for your ${lower(cardOf(request.card)?.back ?? "card")} card.`, "info", 5000);
    });
  }
  partner.chat.forEach(([who, text], index) =>
    later(9000 + index * 17000, () => {
      if (board.phase === "playing") say(who, text, "B");
    }),
  );
}

function requestLeft(at: number): number {
  return Math.max(0, Math.ceil((at + QUICK_HANDOFF_MS - clock.value) / 1000));
}

// Hunches: chat proposes links ------------------------------------------------------------------------------------------

const hunchPosted = new Set<number>();
let lastHunchAt = -99999;
function runHunches(): void {
  if (board.phase !== "playing" || clock.value - lastHunchAt < 7000) return;
  const linked = (a: string, b: string): boolean =>
    def.links.some((entry) => ((entry.a === a && entry.b === b) || (entry.a === b && entry.b === a)) && board.links.includes(entry.id));
  const index = def.hunches.findIndex(
    (hunch, i) => !hunchPosted.has(i) && board.seen.includes(hunch.a) && board.seen.includes(hunch.b) && !linked(hunch.a, hunch.b),
  );
  const hunch = def.hunches[index];
  if (!hunch) return;
  hunchPosted.add(index);
  lastHunchAt = clock.value;
  post({ kind: "hunch", who: hunch.viewer, tone: toneOf(hunch.viewer), a: hunch.a, b: hunch.b, status: "open" });
}
function tryHunch(item: FeedItem): void {
  if (item.kind !== "hunch" || item.status !== "open") return;
  const result = tie(item.a, item.b, true);
  item.status = result.code === "ACCEPTED_NEW" ? "held" : result.code === "ACCEPTED_ALREADY_KNOWN" ? "done" : "missed";
  if (item.status === "held") credit(item.who, "hunches");
}

// Hints ----------------------------------------------------------------------------------------------------------------

function nextHint(): { text: string; card: string | null } {
  const request = openRequests.value[0];
  if (partner && request) {
    return { text: `${partner.name} is waiting on your ${lower(titleOf(request.card))}. Select it, then Send.`, card: request.card };
  }
  const where = (card: BoardCard): string =>
    card.station === "A" ? `turn the card from ${lower(card.back)}` : `ask ${partner?.name ?? "Station B"} for ${lower(card.back)}`;
  for (const entry of def.links) {
    if (!entry.required || board.links.includes(entry.id)) continue;
    const missing = [entry.a, entry.b].map(cardOf).find((card) => card && !board.seen.includes(card.id));
    if (!missing) return { text: `look at ${lower(titleOf(entry.a))} again. What else on the board does it explain?`, card: entry.a };
    return { text: where(missing), card: missing.id };
  }
  for (const claim of def.claims) {
    if (!claim.required || board.broken.includes(claim.id)) continue;
    const card = cardOf(claim.decisive);
    if (!card) continue;
    if (board.seen.includes(card.id)) return { text: `${claim.id} has a hole. Try ${lower(card.title)} against it.`, card: card.id };
    return { text: where(card), card: card.id };
  }
  return { text: "the proof holds. Who is left standing?", card: null };
}
function giveHint(): void {
  if (!running.value) return;
  hintsUsed.value += 1;
  const { text, card } = nextHint();
  say("ledger_lou", text);
  notify(`Hint: ${text.charAt(0).toUpperCase()}${text.slice(1)}`, "info", 5000);
  cue("hint");
  if (card) {
    hinted.value = card;
    window.setTimeout(() => (hinted.value = hinted.value === card ? null : hinted.value), 5000);
  }
}

// Board input ------------------------------------------------------------------------------------------------------------

function onCard(card: BoardCard): void {
  if (!running.value) return;
  confirmAccuse.value = null;
  if (!board.seen.includes(card.id)) {
    if (card.station === "A") {
      selected.value = null;
      turn(card.id, "you");
    } else {
      askFor(card.id);
    }
    return;
  }
  if (challengeFor.value) {
    tryChallenge(challengeFor.value, card.id);
    return;
  }
  if (selected.value === null) {
    inspectId.value = card.id;
    newDiscovery.value = false;
    playUi("select");
    return;
  }
  if (selected.value === card.id) {
    selected.value = null;
    return;
  }
  const first = selected.value;
  selected.value = null;
  tie(first, card.id, false);
}

function cardLabel(card: BoardCard): string {
  if (!board.seen.includes(card.id)) {
    if (card.station === "B") {
      const state = slotState(card);
      const status =
        state === "found" ? `Found at Station B. Ask ${partner?.name ?? "Station B"} for it.` : state === "asked" ? "Asked for." : "Not found yet. Ask anyway.";
      return `Station B card ${card.id}, ${card.back}. ${status}`;
    }
    const votes = votesFor(card.id);
    return `Face-down card ${card.id}, ${card.back}.${votes ? ` ${votes} chat votes.` : ""} Turn it.`;
  }
  const action = challengeFor.value ? "Use it against the theory." : selected.value === card.id ? "Selected. Press again to cancel." : "Select it to read in full and link.";
  return `${card.title}. ${card.text} ${action}`;
}

function runCommand(): void {
  const text = command.value.trim();
  if (!text) return;
  command.value = "";
  say("you", text, "A", true);
  if (!running.value) {
    notify("The case is not running.", "info");
    return;
  }
  const parsed = parseBoardCommand(def, text);
  switch (parsed.kind) {
    case "look":
      turn(parsed.card, "you");
      break;
    case "link":
      tie(parsed.a, parsed.b, false);
      break;
    case "challenge":
      tryChallenge(parsed.claim, parsed.card);
      break;
    case "solve":
      if (!proofState.value.complete) notify(`Not yet: ${proofGap(def, proofState.value)}.`, "info", 5000);
      else accuseNow(parsed.suspect);
      break;
    case "share":
      sendToPartner(parsed.card);
      break;
    case "ask":
      askFor(parsed.card);
      break;
    default:
      notify(parsed.message, "bad", 5000);
  }
}

function onKey(event: KeyboardEvent): void {
  if (inspectId.value) return;
  if (event.key !== "Escape") return;
  if (composerOpen.value) { event.preventDefault(); void toggleComposer(); return; }
  selected.value = null;
  challengeFor.value = null;
  confirmAccuse.value = null;
}

// Threads ------------------------------------------------------------------------------------------------------------------

const boardEl = ref<HTMLElement | null>(null);
const pins = reactive<Record<string, { x: number; y: number }>>({});
const boardBox = reactive({ w: 1, h: 1 });
let resizeObserver: ResizeObserver | null = null;

function measure(): void {
  const host = boardEl.value;
  if (!host) return;
  const box = host.getBoundingClientRect();
  boardBox.w = Math.max(1, box.width);
  boardBox.h = Math.max(1, box.height);
  for (const el of host.querySelectorAll<HTMLElement>("[data-card]")) {
    const rect = el.getBoundingClientRect();
    const id = el.dataset.card ?? "";
    pins[id] = { x: rect.left - box.left + rect.width / 2, y: rect.top - box.top + 12 };
  }
}
watch(boardEl, (el) => {
  resizeObserver?.disconnect();
  if (!el) return;
  resizeObserver = new ResizeObserver(() => measure());
  resizeObserver.observe(el);
  void nextTick(measure);
});

function thread(a: string, b: string): { d: string; x: number; y: number } | null {
  const p = pins[a];
  const q = pins[b];
  if (!p || !q) return null;
  const cx = (p.x + q.x) / 2;
  const cy = (p.y + q.y) / 2 + Math.min(70, Math.hypot(q.x - p.x, q.y - p.y) * 0.16);
  return { d: `M${p.x} ${p.y} Q${cx} ${cy} ${q.x} ${q.y}`, x: 0.25 * p.x + 0.5 * cx + 0.25 * q.x, y: 0.25 * p.y + 0.5 * cy + 0.25 * q.y };
}
const threads = computed(() =>
  board.links.flatMap((id) => {
    const entry = def.links.find((item) => item.id === id);
    const path = entry ? thread(entry.a, entry.b) : null;
    return entry && path ? [{ id, title: entry.title, ...path }] : [];
  }),
);
const preview = computed(() => {
  const from = selected.value;
  const to = hovered.value;
  if (!from || !to || from === to || !board.seen.includes(to)) return null;
  return thread(from, to);
});

// Phases ---------------------------------------------------------------------------------------------------------------------

const openingStep = ref(0);
const openingDark = ref(false);
const openingWreck = ref(false);
let openingTimer = 0;
const wallTimers: number[] = [];
function wall(ms: number, run: () => void): void {
  wallTimers.push(window.setTimeout(run, ms));
}

function begin(): void {
  playUi("select");
  if (siteSettings.soundOn) void sound.start();
  sound.setMood("opening");
  phase.value = "opening";
  openingStep.value = 0;
  openingDark.value = false;
  openingWreck.value = false;
  cue("type");
  wall(1300, () => {
    if (phase.value !== "opening") return;
    openingDark.value = true;
    sound.thunder(sceneKind === "express" ? 0.45 : 0.85, sceneKind === "express" ? 0.1 : 0.7);
  });
  stepOpening();
}
function stepOpening(): void {
  window.clearTimeout(openingTimer);
  openingTimer = window.setTimeout(() => {
    if (phase.value !== "opening") return;
    if (openingStep.value < def.opening.length - 1) {
      openingStep.value += 1;
      cue("type");
      if (sceneKind === "express" && openingStep.value === 1) openingDark.value = false;
      if (sceneKind === "lighthouse" && openingStep.value === 1) openingWreck.value = true;
      stepOpening();
    } else {
      beginPlay();
    }
  }, 3900);
}

function beginPlay(): void {
  window.clearTimeout(openingTimer);
  phase.value = "playing";
  sound.setMood("investigation");
  startBoard(board, 0);
  clock.value = 0;
  lastWall = window.performance.now();
  for (const [index, [who, text]] of (def.crowd.start ?? []).entries()) later(1200 + index * 1500, () => say(who, text));
  schedulePartner();
}

let proofAnnounced = false;
watch(
  () => proofState.value.complete,
  (complete) => {
    if (!complete || proofAnnounced || board.phase !== "playing") return;
    proofAnnounced = true;
    sound.setMood("tension");
    later(600, () => {
      sys("The proof is complete. Name the culprit.", "good");
      notify("The proof is complete. Name the culprit.", "good", 5000);
    });
    // Chat calls its verdict in the live grammar.
    BOARD_CREW.slice(0, 3).forEach((viewer, index) =>
      later(1600 + index * 1300, () => {
        const ranked = Object.entries(verdictPoll.value).sort((x, y) => y[1] - x[1]);
        const pick = index === 2 && ranked[1] ? ranked[1][0] : (ranked[0]?.[0] ?? def.culprit);
        say(viewer.id, `!solve ${pick}`, "A", true);
      }),
    );
  },
);

const revealStep = ref(0);
let revealTimer = 0;
const beatsShown = computed(() => def.reveal.beats.slice(0, revealStep.value));
const twistShown = computed(() => revealStep.value > def.reveal.beats.length);
function goReveal(): void {
  if (phase.value !== "playing") return;
  phase.value = "reveal";
  revealStep.value = 0;
  window.scrollTo({ top: 0 });
  stepReveal();
}
function stepReveal(): void {
  window.clearTimeout(revealTimer);
  if (twistShown.value) return;
  revealTimer = window.setTimeout(
    () => {
      revealStep.value += 1;
      cue(twistShown.value ? "stamp" : "timeline");
      stepReveal();
    },
    revealStep.value === 0 ? 800 : 3000,
  );
}
function showAllBeats(): void {
  window.clearTimeout(revealTimer);
  revealStep.value = def.reveal.beats.length + 1;
  cue("stamp");
}

const shownTotal = reactive({ value: 0 });
let countUp: gsap.core.Tween | null = null;
function goReport(): void {
  phase.value = "report";
  window.scrollTo({ top: 0 });
  cue("stamp");
  playUi("success");
  const total = score.value.total;
  if (reduceMotion.value) {
    shownTotal.value = total;
    return;
  }
  const counter = { value: 0 };
  shownTotal.value = 0;
  countUp = gsap.to(counter, {
    value: total,
    duration: 1.6,
    ease: "power2.out",
    onUpdate: () => (shownTotal.value = Math.round(counter.value)),
  });
}

function playAgain(): void {
  panel.value = null;
  inspectId.value = null;
  newDiscovery.value = false;
  foundNotice.value = null;
  composerOpen.value = false;
  for (const id of wallTimers.splice(0)) window.clearTimeout(id);
  window.clearTimeout(revealTimer);
  Object.assign(board, createBoard(def));
  feed.splice(0);
  timers.splice(0);
  floaters.splice(0);
  for (const key of Object.keys(crew)) delete crew[key];
  for (const key of Object.keys(pins)) delete pins[key];
  hunchPosted.clear();
  lastHunchAt = -99999;
  lastTotal = 0;
  nextRoundAt = 2400;
  proofAnnounced = false;
  vote.value = null;
  selected.value = null;
  challengeFor.value = null;
  confirmAccuse.value = null;
  hintsUsed.value = 0;
  paused.value = false;
  playUi("select");
  beginPlay();
  window.scrollTo({ top: 0 });
}

function togglePause(): void {
  if (phase.value !== "playing" || board.phase !== "playing") return;
  paused.value = !paused.value;
  playUi(paused.value ? "back" : "select");
}

// The game loop ---------------------------------------------------------------------------------------------------------------

let ticker = 0;
let lastWall = 0;
function tick(): void {
  const now = window.performance.now();
  const delta = Math.min(500, now - lastWall);
  lastWall = now;
  if (phase.value !== "playing" || paused.value) return;
  clock.value += delta;
  runTimers();
  runVote();
  runHunches();
}
function onVisibility(): void {
  if (document.hidden && phase.value === "playing" && board.phase === "playing") paused.value = true;
}

const feedEl = ref<HTMLElement | null>(null);
let stickToBottom = true;
function onFeedScroll(): void {
  const el = feedEl.value;
  if (el) stickToBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
}
watch(
  () => feed[feed.length - 1]?.id,
  () =>
    void nextTick(() => {
      const el = feedEl.value;
      if (el && stickToBottom) el.scrollTop = el.scrollHeight;
    }),
);

watch(
  () => siteSettings.soundOn,
  (on) => {
    sound.setMuted(!on);
    if (on && phase.value !== "cover") void sound.start();
  },
);

onMounted(() => {
  lastWall = window.performance.now();
  ticker = window.setInterval(tick, 100);
  window.addEventListener("keydown", onKey);
  document.addEventListener("visibilitychange", onVisibility);
});
onBeforeUnmount(() => {
  window.clearInterval(ticker);
  window.clearTimeout(openingTimer);
  window.clearTimeout(revealTimer);
  window.clearTimeout(toastTimer);
  for (const id of wallTimers) window.clearTimeout(id);
  window.removeEventListener("keydown", onKey);
  document.removeEventListener("visibilitychange", onVisibility);
  resizeObserver?.disconnect();
  countUp?.kill();
  sound.dispose();
});

const sourceLabel = (claim: BoardClaim): string =>
  claim.source === "chat" ? "Chat’s theory" : `${suspectOf(claim.source)?.name ?? claim.source} says`;
</script>

<template>
  <GameShell class="bc-shell" :scene="false" :immersive="phase === 'playing' || phase === 'opening'" dim="strong">
    <div class="bc" :data-case="def.id">
      <!-- Cover -->
      <section v-if="phase === 'cover'" class="bc-cover" aria-labelledby="bc-title">
        <div class="bc-cover-scene" data-enter style="--i: 0">
          <BoardScene :kind="sceneKind" @lightning="onLightning" />
          <span class="bc-cover-tag">{{ modeLabel }} · practice</span>
        </div>
        <div class="bc-cover-body">
          <div class="bc-cover-text" data-enter style="--i: 1">
            <p class="gs-eyebrow">{{ def.place }}</p>
            <h1 id="bc-title" class="gs-h1">{{ def.title }}</h1>
            <p class="gs-lede">{{ def.premise }}</p>
            <p class="bc-question"><span>The question</span>{{ def.question }}</p>
            <div class="bc-cover-actions">
              <button type="button" class="gs-btn gs-btn--gold gs-btn--lg" @click="begin">
                <SiteIcon name="play" /> Start the case
              </button>
              <a class="gs-btn gs-btn--ghost" href="/play" @click="playUi('back')">Choose another case</a>
            </div>
          </div>
          <div class="bc-cover-side" data-enter style="--i: 2">
            <h2 class="gs-h3">How this case plays</h2>
            <ol class="bc-how">
              <li><SiteIcon name="chat" /> <span><strong>Chat votes</strong> on which card to turn. Go with chat, or turn one yourself.</span></li>
              <li><SiteIcon name="link" /> <span><strong>Link two cards</strong> that explain each other. Chat posts hunches you can try.</span></li>
              <li><SiteIcon name="scales" /> <span><strong>Break the lie</strong> with the right card, then name the culprit.</span></li>
              <li v-if="partner">
                <SiteIcon name="people" />
                <span><strong>Trade cards with {{ partner.name }}.</strong> She holds the harbour files; you hold the lighthouse.</span>
              </li>
            </ol>
            <h2 class="gs-h3">Suspects</h2>
            <ul class="bc-lineup">
              <li v-for="suspect in def.suspects" :key="suspect.id">
                <SuspectPortrait :kind="suspect.portrait" />
                <span><strong>{{ suspect.name }}</strong>{{ suspect.role }}</span>
              </li>
            </ul>
            <p class="bc-honest">
              {{ coop ? "Practice chat and Station B are scripted in this browser." : "Practice chat is scripted in this browser." }}
              Nothing is sent to Twitch.
            </p>
          </div>
        </div>
      </section>

      <!-- Opening -->
      <section v-else-if="phase === 'opening'" class="bc-opening" aria-labelledby="bc-title">
        <nav class="bc-opening-controls" aria-label="Introduction controls"><a class="gs-btn gs-btn--ghost" href="/play"><SiteIcon name="arrow-left" /> Cases</a><button type="button" class="gs-btn gs-btn--gold" @click="beginPlay">Skip the intro <SiteIcon name="arrow-right" /></button></nav>
        <div class="bc-opening-scene">
          <BoardScene :kind="sceneKind" :dark="openingDark" :wreck="openingWreck" @lightning="onLightning" />
        </div>
        <div class="bc-opening-copy">
          <h1 id="bc-title" class="bc-opening-title">{{ def.title }}</h1>
          <Transition name="bc-line" mode="out-in">
            <p :key="openingStep" class="bc-opening-line">{{ def.opening[openingStep] }}</p>
          </Transition>
          <div class="bc-opening-dots" aria-hidden="true">
            <span v-for="(_, index) in def.opening" :key="index" :class="{ 'is-on': index <= openingStep }"></span>
          </div>
        </div>
      </section>

      <!-- The board -->
      <GameWorkspace v-else-if="phase === 'playing'" class="bc-play" :class="{ 'is-coop': coop }" :title="def.title" :panel="panel" :panel-title="panelTitle" @close-panel="panel = null">
        <template #header><div class="bc-hud">
          <div class="bc-hud-scene" aria-hidden="true">
            <BoardScene :kind="sceneKind" variant="strip" :dark="sceneKind === 'lighthouse' && board.phase !== 'solved'" />
          </div>
          <div class="bc-hud-title">
            <p class="bc-hud-mode">{{ modeLabel }} · practice</p>
            <h1 id="bc-title">{{ def.title }}</h1>
          </div>
          <p class="bc-objective" :title="def.question"><SiteIcon name="target" /> {{ objective }}</p>
          <div class="bc-hud-stats">
            <div class="bc-proof" :aria-label="`Proof ${proofState.done} of ${proofState.needed}`" role="img">
              <span class="bc-stat-label">Proof</span>
              <span class="bc-proof-pips">
                <span v-for="n in proofState.needed" :key="n" :class="{ 'is-on': n <= proofState.done }"></span>
              </span>
            </div>
            <div class="bc-stat" aria-label="Case elapsed time">
              <span class="bc-stat-label">Time</span>
              <span class="bc-stat-value">{{ clockText }}<small> / par {{ parText }}</small></span>
            </div>
            <div class="bc-stat bc-score" aria-label="Case score">
              <span class="bc-stat-label">Score</span>
              <span :key="score.total" class="bc-stat-value">{{ formatScore(score.total) }}</span>
              <span v-for="f in floaters" :key="f.id" class="bc-floater" :class="{ 'is-bad': f.points < 0 }" aria-hidden="true">
                {{ signed(f.points) }}
              </span>
            </div>
            <button type="button" class="bc-hud-btn" :disabled="!running" @click="giveHint">
              <SiteIcon name="hint" /> Hint
            </button>
            <button type="button" class="bc-hud-btn" :aria-pressed="paused" @click="togglePause">
              <SiteIcon :name="paused ? 'play' : 'square'" /> {{ paused ? "Resume" : "Pause" }}
            </button>
          </div>
        </div></template>

        <div class="bc-stage">
          <div class="bc-scene-window" :class="{ 'is-paused': !running }" aria-hidden="true"><BoardScene :kind="sceneKind" variant="hero" :paused="!running" :progress="board.seen.length" :connections="proofState.done" :shares="board.shared.length + received" :dark="sceneKind === 'lighthouse'" :wreck="sceneKind === 'lighthouse'" /><span class="bc-scene-caption">Illustrated scene · {{ sceneKind === 'express' ? 'The Night Express · Harrow line' : 'Greyhaven Point · Two stations, one investigation' }}</span></div>
          <!-- Board -->
          <section class="bc-board-wrap" aria-labelledby="bc-board-title">
            <h2 id="bc-board-title" class="bc-visually-hidden">Evidence board</h2>
            <div class="bc-banner" :class="{ 'is-vote': vote && !selected && !challengeFor }">
              <template v-if="challengeFor">
                <SiteIcon name="scales" />
                <p>Pick the card that breaks <strong>{{ challengeFor }}</strong>.</p>
                <button type="button" class="bc-banner-btn" @click="challengeFor = null">Cancel</button>
              </template>
              <template v-else-if="selected">
                <SiteIcon name="link" />
                <p>Linking <strong>{{ titleOf(selected) }}</strong>: pick a second card.</p>
                <button
                  v-if="partner && cardOf(selected)?.station === 'A'"
                  type="button"
                  class="bc-banner-btn is-gold"
                  :disabled="board.shared.includes(selected) || !running"
                  @click="sendSelected"
                >
                  <SiteIcon name="send" /> {{ board.shared.includes(selected) ? "Sent" : `Send to ${partner.name}` }}
                </button>
                <button type="button" class="bc-banner-btn" @click="selected = null">Cancel</button>
              </template>
              <template v-else-if="vote">
                <span class="bc-vote-ring" :style="{ '--left': voteLeft / (VOTE_MS / 1000) }" aria-hidden="true">{{ voteLeft }}</span>
                <p><strong>Chat is voting</strong> on the next card · {{ voteTotal }} votes. Or turn one yourself.</p>
                <button type="button" class="bc-banner-btn is-gold" :disabled="voteTotal === 0 || !running" @click="closeVote">
                  Go with chat
                </button>
              </template>
              <template v-else>
                <SiteIcon name="eye" />
                <p>
                  {{ faceDownOwn.length ? "Chat is talking it over." : "Every card is turned. Link them, then break the lie." }}
                  Select a turned card to read it in full.
                </p>
              </template>
            </div>

            <section v-if="selected" class="bc-evidence-detail" aria-label="Selected evidence" aria-live="polite">
              <h3>{{ titleOf(selected) }} <code>{{ selected }}</code></h3>
              <p>{{ cardOf(selected)?.text }}</p>
            </section>

            <div ref="boardEl" class="bc-board" :class="{ 'is-challenge': challengeFor, 'is-linking': selected }">
              <svg class="bc-threads" :viewBox="`0 0 ${boardBox.w} ${boardBox.h}`" aria-hidden="true">
                <g v-for="t in threads" :key="t.id" :class="{ 'is-fresh': fresh === t.id }">
                  <title>{{ t.title }}</title>
                  <path class="bc-thread-shadow" :d="t.d" />
                  <path class="bc-thread" :d="t.d" pathLength="1" />
                  <circle class="bc-knot" :cx="t.x" :cy="t.y" r="4.5" />
                </g>
                <path v-if="preview" class="bc-thread is-preview" :d="preview.d" />
              </svg>

              <p v-if="coop" class="bc-zone"><SiteIcon name="home" /> Station A · your lighthouse</p>
              <div class="bc-row" :style="{ '--cols': coop ? 4 : 3 }">
                <button
                  v-for="card in rowA"
                  :key="card.id"
                  type="button"
                  class="bc-card"
                  :data-card="card.id"
                  :class="{
                    'is-up': board.seen.includes(card.id),
                    'is-selected': selected === card.id,
                    'is-target': !!challengeFor && board.seen.includes(card.id),
                    'is-lead': voteLeader === card.id && !board.seen.includes(card.id),
                    'is-hinted': hinted === card.id,
                    'is-shake': shaking.includes(card.id),
                    'is-shared': board.shared.includes(card.id),
                    'is-requested': openRequests.some((entry) => entry.card === card.id),
                  }"
                  :style="{ '--tilt': `${tiltOf(card.id)}deg` }"
                  :aria-pressed="selected === card.id"
                  :aria-label="cardLabel(card)"
                  :disabled="!running"
                  @click="onCard(card)"
                  @mouseenter="hovered = card.id"
                  @mouseleave="hovered = null"
                  @focus="hovered = card.id"
                  @blur="hovered = null"
                >
                  <span class="bc-pin" aria-hidden="true"></span>
                  <span class="bc-flip">
                    <span class="bc-face bc-back">
                      <span class="bc-back-mark"><SiteIcon name="search" /></span>
                      <span class="bc-back-where">{{ card.back }}</span>
                      <code class="bc-code">{{ card.id }}</code>
                      <span v-if="vote && votesFor(card.id) > 0" class="bc-votes">
                        <span class="bc-votes-bar"><span :style="{ width: `${(votesFor(card.id) / Math.max(1, voteTotal)) * 100}%` }"></span></span>
                        <span>{{ votesFor(card.id) }} {{ votesFor(card.id) === 1 ? "vote" : "votes" }}</span>
                      </span>
                    </span>
                    <span class="bc-face bc-front">
                      <span class="bc-art"><CardArt :kind="card.art" /></span>
                      <span class="bc-front-text">
                        <strong>{{ card.title }}</strong>
                        <span>{{ card.text }}</span>
                      </span>
                      <code class="bc-code">{{ card.id }}</code>
                      <span v-if="board.shared.includes(card.id)" class="bc-sent">Sent to B</span>
                    </span>
                  </span>
                </button>
              </div>

              <template v-if="coop && partner">
                <p class="bc-zone is-b"><SiteIcon name="people" /> Station B · {{ partner.name }}’s harbour office</p>
                <div class="bc-row" style="--cols: 4">
                  <button
                    v-for="card in rowB"
                    :key="card.id"
                    type="button"
                    class="bc-card is-remote"
                    :data-card="card.id"
                    :data-slot="slotState(card)"
                    :class="{
                      'is-up': board.seen.includes(card.id),
                      'is-selected': selected === card.id,
                      'is-target': !!challengeFor && board.seen.includes(card.id),
                      'is-hinted': hinted === card.id,
                      'is-shake': shaking.includes(card.id),
                      'is-arriving': arriving.includes(card.id),
                    }"
                    :style="{ '--tilt': `${tiltOf(card.id)}deg` }"
                    :aria-pressed="selected === card.id"
                    :aria-label="cardLabel(card)"
                    :disabled="!running"
                    @click="onCard(card)"
                    @mouseenter="hovered = card.id"
                    @mouseleave="hovered = null"
                    @focus="hovered = card.id"
                    @blur="hovered = null"
                  >
                    <span class="bc-pin" aria-hidden="true"></span>
                    <span class="bc-flip">
                      <span class="bc-face bc-back">
                        <span class="bc-back-mark is-b">B</span>
                        <span class="bc-back-where">{{ card.back }}</span>
                        <code class="bc-code">{{ card.id }}</code>
                        <span class="bc-slot-state">
                          {{
                            slotState(card) === "found"
                              ? `Found · Ask ${partner.name}`
                              : slotState(card) === "asked"
                                ? "Asked · on its way"
                                : "Not found yet"
                          }}
                        </span>
                      </span>
                      <span class="bc-face bc-front">
                        <span class="bc-art"><CardArt :kind="card.art" /></span>
                        <span class="bc-front-text">
                          <strong>{{ card.title }}</strong>
                          <span>{{ card.text }}</span>
                        </span>
                        <code class="bc-code">{{ card.id }}</code>
                        <span class="bc-sent is-b">From B</span>
                      </span>
                    </span>
                  </button>
                </div>
              </template>

              <div v-if="paused" class="bc-paused">
                <p>Paused</p>
                <button type="button" class="gs-btn gs-btn--gold" @click="togglePause"><SiteIcon name="play" /> Resume</button>
              </div>
            </div>

            <div class="bc-toast" role="status" aria-live="polite" :data-tone="toast.tone" :class="{ 'is-on': toast.text }">
              <span :key="toast.seq">{{ toast.text }}</span>
            </div>


          </section>


        </div>
        <template #tools>
          <button type="button" :aria-pressed="panel === 'theories'" @click="togglePanel('theories')"><SiteIcon name="scales" />Theories<span>{{ board.broken.length }}/{{ board.raised.length }}</span></button>
          <button type="button" :aria-pressed="panel === 'suspects'" @click="togglePanel('suspects')"><SiteIcon name="people" />Suspects</button>
          <button type="button" :aria-pressed="panel === 'chat'" @click="togglePanel('chat')"><SiteIcon name="chat" />Chat<span v-if="coop && openRequests.length">{{ openRequests.length }}</span></button>
          <button ref="commandButton" type="button" aria-label="Open command input" :aria-expanded="composerOpen" :disabled="!running" @click="toggleComposer"><SiteIcon name="send" />Command</button>
        </template>
        <template v-if="composerOpen" #composer>
          <section class="bc-composer"><header><label for="bc-command">Send a practice command</label><button type="button" aria-label="Close command input" @click="toggleComposer"><SiteIcon name="close" /></button></header>
              <form class="bc-command" @submit.prevent="runCommand">
                <label class="bc-visually-hidden" for="bc-command">Type a command</label>
                <input
                  id="bc-command"
                  ref="commandInput"
                  v-model="command"
                  type="text"
                  autocomplete="off"
                  spellcheck="false"
                  :disabled="!running"
                  :placeholder="coop ? '!link CARD_A CARD_B · !share CARD · !ask CARD' : '!look CARD · !link CARD_A CARD_B'"
                />
                <button type="submit" class="bc-send" aria-label="Send command" :disabled="!running"><SiteIcon name="send" /></button>
              </form>
          </section>
        </template>
        <template #panel>
          <div v-if="panel === 'suspects'">          <!-- Suspects -->
          <section class="bc-suspects" aria-labelledby="bc-suspects-title">
            <h2 id="bc-suspects-title" class="bc-section-title">Suspects <small>Chat’s pick</small></h2>
            <ul>
              <li
                v-for="suspect in def.suspects"
                :key="suspect.id"
                class="bc-suspect"
                :class="{ 'is-cleared': cleared.has(suspect.id), 'is-named': board.verdict === suspect.id }"
              >
                <div class="bc-suspect-face"><SuspectPortrait :kind="suspect.portrait" :cleared="cleared.has(suspect.id)" /></div>
                <div class="bc-suspect-body">
                  <h3>{{ suspect.name }} <code>{{ suspect.id }}</code></h3>
                  <p class="bc-suspect-role">{{ suspect.role }}</p>
                  <p class="bc-suspect-quote" :title="suspect.statement">“{{ suspect.statement }}”</p>
                  <div class="bc-poll" :aria-label="`Chat: ${verdictPoll[suspect.id] ?? 0} percent`" role="img">
                    <span :style="{ width: `${verdictPoll[suspect.id] ?? 0}%` }"></span>
                  </div>
                  <p class="bc-poll-label">
                    <span>Chat {{ verdictPoll[suspect.id] ?? 0 }}%</span>
                    <span v-if="cleared.has(suspect.id)" class="bc-cleared">Cleared</span>
                  </p>
                </div>
                <div v-if="confirmAccuse === suspect.id" class="bc-confirm">
                  <p>Accuse {{ suspect.name }}?</p>
                  <button type="button" class="gs-btn gs-btn--gold" @click="accuseNow(suspect.id)">Accuse</button>
                  <button type="button" class="gs-btn gs-btn--ghost" @click="confirmAccuse = null">Not yet</button>
                </div>
                <button
                  v-else
                  type="button"
                  class="bc-accuse"
                  :class="{ 'is-ready': proofState.complete && !cleared.has(suspect.id) }"
                  :aria-disabled="!proofState.complete || !running"
                  @click="askAccuse(suspect.id)"
                >
                  <SiteIcon :name="proofState.complete ? 'scales' : 'lock'" />
                  {{ proofState.complete ? "Accuse" : `Proof ${proofState.done}/${proofState.needed}` }}
                </button>
              </li>
            </ul>
          </section>

</div>
          <div v-else-if="panel === 'theories'">            <!-- Theories -->
            <section class="bc-theories" aria-labelledby="bc-theories-title">
              <h2 id="bc-theories-title" class="bc-section-title">Theories <small>Break the lies with a card</small></h2>
              <ul>
                <li
                  v-for="claim in raisedClaims"
                  :key="claim.id"
                  class="bc-claim"
                  :class="{
                    'is-broken': board.broken.includes(claim.id),
                    'is-key': claim.required,
                    'is-active': challengeFor === claim.id,
                  }"
                >
                  <p class="bc-claim-head">
                    <span>{{ sourceLabel(claim) }}</span>
                    <code>{{ claim.id }}</code>
                    <span v-if="claim.required && !board.broken.includes(claim.id)" class="bc-key">Key lie</span>
                  </p>
                  <p class="bc-claim-text">“{{ claim.text }}”</p>
                  <div class="bc-belief" role="img" :aria-label="`Chat believes it: ${beliefOf(claim)} percent`">
                    <span :style="{ width: `${beliefOf(claim)}%` }"></span>
                  </div>
                  <div class="bc-claim-foot">
                    <span class="bc-belief-label">Chat believes it: {{ beliefOf(claim) }}%</span>
                    <span v-if="board.broken.includes(claim.id)" class="bc-stamp">Broken</span>
                    <button
                      v-else
                      type="button"
                      class="bc-challenge"
                      :aria-pressed="challengeFor === claim.id"
                      :disabled="!running"
                      @click="startChallenge(claim.id)"
                    >
                      {{ challengeFor === claim.id ? "Cancel" : "Challenge" }}
                    </button>
                  </div>
                </li>
              </ul>
            </section></div>
          <div v-else>          <!-- Chat and Station B -->
          <aside class="bc-side" aria-label="Chat and partner">
            <section v-if="coop && partner" class="bc-partner" aria-labelledby="bc-partner-title">
              <div class="bc-partner-head">
                <div class="bc-partner-face"><SuspectPortrait kind="scarf" /></div>
                <div>
                  <h2 id="bc-partner-title">{{ partner.name }}</h2>
                  <p>{{ partner.station }} · scripted partner · {{ board.partnerFound.length }} of {{ rowB.length }} files found</p>
                </div>
              </div>
              <ul v-if="openRequests.length" class="bc-requests">
                <li v-for="request in openRequests" :key="request.card" class="bc-request">
                  <p class="bc-request-head">
                    <SiteIcon name="send" /> {{ partner.name }} needs your
                    <strong>{{ board.seen.includes(request.card) ? titleOf(request.card) : cardOf(request.card)?.back }}</strong>
                    card
                    <span v-if="requestLeft(request.at) > 0" class="bc-request-clock" title="Answer in time for a quick hand-off">
                      {{ requestLeft(request.at) }}s
                    </span>
                  </p>
                  <button
                    type="button"
                    class="gs-btn gs-btn--gold bc-request-btn"
                    :disabled="!board.seen.includes(request.card) || !running"
                    @click="sendToPartner(request.card)"
                  >
                    {{ board.seen.includes(request.card) ? `Send ${titleOf(request.card)}` : `Turn “${cardOf(request.card)?.back}” first` }}
                  </button>
                </li>
              </ul>
              <p v-else class="bc-partner-note">
                Received {{ received }} of {{ rowB.length }} harbour cards. Press a Station B card to ask for it.
              </p>
            </section>

            <section class="bc-chat" aria-labelledby="bc-chat-title">
              <div class="bc-chat-head">
                <h2 id="bc-chat-title">Chat</h2>
                <span class="bc-chip">Scripted practice chat</span>
              </div>
              <ol ref="feedEl" class="bc-feed" @scroll.passive="onFeedScroll">
                <li v-for="item in feed" :key="item.id" :class="`is-${item.kind}`">
                  <template v-if="item.kind === 'chat'">
                    <span class="bc-who" :data-tone="item.who === 'you' ? 'you' : item.tone">
                      <span v-if="item.station === 'B'" class="bc-b-tag">B</span>{{ item.who === "you" ? "You" : item.who }}
                    </span>
                    <span :class="{ 'bc-cmd': item.command }">{{ item.text }}</span>
                  </template>
                  <template v-else-if="item.kind === 'partner'">
                    <span class="bc-partner-tag">{{ partner?.name ?? "Station B" }}</span>
                    <span>{{ item.text }}</span>
                  </template>
                  <template v-else-if="item.kind === 'system'">
                    <span class="bc-sys" :data-tone="item.tone">{{ item.text }}</span>
                    <b v-if="item.points" class="bc-sys-points" :class="{ 'is-bad': item.points < 0 }">{{ signed(item.points) }}</b>
                  </template>
                  <div v-else class="bc-hunch" :data-status="item.status">
                    <p>
                      <span class="bc-who" :data-tone="item.tone">{{ item.who }}</span> has a hunch:
                      <span class="bc-cmd">!link {{ item.a }} {{ item.b }}</span>
                    </p>
                    <button v-if="item.status === 'open'" type="button" class="bc-try" :disabled="!running" @click="tryHunch(item)">
                      <SiteIcon name="link" /> Try it
                    </button>
                    <span v-else class="bc-hunch-result">
                      {{ item.status === "held" ? "It held. +100 for chat" : item.status === "missed" ? "It did not hold" : "Already linked" }}
                    </span>
                  </div>
                </li>
              </ol>

            </section>
          </aside></div>
        </template>
        <template #notifications>
          <GameNotification :entry="foundNotice"><template v-if="foundNotice" #art><CardArt :kind="foundNotice.art" /></template></GameNotification>
          <GameNotification v-if="panel !== 'chat' && !paused" :entry="crewNotice" kind="crew" />
        </template>
      </GameWorkspace>

      <!-- Reveal -->
      <section v-else-if="phase === 'reveal'" class="bc-reveal" aria-labelledby="bc-title">
        <div class="bc-reveal-scene" aria-hidden="true">
          <BoardScene :kind="sceneKind" :wreck="sceneKind === 'lighthouse'" />
        </div>
        <div class="bc-reveal-body">
          <p class="gs-eyebrow">Case closed · the reveal</p>
          <h1 id="bc-title" class="gs-h1">{{ def.reveal.title }}</h1>
          <ol class="bc-beats">
            <li v-for="(beat, index) in beatsShown" :key="index" class="bc-beat">
              <span class="bc-beat-time">{{ beat.time }}</span>
              <p>{{ beat.text }}</p>
              <span class="bc-beat-cards">
                <span v-for="id in beat.cards" :key="id" class="bc-mini" :title="titleOf(id)">
                  <CardArt :kind="cardOf(id)?.art ?? 'clasp'" />
                </span>
              </span>
            </li>
          </ol>
          <Transition name="bc-pop">
            <p v-if="twistShown" class="bc-twist">{{ def.reveal.twist }}</p>
          </Transition>
          <div class="bc-reveal-actions">
            <button v-if="!twistShown" type="button" class="gs-btn gs-btn--ghost" @click="showAllBeats">Show it all</button>
            <button v-else type="button" class="gs-btn gs-btn--gold gs-btn--lg" @click="goReport">See your report</button>
          </div>
        </div>
      </section>

      <!-- Report -->
      <section v-else class="bc-report" aria-labelledby="bc-title">
        <div class="bc-report-card gs-card">
          <p class="gs-eyebrow">{{ def.title }} · report</p>
          <h1 id="bc-title" class="gs-h1">{{ score.rating }}</h1>
          <div class="bc-seals" role="img" :aria-label="`${score.seals} of 3 seals`">
            <span v-for="n in 3" :key="n" class="bc-seal" :class="{ 'is-on': n <= score.seals }" :style="{ '--i': n }">
              <SiteIcon name="check" />
            </span>
          </div>
          <p class="bc-total"><strong>{{ formatScore(shownTotal.value) }}</strong> points</p>
          <ul class="bc-lines">
            <li v-for="line in score.lines" :key="line.label" :class="{ 'is-bad': line.points < 0 }">
              <span>{{ line.label }}</span>
              <b>{{ signed(line.points) }}</b>
            </li>
          </ul>
          <div class="bc-report-grid">
            <div class="bc-report-box">
              <h2 class="gs-h3">Chat’s crew</h2>
              <ol v-if="crewRanking.length" class="bc-crew">
                <li v-for="(member, index) in crewRanking" :key="member.id">
                  <span class="bc-who" :data-tone="member.tone">{{ member.id }}</span>
                  <span v-if="index === 0" class="bc-mvp">MVP</span>
                  <span class="gs-muted">{{ member.picks }} picks · {{ member.hunches }} hunches</span>
                </li>
              </ol>
              <p v-else class="gs-muted">No individual crew credit this time.</p>
              <p class="gs-muted">Cards chat turned: {{ board.chatPicks }} · hunches that held: {{ board.hunchHits }} · hints: {{ hintsUsed }}</p>
            </div>
            <div v-if="partner" class="bc-report-box">
              <h2 class="gs-h3">With {{ partner.name }}</h2>
              <p class="gs-muted">
                Cards from Station B: {{ received }} of {{ rowB.length }} · requests answered after a prompt:
                {{ board.requests.filter((entry) => entry.answered !== null).length }} of {{ partner.requests.length }} ·
                cards you sent: {{ board.shared.length }}
              </p>
            </div>
          </div>
          <div class="bc-report-actions">
            <button type="button" class="gs-btn gs-btn--gold gs-btn--lg" @click="playAgain"><SiteIcon name="restart" /> Play again</button>
            <a class="gs-btn gs-btn--ghost" href="/play" @click="playUi('back')">Choose another case</a>
            <a class="gs-btn gs-btn--ghost" href="/dashboard" @click="playUi('back')">Main menu</a>
          </div>
        </div>
      </section>
      <EvidenceDialog v-if="inspected" :title="inspected.title" :code="inspected.id" :text="inspected.text" :discovered="newDiscovery" action="Use for a deduction" @close="inspectId = null" @action="pinInspected">
        <template #art><CardArt :kind="inspected.art" /></template>
        <template #footer><button v-if="partner && inspected.station === 'A'" type="button" :disabled="!running || board.shared.includes(inspected.id)" @click="shareInspected">{{ board.shared.includes(inspected.id) ? 'Already sent' : 'Send to ' + partner.name }}</button></template>
      </EvidenceDialog>
    </div>
  </GameShell>
</template>
