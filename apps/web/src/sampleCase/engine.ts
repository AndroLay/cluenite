// Local rules for the sample case. Nothing here reaches the server: the state lives in the page, and the result
// codes mirror the live ones only so the feedback reads the same.
//
// The case has two halves. The search is a hidden-object round: click an object in the room, or call a grid cell
// from chat (!look D3), to find it. Quick finds build a combo; clicking at random costs points and, if it keeps up,
// steadies the hand for two seconds. Six of the twelve objects are clues that put records on the board. The
// analysis uses the live engine's grammar: !link, !order, !challenge, !hint, and !solve.
//
// Community and co-op: a find made by following a viewer's grid call counts as a crew find. In co-op mode the hall
// desk belongs to Station B, a scripted partner station. Its team finds those objects and shares their records, and
// it asks this station for records in return (!share). The key deduction needs records from both stations.

import {
  CLAIMS,
  CLUES,
  CULPRIT,
  EVENTS,
  EVIDENCE,
  FIND_ITEMS,
  GRID_CELL_H,
  GRID_CELL_W,
  GRID_LETTERS,
  GRID_ROWS,
  HINTS,
  LINKS,
  PENALTY,
  POINTS,
  RATINGS,
  SUSPECTS,
  TIMELINE_DEAL,
  TIMELINE_ORDER,
  TIMELINE_RESULT,
  cellAt,
  evidenceById,
  suspectById,
  type ClaimId,
  type ClueId,
  type EventId,
  type EvidenceId,
  type FindId,
  type FindItem,
  type LinkId,
  type SuspectId,
} from "./manuscript";

export type CasePhase = "opening" | "investigating" | "solved";
/** Solo play, or co-op with a scripted partner station that searches the hall desk. */
export type CaseMode = "solo" | "coop";

/** Objects at the hall desk. In co-op play they belong to Station B, and only its team can find them. */
export const PARTNER_ITEMS: readonly FindId[] = ["REGISTER", "GUESTBOOK"];

/** A record that Station B asked this station for. */
export interface PartnerRequest {
  id: string;
  wants: EvidenceId;
  askedAt: number;
  answeredAt: number | null;
}
export type ClaimStatus = "open" | "contradicted";
export type ResultCode = "ACCEPTED_NEW" | "ACCEPTED_ALREADY_KNOWN" | "INVALID" | "NOT_AVAILABLE";

export interface CaseState {
  phase: CasePhase;
  mode: CaseMode;
  /** Finds made by following a viewer's grid call. */
  crewFinds: number;
  /** Co-op: objects that Station B found and shared, the records sent to it, and what it asked for. */
  partnerFound: FindId[];
  shared: EvidenceId[];
  requests: PartnerRequest[];
  // Search
  found: FindId[];
  assisted: number;
  misclicks: number;
  missTimes: number[];
  steadyUntil: number;
  combo: number;
  bestCombo: number;
  comboPoints: number;
  lastFindAt: number | null;
  searchHints: number;
  searchHintReadyAt: number;
  searchDoneAt: number | null;
  timeBonus: number;
  // Analysis
  inspected: ClueId[];
  evidence: EvidenceId[];
  links: LinkId[];
  /** The player's working order. Moving cards changes it; !order checks it. */
  timeline: EventId[];
  timelineSolved: boolean;
  /** Claims chat (or a suspect) has put on the board, in the order they appeared. */
  raised: ClaimId[];
  claims: Record<ClaimId, ClaimStatus>;
  hintsUsed: number;
  wrongLinks: number;
  wrongOrders: number;
  weakChallenges: number;
  wrongVerdicts: number;
  accused: SuspectId[];
  verdict: SuspectId | null;
  startedAt: number | null;
  solvedAt: number | null;
}

export type CaseCue =
  | {
      kind: "found";
      item: FindId;
      combo: number;
      clue: ClueId | null;
      released: EvidenceId[];
      raised: ClaimId[];
      searchDone: boolean;
      bonus: number;
      /** True when Station B found it and shared it. */
      partner: boolean;
    }
  | { kind: "shared"; evidence: EvidenceId; request: string | null; quick: boolean }
  | { kind: "partner-desk"; item: FindId }
  | { kind: "misclick"; x: number; y: number; steady: boolean }
  | { kind: "search-hint"; item: FindId }
  | { kind: "link"; link: LinkId }
  | { kind: "miss" }
  | { kind: "timeline" }
  | { kind: "contradiction"; claim: ClaimId; clears: SuspectId | null }
  | { kind: "hint"; level: number }
  | { kind: "accused-wrong"; suspect: SuspectId }
  | { kind: "solved" };

