// The scripted community of the sample case: the viewers in chat, the grid cells they call, how strongly chat
// believes each theory, whom chat would accuse, and Station B, the partner station in co-op play. None of it comes
// from Twitch. The page labels every line as scripted sample chat.

import {
  CLAIMS,
  FIND_ITEMS,
  GRID_CELL_H,
  GRID_CELL_W,
  GRID_COLS,
  GRID_LETTERS,
  GRID_ROWS,
  type ClaimId,
  type EvidenceId,
  type FindId,
  type SuspectId,
} from "./manuscript";
import { PARTNER_ITEMS, itemCell, type CaseState } from "./engine";

export type ViewerTone = "gold" | "ember" | "ivory" | "brass" | "rose" | "copper";

export interface Viewer {
  id: string;
  /** How often this viewer's grid calls land on an object that is still hidden, 0..1. */
  eye: number;
  tone: ViewerTone;
}

/** Station A's chat: the viewers watching this stream. */
export const VIEWERS: readonly Viewer[] = [
  { id: "ledger_lou", eye: 0.86, tone: "gold" },
  { id: "tick_tock_tess", eye: 0.78, tone: "ember" },
  { id: "inkwell_ivy", eye: 0.62, tone: "ivory" },
  { id: "marlowe_fan", eye: 0.55, tone: "brass" },
  { id: "velvet_glove", eye: 0.5, tone: "rose" },
  { id: "mudlark", eye: 0.34, tone: "copper" },
];

export function viewerById(id: string): Viewer | undefined {
  return VIEWERS.find((viewer) => viewer.id === id);
}

export interface CrewCall {
  id: number;
  viewer: string;
  cell: string;
  /** Centre of the called cell, in design units. */
  x: number;
  y: number;
  /** True when the cell hid an object this station could still find at the time of the call. */
  hit: boolean;
  at: number;
  expiresAt: number;
}

/** How long a call stays on the stage before chat moves on. */
export const CALL_LIFETIME_MS = 15000;
/** At most this many calls show at once. */
export const MAX_CALLS = 3;

function cellCentre(cell: string): { x: number; y: number } {
  const col = GRID_LETTERS.indexOf(cell.charAt(0));
  const row = Number(cell.slice(1)) - 1;
  return { x: (col + 0.5) * GRID_CELL_W, y: (row + 0.5) * GRID_CELL_H };
}

/** Cells that still hide an object this station can find. */
export function liveCells(state: CaseState): Set<string> {
  const cells = new Set<string>();
  for (const item of FIND_ITEMS) {
    if (state.found.includes(item.id)) continue;
    if (state.mode === "coop" && PARTNER_ITEMS.includes(item.id)) continue;
    cells.add(itemCell(item));
  }
  return cells;
}

/**
 * One viewer calls a grid cell. Sharp-eyed viewers usually call a cell that still hides an object; others call
 * something that only looks promising. Cells that are already called are skipped.
 */
export function makeCall(
  state: CaseState,
  viewer: Viewer,
  taken: ReadonlySet<string>,
  rand: () => number,
  now: number,
  id: number,
): CrewCall | null {
  const live = [...liveCells(state)].filter((cell) => !taken.has(cell));
  if (live.length === 0) return null;
  let cell: string | undefined;
  const sharp = rand() < viewer.eye;
  if (sharp) {
    cell = live[Math.floor(rand() * live.length)];
  } else {
    const all = liveCells(state);
    const decoys: string[] = [];
    for (let row = 1; row <= GRID_ROWS; row += 1) {
      for (let col = 0; col < GRID_COLS; col += 1) {
        const name = `${GRID_LETTERS[col] ?? "A"}${row}`;
        if (!all.has(name) && !taken.has(name)) decoys.push(name);
      }
    }
    cell = decoys[Math.floor(rand() * decoys.length)];
  }
  if (cell === undefined) return null;
  const centre = cellCentre(cell);
  return {
    id,
    viewer: viewer.id,
    cell,
    x: centre.x,
    y: centre.y,
    hit: sharp,
    at: now,
    expiresAt: now + CALL_LIFETIME_MS,
  };
}

/** Lines a viewer says when the streamer follows their call. */
export const CALL_RIGHT: readonly string[] = ["told you!", "eagle eyes, chat", "that's mine, write it down", "EZ"];
export const CALL_WRONG: readonly string[] = ["my bad, wrong cell", "oops. ignore me", "it looked like something!"];

export interface CrewCredit {
  /** Calls that the streamer followed to a find. */
  finds: number;
  /** Calls that pointed at an object the streamer then found alone. */
  spotted: number;
  /** Calls that pointed at nothing. */
  misses: number;
  /** Every call made. */
  calls: number;
}

export function emptyCredits(): Record<string, CrewCredit> {
  const credits: Record<string, CrewCredit> = {};
  for (const viewer of VIEWERS) credits[viewer.id] = { finds: 0, spotted: 0, misses: 0, calls: 0 };
  return credits;
}

