// Local rules for the board cases. Everything runs in the browser; the result codes mirror the live engine's only
// so the feedback reads the same. Cards are turned by the streamer or by a chat vote; links, challenges, and the
// accusation use the live grammar (!link, !challenge, !solve), and co-op adds !share and !ask.

import type { BoardCaseDef } from "./boardCases";

export type BoardCode = "ACCEPTED_NEW" | "ACCEPTED_ALREADY_KNOWN" | "INVALID" | "NOT_AVAILABLE";

export type BoardCue =
  | { kind: "flip"; card: string; by: "you" | "chat"; raised: string[] }
  | { kind: "link"; link: string }
  | { kind: "miss" }
  | { kind: "broken"; claim: string; clears: string | null }
  | { kind: "wrong-accusation"; suspect: string }
  | { kind: "solved" }
  | { kind: "shared"; card: string; request: string | null; quick: boolean }
  | { kind: "asked"; card: string; ready: boolean };

export interface BoardResult {
  code: BoardCode;
  message: string;
  cue: BoardCue | null;
}

export interface BoardState {
  phase: "opening" | "playing" | "solved";
  /** Cards face up on this station's board: turned here, or received from Station B. */
  seen: string[];
  chatPicks: number;
  yourPicks: number;
  links: string[];
  wrongLinks: number;
  hunchHits: number;
  raised: string[];
  broken: string[];
  weak: number;
  wrongAccusations: number;
  verdict: string | null;
  startedAt: number | null;
  solvedAt: number | null;
  /** Co-op: what Station B has found, what it asked for, what this station sent, and what it asked for. */
  partnerFound: string[];
  requests: { card: string; at: number; answered: number | null }[];
  shared: string[];
  asked: string[];
}

export const QUICK_HANDOFF_MS = 20000;

function result(code: BoardCode, message: string, cue: BoardCue | null = null): BoardResult {
  return { code, message, cue };
}

export function createBoard(def: BoardCaseDef): BoardState {
  return {
    phase: "opening",
    seen: [],
    chatPicks: 0,
    yourPicks: 0,
    links: [],
    wrongLinks: 0,
    hunchHits: 0,
    raised: def.claims.filter((claim) => claim.raisedBy === null).map((claim) => claim.id),
    broken: [],
    weak: 0,
    wrongAccusations: 0,
    verdict: null,
    startedAt: null,
    solvedAt: null,
    partnerFound: [],
    requests: [],
    shared: [],
    asked: [],
  };
}

export function startBoard(state: BoardState, now: number): void {
  if (state.phase !== "opening") return;
  state.phase = "playing";
  state.startedAt = now;
}

const card = (def: BoardCaseDef, id: string) => def.cards.find((entry) => entry.id === id);

export function ownCards(def: BoardCaseDef): string[] {
  return def.cards.filter((entry) => entry.station === "A").map((entry) => entry.id);
}

function reveal(def: BoardCaseDef, state: BoardState, id: string): string[] {
  if (!state.seen.includes(id)) state.seen.push(id);
  const raised = def.claims.filter((claim) => claim.raisedBy === id && !state.raised.includes(claim.id)).map((c) => c.id);
  state.raised.push(...raised);
  return raised;
}

/** Turns one of this station's cards, picked by the streamer or by a chat vote. */
export function flip(def: BoardCaseDef, state: BoardState, id: string, by: "you" | "chat"): BoardResult {
  if (state.phase !== "playing") return result("NOT_AVAILABLE", "The case is not running.");
  const entry = card(def, id);
  if (!entry) return result("INVALID", `No card called ${id}.`);
  if (entry.station !== "A") return result("NOT_AVAILABLE", `${entry.title} is at Station B. Ask for it with !ask ${id}.`);
  if (state.seen.includes(id)) return result("ACCEPTED_ALREADY_KNOWN", `Already on the board: ${entry.title}.`);
  const raised = reveal(def, state, id);
  if (by === "chat") state.chatPicks += 1;
  else state.yourPicks += 1;
  return result("ACCEPTED_NEW", `${by === "chat" ? "Chat turned" : "Turned"}: ${entry.title}. ${entry.text}`, {
    kind: "flip",
    card: id,
    by,
    raised,
  });
}