export interface CaseResult {
  code: ResultCode;
  message: string;
  cue: CaseCue | null;
}

const MAX_COMMAND_LENGTH = 120;
const MAX_COMMAND_TOKENS = 8;
const HIT_PADDING = 8;

const SUSPECT_ALIASES: Record<string, SuspectId> = {
  CLERK: "CLERK",
  ADA: "CLERK",
  WREN: "CLERK",
  GARDENER: "GARDENER",
  TOMAS: "GARDENER",
  REED: "GARDENER",
  GUEST: "GUEST",
  CELESTE: "GUEST",
  VARGA: "GUEST",
};

const EVIDENCE_IDS = EVIDENCE.map((item) => item.id);
const CLAIM_IDS = CLAIMS.map((claim) => claim.id);
const EVENT_IDS = EVENTS.map((event) => event.id);
const NAMED_TARGETS = new Set<string>([...CLUES.map((clue) => clue.id), ...FIND_ITEMS.map((item) => item.id)]);

function isEvidence(value: string): value is EvidenceId {
  return (EVIDENCE_IDS as readonly string[]).includes(value);
}
function isClaim(value: string): value is ClaimId {
  return (CLAIM_IDS as readonly string[]).includes(value);
}
function isEvent(value: string): value is EventId {
  return (EVENT_IDS as readonly string[]).includes(value);
}

export function createCase(mode: CaseMode = "solo"): CaseState {
  return {
    phase: "opening",
    mode,
    crewFinds: 0,
    partnerFound: [],
    shared: [],
    requests: [],
    found: [],
    assisted: 0,
    misclicks: 0,
    missTimes: [],
    steadyUntil: 0,
    combo: 0,
    bestCombo: 0,
    comboPoints: 0,
    lastFindAt: null,
    searchHints: 0,
    searchHintReadyAt: 0,
    searchDoneAt: null,
    timeBonus: 0,
    inspected: [],
    evidence: [],
    links: [],
    timeline: [...TIMELINE_DEAL],
    timelineSolved: false,
    raised: ["LOCKED"],
    claims: { INTRUDER: "open", RIVAL: "open", LOCKED: "open" },
    hintsUsed: 0,
    wrongLinks: 0,
    wrongOrders: 0,
    weakChallenges: 0,
    wrongVerdicts: 0,
    accused: [],
    verdict: null,
    startedAt: null,
    solvedAt: null,
  };
}

export function startCase(state: CaseState, now: number): void {
  if (state.phase !== "opening") return;
  state.phase = "investigating";
  state.startedAt = now;
}

export function searchDone(state: CaseState): boolean {
  return state.found.length === FIND_ITEMS.length;
}

/** This station's part of the search: every object except, in co-op, Station B's hall desk. */
export function ownSearchDone(state: CaseState): boolean {
  return FIND_ITEMS.every(
    (item) => state.found.includes(item.id) || (state.mode === "coop" && PARTNER_ITEMS.includes(item.id)),
  );
}

export interface ProofStatus {
  link: boolean;
  timeline: boolean;
  claim: boolean;
  complete: boolean;
}

export function proofStatus(state: CaseState): ProofStatus {
  const link = state.links.includes("L_KEY");
  const timeline = state.timelineSolved;
  const claim = state.claims.LOCKED === "contradicted";
  return { link, timeline, claim, complete: link && timeline && claim };
}

/** Events whose records are released, so their card can be placed. */
export function eventAvailable(state: CaseState, id: EventId): boolean {
  const event = EVENTS.find((entry) => entry.id === id);
  return event !== undefined && (event.needs === null || state.evidence.includes(event.needs));
}

function result(code: ResultCode, message: string, cue: CaseCue | null = null): CaseResult {
  return { code, message, cue };
}

function list(ids: readonly string[]): string {
  return ids.join(", ");
}

// ---------------------------------------------------------------------------------------------------------------
// Search

/** The object under a design-space point: the smallest padded hit box that contains it. */
export function itemAt(x: number, y: number): FindItem | null {
  let best: FindItem | null = null;
  let bestArea = Number.POSITIVE_INFINITY;
  for (const item of FIND_ITEMS) {
    const { box } = item;
    const halfW = box.w / 2 + HIT_PADDING;
    const halfH = box.h / 2 + HIT_PADDING;
    if (Math.abs(x - box.x) <= halfW && Math.abs(y - box.y) <= halfH) {
      const area = box.w * box.h;
      if (area < bestArea) {
        best = item;
        bestArea = area;
      }
    }
  }
  return best;
}