export interface CrewRow extends CrewCredit {
  id: string;
  tone: ViewerTone;
  points: number;
}

/** Crew points: a followed find is worth 3, a spotted object 1. */
export function crewBoard(credits: Record<string, CrewCredit>): CrewRow[] {
  return VIEWERS.map((viewer) => {
    const credit = credits[viewer.id] ?? { finds: 0, spotted: 0, misses: 0, calls: 0 };
    return { id: viewer.id, tone: viewer.tone, ...credit, points: credit.finds * 3 + credit.spotted };
  }).sort((a, b) => b.points - a.points || b.finds - a.finds || a.misses - b.misses);
}

// ---------------------------------------------------------------------------------------------------------------
// Polls

/** How much of chat believes each theory while it stands, and after the evidence breaks it. */
const CLAIM_BELIEF: Record<ClaimId, { open: number; broken: number }> = {
  INTRUDER: { open: 58, broken: 6 },
  RIVAL: { open: 47, broken: 9 },
  LOCKED: { open: 71, broken: 4 },
};

/** Share of chat that believes a claim right now. It drifts a little while the claim stands. */
export function claimBelief(state: CaseState, id: ClaimId, now: number): number {
  const base = CLAIM_BELIEF[id];
  if (state.claims[id] === "contradicted") return base.broken;
  const index = CLAIMS.findIndex((claim) => claim.id === id);
  const drift = Math.round(Math.sin(now / 4100 + index * 1.7) * 4);
  return Math.max(1, Math.min(99, base.open + drift));
}

/** Whom chat would accuse, in percent. It starts with first impressions and moves with the evidence. */
export function chatPick(state: CaseState): Record<SuspectId, number> {
  const has = (id: EvidenceId): boolean => state.evidence.includes(id);
  let gardener = 30;
  let guest = 34;
  let clerk = 12;
  if (has("MUD_PRINT")) gardener += 16;
  if (has("OXBLOOD_NOTE")) guest += 14;
  if (has("KEY_OUT")) clerk += 10;
  if (state.links.includes("L_KEY")) clerk += 14;
  if (state.links.includes("L_PAPER")) clerk += 8;
  if (state.claims.INTRUDER === "contradicted") gardener -= 38;
  if (state.claims.RIVAL === "contradicted") guest -= 40;
  if (state.claims.LOCKED === "contradicted") clerk += 30;
  if (state.timelineSolved) clerk += 6;
  const weights = { GARDENER: Math.max(3, gardener), GUEST: Math.max(3, guest), CLERK: Math.max(3, clerk) };
  const total = weights.GARDENER + weights.GUEST + weights.CLERK;
  const gardenerShare = Math.round((weights.GARDENER / total) * 100);
  const guestShare = Math.round((weights.GUEST / total) * 100);
  return { GARDENER: gardenerShare, GUEST: guestShare, CLERK: 100 - gardenerShare - guestShare };
}

// ---------------------------------------------------------------------------------------------------------------
// Station B

export const PARTNER_NAME = "Inspector Hale";
export const PARTNER_STATION = "Station B · hall desk";

/** What Station B asks this station for, and what it says when it gets it. */
export const PARTNER_REQUESTS: readonly {
  id: string;
  wants: EvidenceId;
  ask: string;
  nudge: string;
  reply: string;
  /** Object Station B can share once it has the record. */
  unlocks: FindId | null;
}[] = [
  {
    id: "CLOCK",
    wants: "CLOCK_STOP",
    ask: "Our key register has a gap I can't place. What time did your mantel clock stop? Send me the clock record.",
    nudge: "Still need that clock time, partner. The register makes no sense without it.",
    reply: "20:52. Then the study key was out when your box opened. Sending the register now.",
    unlocks: "REGISTER",
  },
  {
    id: "INK",
    wants: "OXBLOOD_NOTE",
    ask: "One more: what ink is your note written in? The pen at our desk writes oxblood.",
    nudge: "Any word on that note's ink?",
    reply: "Oxblood, same as our desk pen. Anyone at the hall desk could have written that note.",
    unlocks: null,
  },
];

export const PARTNER_LINES = {
  hello: "Station B here. We have the hall desk: the key register and the guest book. We'll trade records with you.",
  guestbook: "Guest book done. Celeste signed in for dinner, and her pen was left at our desk. Sharing both.",
  extra: "Thanks, that's on our board too.",
  solved: "Good work, partner. Two rooms, one proof.",
} as const;

/** Station B's own chat, shown in the shared feed with a B tag. */
export const PARTNER_CHAT: readonly (readonly [string, string])[] = [
  ["hale_watch", "station A, we see your clock from here lol"],
  ["night_porter", "the register is all initials, can't read half of it"],
  ["foggy_bottom", "trade them the guest book, hale"],
];