export function link(def: BoardCaseDef, state: BoardState, a: string, b: string, hunch = false): BoardResult {
  if (state.phase !== "playing") return result("NOT_AVAILABLE", "The case is not running.");
  if (a === b) return result("INVALID", "Link two different cards.");
  const missing = [a, b].filter((id) => !state.seen.includes(id));
  if (missing.length > 0) return result("NOT_AVAILABLE", `Not on your board yet: ${missing.join(", ")}.`);
  const match = def.links.find((entry) => (entry.a === a && entry.b === b) || (entry.a === b && entry.b === a));
  if (!match) {
    state.wrongLinks += 1;
    return result("INVALID", "Those two cards do not explain each other.", { kind: "miss" });
  }
  if (state.links.includes(match.id)) return result("ACCEPTED_ALREADY_KNOWN", `Already linked: ${match.title}.`);
  state.links.push(match.id);
  if (hunch) state.hunchHits += 1;
  return result("ACCEPTED_NEW", `Linked. ${match.title}. ${match.text}`, { kind: "link", link: match.id });
}

export function challenge(def: BoardCaseDef, state: BoardState, claimId: string, cardId: string): BoardResult {
  if (state.phase !== "playing") return result("NOT_AVAILABLE", "The case is not running.");
  const claim = def.claims.find((entry) => entry.id === claimId);
  if (!claim || !state.raised.includes(claimId)) return result("INVALID", `No theory called ${claimId} on the board.`);
  if (!state.seen.includes(cardId)) return result("NOT_AVAILABLE", `${cardId} is not on your board yet.`);
  if (state.broken.includes(claimId)) return result("ACCEPTED_ALREADY_KNOWN", "That theory is already broken.");
  if (claim.decisive !== cardId) {
    state.weak += 1;
    return result("INVALID", "That card does not break this theory.", { kind: "miss" });
  }
  state.broken.push(claimId);
  return result("ACCEPTED_NEW", `Broken. ${claim.contradiction}`, { kind: "broken", claim: claimId, clears: claim.clears });
}

export interface BoardProof {
  needed: number;
  done: number;
  complete: boolean;
  /** Key deductions still missing. They are only counted, so the proof gate never names an answer. */
  linksLeft: number;
  /** Key theories still standing: the lies the proof has to break. */
  claimsLeft: string[];
}

export function proof(def: BoardCaseDef, state: BoardState): BoardProof {
  const linksLeft = def.links.filter((entry) => entry.required && !state.links.includes(entry.id)).length;
  const claimsLeft = def.claims.filter((claim) => claim.required && !state.broken.includes(claim.id)).map((c) => c.id);
  const needed = def.links.filter((entry) => entry.required).length + def.claims.filter((claim) => claim.required).length;
  const left = linksLeft + claimsLeft.length;
  return { needed, done: needed - left, complete: left === 0, linksLeft, claimsLeft };
}

/** "1 key deduction is missing, and “…” still stands." */
export function proofGap(def: BoardCaseDef, check: BoardProof): string {
  const parts: string[] = [];
  if (check.linksLeft > 0) {
    parts.push(check.linksLeft === 1 ? "1 key deduction is missing" : `${check.linksLeft} key deductions are missing`);
  }
  for (const id of check.claimsLeft) {
    const claim = def.claims.find((entry) => entry.id === id);
    if (claim) parts.push(`“${claim.text}” still stands`);
  }
  return parts.join(", and ");
}