export function itemCell(item: FindItem): string {
  return cellAt(item.box.x, item.box.y);
}

function examine(state: CaseState, clueId: ClueId): { released: EvidenceId[]; raised: ClaimId[]; text: string } {
  const clue = CLUES.find((entry) => entry.id === clueId);
  if (!clue || state.inspected.includes(clueId)) return { released: [], raised: [], text: "" };
  state.inspected.push(clueId);
  const released = clue.releases.filter((id) => !state.evidence.includes(id));
  state.evidence.push(...released);
  const raised = CLAIMS.filter((claim) => claim.raisedBy === clueId && !state.raised.includes(claim.id)).map(
    (claim) => claim.id,
  );
  state.raised.push(...raised);
  const records = released.map((id) => evidenceById(id).label).join("; ");
  return { released, raised, text: `${clue.observation}${records ? ` Released: ${records}.` : ""}` };
}

function recordFind(state: CaseState, item: FindItem, now: number, assisted: boolean): CaseResult {
  state.found.push(item.id);
  if (assisted) {
    state.assisted += 1;
    state.combo = 0;
    state.lastFindAt = null;
  } else {
    const quick = state.lastFindAt !== null && now - state.lastFindAt <= POINTS.comboWindowMs;
    state.combo = quick ? state.combo + 1 : 1;
    state.lastFindAt = now;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.comboPoints += POINTS.comboStep * Math.min(Math.max(0, state.combo - 1), POINTS.comboCap);
  }
  const examined = item.clue ? examine(state, item.clue) : { released: [], raised: [], text: item.note };
  const done = searchDone(state);
  if (done) {
    state.searchDoneAt = now;
    const seconds = state.startedAt === null ? 0 : Math.floor((now - state.startedAt) / 1000);
    state.timeBonus = state.assisted > 0 ? 0 : Math.max(0, POINTS.timeBonusMax - POINTS.timeBonusPerSecond * seconds);
  }
  const combo = !assisted && state.combo > 1 ? ` Combo ×${state.combo}.` : "";
  const finish = done
    ? state.assisted > 0
      ? " Search complete."
      : ` Search complete. Time bonus +${state.timeBonus}.`
    : "";
  return result(
    "ACCEPTED_NEW",
    `Found: ${item.label}.${combo} ${examined.text}${finish}`.replace(/\s+/g, " ").trim(),
    {
      kind: "found",
      item: item.id,
      combo: assisted ? 0 : state.combo,
      clue: item.clue,
      released: examined.released,
      raised: examined.raised,
      searchDone: done,
      bonus: done ? state.timeBonus : 0,
      partner: false,
    },
  );
}

function isPartnerItem(state: CaseState, item: FindItem): boolean {
  return state.mode === "coop" && PARTNER_ITEMS.includes(item.id);
}

function partnerDesk(item: FindItem): CaseResult {
  return result(
    "NOT_AVAILABLE",
    `The ${item.label.toLowerCase()} is at the hall desk, which is Station B's. Hale's team is searching it; trade records on the Board.`,
    { kind: "partner-desk", item: item.id },
  );
}

function misclick(state: CaseState, x: number, y: number, now: number): CaseResult {
  state.misclicks += 1;
  state.combo = 0;
  state.lastFindAt = null;
  state.missTimes = [...state.missTimes.filter((time) => now - time <= PENALTY.shakyWindowMs), now];
  const shaky = state.missTimes.length >= PENALTY.shakyCount;
  if (shaky) {
    state.steadyUntil = now + PENALTY.steadyMs;
    state.missTimes = [];
  }
  return result(
    "INVALID",
    shaky ? "Too many wild clicks. Your hand steadies for two seconds." : "Nothing on the list there.",
    { kind: "misclick", x, y, steady: shaky },
  );
}

function searchGate(state: CaseState, now: number): CaseResult | null {
  if (state.phase === "opening") return result("NOT_AVAILABLE", "The case has not started yet.");
  if (state.phase === "solved") return result("NOT_AVAILABLE", "This case is closed. Play again to reopen it.");
  if (searchDone(state)) return result("ACCEPTED_ALREADY_KNOWN", "The search is complete. Everything on the list is found.");
  if (ownSearchDone(state)) {
    return result("ACCEPTED_ALREADY_KNOWN", "Your part of the search is done. The hall desk is Station B's.");
  }
  if (now < state.steadyUntil) return result("NOT_AVAILABLE", "Steady now. Your hand settles in a moment.");
  return null;
}