export function accuse(def: BoardCaseDef, state: BoardState, suspectId: string, now: number): BoardResult {
  if (state.phase !== "playing") return result("NOT_AVAILABLE", "The case is not running.");
  const suspect = def.suspects.find((entry) => entry.id === suspectId);
  if (!suspect) return result("INVALID", `No suspect called ${suspectId}.`);
  const check = proof(def, state);
  if (!check.complete) return result("NOT_AVAILABLE", `The proof is not complete: ${proofGap(def, check)}.`);
  if (suspectId !== def.culprit) {
    state.wrongAccusations += 1;
    return result("INVALID", `Rejected. The proof does not point to ${suspect.name}.`, { kind: "wrong-accusation", suspect: suspectId });
  }
  state.verdict = suspectId;
  state.phase = "solved";
  state.solvedAt = now;
  return result("ACCEPTED_NEW", `Case closed. ${suspect.name} did it.`, { kind: "solved" });
}

// Co-op ------------------------------------------------------------------------------------------------------------

/** Station B's team turned one of its own cards. It stays at Station B until shared. */
export function partnerFinds(state: BoardState, id: string): void {
  if (!state.partnerFound.includes(id)) state.partnerFound.push(id);
}

/** Station B sends one of its cards to this board. */
export function receive(def: BoardCaseDef, state: BoardState, id: string): string[] {
  partnerFinds(state, id);
  return state.seen.includes(id) ? [] : reveal(def, state, id);
}

export function openRequest(state: BoardState, id: string, now: number): void {
  if (state.shared.includes(id) || state.requests.some((entry) => entry.card === id)) return;
  state.requests.push({ card: id, at: now, answered: null });
}

export function share(def: BoardCaseDef, state: BoardState, id: string, now: number): BoardResult {
  if (def.mode !== "coop") return result("NOT_AVAILABLE", "There is no partner station in this case.");
  if (state.phase !== "playing") return result("NOT_AVAILABLE", "The case is not running.");
  const entry = card(def, id);
  if (!entry || entry.station !== "A") return result("INVALID", `${id} is not one of your cards.`);
  if (!state.seen.includes(id)) return result("NOT_AVAILABLE", `Turn ${entry.title} before you send it.`);
  if (state.shared.includes(id)) return result("ACCEPTED_ALREADY_KNOWN", `Station B already has ${entry.title}.`);
  state.shared.push(id);
  const request = state.requests.find((item) => item.card === id && item.answered === null);
  if (request) request.answered = now;
  const quick = request ? now - request.at <= QUICK_HANDOFF_MS : false;
  return result("ACCEPTED_NEW", `Sent ${entry.title} to Station B.${quick ? " Quick hand-off." : ""}`, {
    kind: "shared",
    card: id,
    request: request ? request.card : null,
    quick,
  });
}

export function ask(def: BoardCaseDef, state: BoardState, id: string): BoardResult {
  if (def.mode !== "coop") return result("NOT_AVAILABLE", "There is no partner station in this case.");
  if (state.phase !== "playing") return result("NOT_AVAILABLE", "The case is not running.");
  const entry = card(def, id);
  if (!entry || entry.station !== "B") return result("INVALID", `${id} is not a Station B card.`);
  if (state.seen.includes(id)) return result("ACCEPTED_ALREADY_KNOWN", `${entry.title} is already on your board.`);
  if (!state.asked.includes(id)) state.asked.push(id);
  const ready = state.partnerFound.includes(id);
  return result("ACCEPTED_NEW", ready ? `Asked Station B for ${entry.title}.` : `Asked Station B to look for ${entry.back.toLowerCase()}.`, {
    kind: "asked",
    card: id,
    ready,
  });
}

// Commands ---------------------------------------------------------------------------------------------------------

export type BoardCommand =
  | { kind: "look"; card: string }
  | { kind: "link"; a: string; b: string }
  | { kind: "challenge"; claim: string; card: string }
  | { kind: "solve"; suspect: string }
  | { kind: "share"; card: string }
  | { kind: "ask"; card: string }
  | { kind: "invalid"; message: string };