/** A click or tap in the room, in design units. */
export function findAt(state: CaseState, x: number, y: number, now: number = Date.now()): CaseResult {
  const gate = searchGate(state, now);
  if (gate) return gate;
  const item = itemAt(x, y);
  if (item && state.found.includes(item.id)) return result("ACCEPTED_ALREADY_KNOWN", `Already found: ${item.label}.`);
  if (item && isPartnerItem(state, item)) return partnerDesk(item);
  if (item) return recordFind(state, item, now, false);
  return misclick(state, x, y, now);
}

/** A grid call-out such as "D3", from chat or the keyboard cursor. */
export function findInCell(state: CaseState, cell: string, now: number = Date.now()): CaseResult {
  const gate = searchGate(state, now);
  if (gate) return gate;
  const match = /^([A-Z])([0-9]+)$/.exec(cell);
  const col = match ? GRID_LETTERS.indexOf(match[1] ?? "") : -1;
  const row = match ? Number(match[2]) - 1 : -1;
  if (col < 0 || row < 0 || row >= GRID_ROWS) {
    return result("INVALID", `No cell called ${cell}. Cells run from A1 to ${GRID_LETTERS.at(-1) ?? "J"}${GRID_ROWS}.`);
  }
  const waiting = FIND_ITEMS.filter((entry) => !state.found.includes(entry.id) && itemCell(entry) === cell);
  const item = waiting.find((entry) => !isPartnerItem(state, entry));
  if (item) return recordFind(state, item, now, false);
  const desk = waiting[0];
  if (desk) return partnerDesk(desk);
  return misclick(state, (col + 0.5) * GRID_CELL_W, (row + 0.5) * GRID_CELL_H, now);
}

/** A viewer's grid call that the streamer followed. A find through it counts as a crew find. */
export function followCall(state: CaseState, cell: string, now: number = Date.now()): CaseResult {
  const outcome = findInCell(state, cell, now);
  if (outcome.cue?.kind === "found") state.crewFinds += 1;
  return outcome;
}

/** Co-op: Station B found one of its hall-desk objects and shares what it shows. */
export function partnerFind(state: CaseState, id: FindId, now: number = Date.now()): CaseResult {
  const item = FIND_ITEMS.find((entry) => entry.id === id);
  if (!item || state.phase !== "investigating" || state.found.includes(id)) {
    return result("ACCEPTED_ALREADY_KNOWN", "Station B has nothing new.");
  }
  state.found.push(id);
  state.partnerFound.push(id);
  const examined = item.clue ? examine(state, item.clue) : { released: [], raised: [], text: item.note };
  const done = searchDone(state);
  if (done) {
    state.searchDoneAt = now;
    const seconds = state.startedAt === null ? 0 : Math.floor((now - state.startedAt) / 1000);
    state.timeBonus = state.assisted > 0 ? 0 : Math.max(0, POINTS.timeBonusMax - POINTS.timeBonusPerSecond * seconds);
  }
  const shared = examined.released.map((entry) => evidenceById(entry).label).join("; ");
  return result(
    "ACCEPTED_NEW",
    `Station B shared the ${item.label.toLowerCase()}.${shared ? ` New on the board: ${shared}.` : ""}${done ? " Search complete." : ""}`,
    {
      kind: "found",
      item: id,
      combo: 0,
      clue: item.clue,
      released: examined.released,
      raised: examined.raised,
      searchDone: done,
      bonus: done ? state.timeBonus : 0,
      partner: true,
    },
  );
}

/** Co-op: Station B asks for one of this station's records. */
export function openRequest(state: CaseState, id: string, wants: EvidenceId, now: number = Date.now()): void {
  if (state.mode !== "coop" || state.requests.some((entry) => entry.id === id)) return;
  // A record sent before Station B asked for it answers the request at once.
  state.requests.push({ id, wants, askedAt: now, answeredAt: state.shared.includes(wants) ? now : null });
}

/** Co-op: send one record from this board to Station B. */
export function shareRecord(state: CaseState, id: string, now: number = Date.now()): CaseResult {
  if (state.mode !== "coop") return result("NOT_AVAILABLE", "There is no partner station in solo play.");
  if (!isEvidence(id)) return result("INVALID", `No evidence record called ${id}.`);
  if (!state.evidence.includes(id)) return result("NOT_AVAILABLE", `${id} is not on your board yet.`);
  const label = evidenceById(id).label;
  if (state.shared.includes(id)) return result("ACCEPTED_ALREADY_KNOWN", `Station B already has ${label}.`);
  state.shared.push(id);
  const request = state.requests.find((entry) => entry.wants === id && entry.answeredAt === null);
  if (request) {
    request.answeredAt = now;
    const quick = now - request.askedAt <= POINTS.quickHandoffMs;
    return result("ACCEPTED_NEW", `Sent ${label} to Station B, as Hale asked.${quick ? " Quick hand-off." : ""}`, {
      kind: "shared",
      evidence: id,
      request: request.id,
      quick,
    });
  }
  return result("ACCEPTED_NEW", `Sent ${label} to Station B.`, { kind: "shared", evidence: id, request: null, quick: false });
}

/** Assist mode: find a listed object directly. It counts, but it ends the combo and forfeits the time bonus. */
export function findAssisted(state: CaseState, id: FindId, now: number = Date.now()): CaseResult {
  const gate = searchGate(state, now);
  if (gate && gate.code !== "NOT_AVAILABLE") return gate;
  if (state.phase !== "investigating") return result("NOT_AVAILABLE", "The case has not started yet.");
  const item = FIND_ITEMS.find((entry) => entry.id === id);
  if (!item) return result("INVALID", `No object called ${id}.`);
  if (state.found.includes(id)) return result("ACCEPTED_ALREADY_KNOWN", `Already found: ${item.label}.`);
  if (isPartnerItem(state, item)) return partnerDesk(item);
  return recordFind(state, item, now, true);
}