/**
 * Reads one command in the live grammar. The page runs the action itself, so a typed command and a click have the
 * same effects (a shared card still gets Station B's answer, a correct !solve still opens the reveal).
 */
export function parseBoardCommand(def: BoardCaseDef, text: string): BoardCommand {
  const [head = "", ...rest] = text.trim().replace(/^!/, "").split(/\s+/).filter(Boolean);
  const verb = head.toLowerCase();
  const args = rest.map((token) => token.toUpperCase());
  const [first = "", second = ""] = args;
  if ((verb === "look" || verb === "inspect") && args.length === 1) return { kind: "look", card: first };
  if (verb === "link" && args.length === 2) return { kind: "link", a: first, b: second };
  if (verb === "challenge" && args.length === 2) return { kind: "challenge", claim: first, card: second };
  if (verb === "solve" && args.length === 1) return { kind: "solve", suspect: first };
  if (def.mode === "coop" && verb === "share" && args.length === 1) return { kind: "share", card: first };
  if (def.mode === "coop" && verb === "ask" && args.length === 1) return { kind: "ask", card: first };
  return {
    kind: "invalid",
    message:
      def.mode === "coop"
        ? "Try !look CARD, !link A B, !challenge THEORY CARD, !share CARD, !ask CARD, or !solve SUSPECT."
        : "Try !look CARD, !link A B, !challenge THEORY CARD, or !solve SUSPECT.",
  };
}

// Score ------------------------------------------------------------------------------------------------------------

export interface BoardScore {
  total: number;
  lines: { label: string; points: number }[];
  seals: number;
  rating: string;
}

export function scoreBoard(def: BoardCaseDef, state: BoardState): BoardScore {
  const lines: { label: string; points: number }[] = [];
  const add = (label: string, points: number): void => {
    if (points !== 0) lines.push({ label, points });
  };
  add(`Cards chat picked (${state.chatPicks})`, state.chatPicks * 150);
  add(`Cards you picked (${state.yourPicks})`, state.yourPicks * 100);
  const required = def.links.filter((entry) => entry.required && state.links.includes(entry.id)).length;
  const optional = def.links.filter((entry) => !entry.required && state.links.includes(entry.id)).length;
  add(`Key deductions (${required})`, required * 500);
  add(`Extra deductions (${optional})`, optional * 250);
  add(`Chat hunches that held (${state.hunchHits})`, state.hunchHits * 100);
  add(`Theories broken (${state.broken.length})`, state.broken.length * 300);
  if (state.verdict === def.culprit) add("Culprit named", 1000);
  const answered = state.requests.filter((entry) => entry.answered !== null);
  add(`Requests answered for Station B (${answered.length})`, answered.length * 200);
  const quick = answered.filter((entry) => (entry.answered ?? 0) - entry.at <= QUICK_HANDOFF_MS).length;
  add(`Quick hand-offs (${quick})`, quick * 100);
  if (state.solvedAt !== null && state.startedAt !== null) {
    const seconds = Math.floor((state.solvedAt - state.startedAt) / 1000);
    add("Time bonus", Math.min(1200, Math.max(0, (def.par - seconds) * 8)));
  }
  add(`Links that did not hold (${state.wrongLinks})`, -Math.min(400, state.wrongLinks * 100));
  add(`Challenges that missed (${state.weak})`, -Math.min(300, state.weak * 100));
  add(`Wrong accusations (${state.wrongAccusations})`, -state.wrongAccusations * 600);
  const total = Math.max(0, lines.reduce((sum, line) => sum + line.points, 0));
  const rating = def.ratings.find((entry) => total >= entry.min) ?? def.ratings[def.ratings.length - 1];
  return { total, lines, seals: rating?.seals ?? 0, rating: rating?.title ?? "Case closed" };
}