function searchHint(state: CaseState, now: number): CaseResult {
  if (now < state.searchHintReadyAt) {
    const seconds = Math.ceil((state.searchHintReadyAt - now) / 1000);
    return result("NOT_AVAILABLE", `The search hint recharges in ${seconds} s.`);
  }
  // Point at the smallest object still missing: usually the one the room hides best.
  const missing = FIND_ITEMS.filter((item) => !state.found.includes(item.id) && !isPartnerItem(state, item)).sort(
    (a, b) => a.box.w * a.box.h - b.box.w * b.box.h,
  );
  const target = missing[0];
  if (!target) return result("ACCEPTED_ALREADY_KNOWN", "Everything on the list is found.");
  state.searchHints += 1;
  state.searchHintReadyAt = now + PENALTY.searchHintCooldownMs;
  state.combo = 0;
  state.lastFindAt = null;
  return result("ACCEPTED_NEW", `Hint: look where the ring glows, in cell ${itemCell(target)}.`, {
    kind: "search-hint",
    item: target.id,
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Analysis

function link(state: CaseState, a: string, b: string): CaseResult {
  if (!isEvidence(a) || !isEvidence(b)) {
    const unknown = [a, b].filter((id) => !isEvidence(id));
    return result("INVALID", `No evidence record called ${list(unknown)}. Link two released record IDs.`);
  }
  if (a === b) return result("INVALID", "Link two different records.");
  const missing = [a, b].filter((id) => !state.evidence.includes(id));
  if (missing.length > 0) {
    return result("NOT_AVAILABLE", `Not on the board yet: ${list(missing)}. Find more clues first.`);
  }
  const match = LINKS.find((entry) => (entry.a === a && entry.b === b) || (entry.a === b && entry.b === a));
  if (!match) {
    state.wrongLinks += 1;
    return result("INVALID", "Those two records do not explain each other.", { kind: "miss" });
  }
  if (state.links.includes(match.id)) return result("ACCEPTED_ALREADY_KNOWN", `Already linked: ${match.title}.`);
  state.links.push(match.id);
  return result("ACCEPTED_NEW", `Linked. ${match.title}. ${match.text}`, { kind: "link", link: match.id });
}

function order(state: CaseState, items: readonly string[]): CaseResult {
  if (state.timelineSolved) return result("ACCEPTED_ALREADY_KNOWN", "The timeline is already restored.");
  const unknown = items.filter((id) => !isEvent(id));
  if (unknown.length > 0) return result("INVALID", `No event called ${list(unknown)}. Events: ${list(EVENT_IDS)}.`);
  const ids = items as EventId[];
  if (new Set(ids).size !== ids.length || ids.length !== EVENT_IDS.length) {
    return result("INVALID", `Place all ${EVENT_IDS.length} events once each.`);
  }
  const locked = ids.filter((id) => !eventAvailable(state, id));
  if (locked.length > 0) {
    return result("NOT_AVAILABLE", `Find the records for ${list(locked)} before you order the evening.`);
  }
  state.timeline = [...ids];
  const right = ids.filter((id, index) => TIMELINE_ORDER[index] === id).length;
  if (right !== ids.length) {
    state.wrongOrders += 1;
    return result("INVALID", `Not yet. ${right} of ${ids.length} events are in the right place.`, { kind: "miss" });
  }
  state.timelineSolved = true;
  return result("ACCEPTED_NEW", `Timeline restored. ${TIMELINE_RESULT}`, { kind: "timeline" });
}

function theory(state: CaseState, target: string): CaseResult {
  if (!isClaim(target)) return result("INVALID", `No claim called ${target}. Claims: ${list(CLAIM_IDS)}.`);
  const claim = CLAIMS.find((entry) => entry.id === target);
  if (!claim) return result("INVALID", `No claim called ${target}.`);
  if (!state.raised.includes(target)) state.raised.push(target);
  return result(
    "ACCEPTED_ALREADY_KNOWN",
    `On the board: “${claim.claim}” Test it with !challenge ${target} <evidence>.`,
  );
}

function challenge(state: CaseState, target: string, evidence: string): CaseResult {
  if (!isClaim(target)) return result("INVALID", `No claim called ${target}. Claims: ${list(CLAIM_IDS)}.`);
  if (!isEvidence(evidence)) return result("INVALID", `No evidence record called ${evidence}.`);
  const claim = CLAIMS.find((entry) => entry.id === target);
  if (!claim) return result("INVALID", `No claim called ${target}.`);
  if (!state.raised.includes(target)) return result("NOT_AVAILABLE", "Nobody has made that claim yet.");
  if (!state.evidence.includes(evidence)) {
    return result("NOT_AVAILABLE", `${evidence} is not on the board yet. Find more clues first.`);
  }
  if (state.claims[target] === "contradicted") {
    return result("ACCEPTED_ALREADY_KNOWN", `Already contradicted: “${claim.claim}”`);
  }
  if (claim.decisive === evidence) {
    state.claims[target] = "contradicted";
    return result("ACCEPTED_NEW", `Contradicted. ${claim.contradiction}`, {
      kind: "contradiction",
      claim: target,
      clears: claim.clears,
    });
  }
  state.weakChallenges += 1;
  const weak = claim.weak[evidence];
  return result("INVALID", weak ? `Not decisive. ${weak}` : "That record does not touch this claim.", {
    kind: "miss",
  });
}

function hint(state: CaseState, now: number): CaseResult {
  if (!ownSearchDone(state)) return searchHint(state, now);
  const text = HINTS[state.hintsUsed];
  if (text === undefined) return result("NOT_AVAILABLE", "No hints left in this case.");
  state.hintsUsed += 1;
  return result("ACCEPTED_NEW", `Hint ${state.hintsUsed} of ${HINTS.length}: ${text}`, {
    kind: "hint",
    level: state.hintsUsed,
  });
}

export function missingProof(state: CaseState): string[] {
  const proof = proofStatus(state);
  const missing: string[] = [];
  if (!proof.link) missing.push("a deduction that times the theft");
  if (!proof.timeline) missing.push("the evening in order");
  if (!proof.claim) missing.push("a false statement broken");
  return missing;
}

function solve(state: CaseState, target: string, now: number): CaseResult {
  const suspect = SUSPECT_ALIASES[target];
  if (suspect === undefined) {
    return result("INVALID", `No suspect called ${target}. Name ${SUSPECTS.map((entry) => entry.id).join(", ")}.`);
  }
  const missing = missingProof(state);
  if (missing.length > 0) {
    return result("NOT_AVAILABLE", `The proof is not complete. Still needed: ${missing.join("; ")}.`);
  }
  if (suspect !== CULPRIT) {
    state.wrongVerdicts += 1;
    if (!state.accused.includes(suspect)) state.accused.push(suspect);
    return result("INVALID", `Rejected. The proof does not point to ${suspectById(suspect).name}.`, {
      kind: "accused-wrong",
      suspect,
    });
  }
  state.verdict = suspect;
  state.phase = "solved";
  state.solvedAt = now;
  return result("ACCEPTED_NEW", `Case closed. ${suspectById(suspect).name} took the manuscript.`, { kind: "solved" });
}

/** Runs one chat-style command. It changes `state` only when the command is accepted or counts as a miss. */
export function runCommand(state: CaseState, text: string, now: number = Date.now()): CaseResult {
  const trimmed = text.trim();
  if (trimmed.length > MAX_COMMAND_LENGTH) return result("INVALID", "Command is too long.");
  if (!/^[\x20-\x7E]*$/.test(trimmed)) return result("INVALID", "Use plain ASCII text.");
  const body = trimmed.startsWith("!") ? trimmed.slice(1) : trimmed;
  const tokens = body.split(/\s+/).filter((token) => token.length > 0);
  if (tokens.length === 0) return result("INVALID", "Empty command.");
  if (tokens.length > MAX_COMMAND_TOKENS) return result("INVALID", "Too many words in the command.");
  if (state.phase === "opening") return result("NOT_AVAILABLE", "The case has not started yet.");
  if (state.phase === "solved") return result("NOT_AVAILABLE", "This case is closed. Play again to reopen it.");

  const [head = "", ...rawArgs] = tokens;
  const verb = head.toLowerCase();
  const args = rawArgs.map((token) => token.toUpperCase());
  const [first = "", second = ""] = args;
  if (verb === "look" || verb === "inspect" || verb === "find") {
    if (args.length !== 1) return result("INVALID", "Usage: !look <cell>, for example !look D3");
    if (NAMED_TARGETS.has(first)) {
      return result("INVALID", "Point at the room instead: call a grid cell, for example !look D3. Turn on Grid to see the cells.");
    }
    return findInCell(state, first, now);
  }
  if (verb === "link") {
    return args.length === 2 ? link(state, first, second) : result("INVALID", "Usage: !link <evidence> <evidence>");
  }
  if (verb === "order") {
    return args.length >= 2 ? order(state, args) : result("INVALID", "Usage: !order <event> <event> ...");
  }
  if (verb === "theory") {
    return args.length === 1 ? theory(state, first) : result("INVALID", "Usage: !theory <claim>");
  }
  if (verb === "challenge") {
    return args.length === 2
      ? challenge(state, first, second)
      : result("INVALID", "Usage: !challenge <claim> <evidence>");
  }
  if (verb === "hint" || verb === "help") {
    return args.length === 0 ? hint(state, now) : result("INVALID", "Usage: !hint");
  }
  if (verb === "solve") {
    return args.length === 1 ? solve(state, first, now) : result("INVALID", "Usage: !solve <suspect>");
  }
  if (verb === "share") {
    return args.length === 1 ? shareRecord(state, first, now) : result("INVALID", "Usage: !share <evidence>");
  }
  return result("INVALID", "Unknown command. Try !look D3, !link, !order, !challenge, !hint, !share, or !solve.");
}

// ---------------------------------------------------------------------------------------------------------------
// Score

export interface ScoreLine {
  label: string;
  points: number;
}

export interface CaseScore {
  total: number;
  earned: ScoreLine[];
  lost: ScoreLine[];
  seals: number;
  rating: string;
  note: string;
  missed: string[];
}

export function scoreCase(state: CaseState): CaseScore {
  const earned: ScoreLine[] = [];
  const lost: ScoreLine[] = [];
  const partnerFinds = state.partnerFound.length;
  const found = state.found.length - partnerFinds;
  const yours = state.mode === "coop" ? FIND_ITEMS.length - PARTNER_ITEMS.length : FIND_ITEMS.length;
  if (found > 0) earned.push({ label: `Objects found (${found} of ${yours})`, points: found * POINTS.item });
  if (partnerFinds > 0) {
    earned.push({ label: `Found by Station B (${partnerFinds} of ${PARTNER_ITEMS.length})`, points: partnerFinds * POINTS.item });
  }
  if (state.crewFinds > 0) {
    earned.push({ label: `Crew calls followed (${state.crewFinds})`, points: state.crewFinds * POINTS.crewCall });
  }
  const answered = state.requests.filter((entry) => entry.answeredAt !== null);
  if (answered.length > 0) {
    earned.push({ label: `Requests answered for Station B (${answered.length})`, points: answered.length * POINTS.handoff });
  }
  const quick = answered.filter((entry) => (entry.answeredAt ?? 0) - entry.askedAt <= POINTS.quickHandoffMs).length;
  if (quick > 0) earned.push({ label: `Quick hand-offs (${quick})`, points: quick * POINTS.quickHandoff });
  if (state.comboPoints > 0) earned.push({ label: `Combo bonus (best ×${state.bestCombo})`, points: state.comboPoints });
  if (state.timeBonus > 0) earned.push({ label: "Search time bonus", points: state.timeBonus });
  const required = LINKS.filter((entry) => entry.required && state.links.includes(entry.id)).length;
  const optional = LINKS.filter((entry) => !entry.required && state.links.includes(entry.id)).length;
  const optionalTotal = LINKS.filter((entry) => !entry.required).length;
  if (required > 0) earned.push({ label: "Key deduction", points: required * POINTS.requiredLink });
  if (optional > 0) {
    earned.push({ label: `Extra deductions (${optional} of ${optionalTotal})`, points: optional * POINTS.optionalLink });
  }
  if (state.timelineSolved) earned.push({ label: "Timeline restored", points: POINTS.timeline });
  const contradicted = CLAIMS.filter((claim) => state.claims[claim.id] === "contradicted").length;
  if (contradicted > 0) {
    earned.push({ label: `Claims disproven (${contradicted} of ${CLAIMS.length})`, points: contradicted * POINTS.claim });
  }
  if (state.verdict === CULPRIT) earned.push({ label: "Culprit named", points: POINTS.verdict });

  if (state.misclicks > 0) lost.push({ label: `Misclicks (${state.misclicks})`, points: -state.misclicks * PENALTY.misclick });
  if (state.searchHints > 0) {
    lost.push({ label: `Search hints (${state.searchHints})`, points: -state.searchHints * PENALTY.searchHint });
  }
  if (state.hintsUsed > 0) lost.push({ label: `Case hints (${state.hintsUsed})`, points: -state.hintsUsed * PENALTY.hint });
  if (state.wrongLinks > 0) {
    lost.push({
      label: `Links that did not hold (${state.wrongLinks})`,
      points: -Math.min(PENALTY.wrongLinkCap, state.wrongLinks * PENALTY.wrongLink),
    });
  }
  if (state.wrongOrders > 0) {
    lost.push({ label: `Wrong timeline checks (${state.wrongOrders})`, points: -state.wrongOrders * PENALTY.wrongOrder });
  }
  if (state.weakChallenges > 0) {
    lost.push({
      label: `Challenges that missed (${state.weakChallenges})`,
      points: -Math.min(PENALTY.weakChallengeCap, state.weakChallenges * PENALTY.weakChallenge),
    });
  }
  if (state.wrongVerdicts > 0) {
    lost.push({ label: `Wrong accusations (${state.wrongVerdicts})`, points: -state.wrongVerdicts * PENALTY.wrongVerdict });
  }

  const total = Math.max(0, [...earned, ...lost].reduce((sum, line) => sum + line.points, 0));
  const rating = RATINGS.find((entry) => total >= entry.min) ?? RATINGS[RATINGS.length - 1];

  const missed: string[] = [];
  for (const item of FIND_ITEMS) if (!state.found.includes(item.id)) missed.push(`Never found: ${item.label}.`);
  for (const entry of LINKS) if (!state.links.includes(entry.id)) missed.push(`Deduction not made: ${entry.title}.`);
  for (const claim of CLAIMS) {
    if (state.claims[claim.id] !== "contradicted") missed.push(`Claim left standing: “${claim.claim}”`);
  }
  if (state.assisted > 0) missed.push(`Assisted finds (${state.assisted}) forfeited the search time bonus.`);
  for (const request of state.requests) {
    if (request.answeredAt === null) missed.push(`Station B asked for ${evidenceById(request.wants).label} and never got it.`);
  }
  return {
    total,
    earned,
    lost,
    seals: rating?.seals ?? 0,
    rating: rating?.title ?? "Case closed",
    note: rating?.note ?? "",
    missed,
  };
}

/** Suspect states for the scene and the cast list: cleared by a contradiction, or named at the end. */
export type SuspectState = "neutral" | "cleared" | "culprit";

export function suspectStates(state: CaseState): Record<SuspectId, SuspectState> {
  const states: Record<SuspectId, SuspectState> = { GARDENER: "neutral", GUEST: "neutral", CLERK: "neutral" };
  for (const claim of CLAIMS) {
    if (claim.clears && state.claims[claim.id] === "contradicted") states[claim.clears] = "cleared";
  }
  if (state.verdict) states[state.verdict] = "culprit";
  return states;
}
