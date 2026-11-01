import {
  MAX_COMMAND_LENGTH,
  MAX_COMMAND_TOKENS,
  type ClueStatus,
  type CommandResult,
  type ResultCode,
  type ResultReason,
  type RoundSnapshot,
  type Stage,
} from "@cluenite/contracts";
import {
  connectionKey,
  validateCaseDefinition,
  type CaseDefinition,
  type ClueNodeDef,
  type EvidenceDef,
} from "./caseDefinition.js";

export type RoundSource = "simulation" | "live";

// Immutable round state. Every transition returns a new object so the server can
// compare revisions and so tests can replay command sequences deterministically.
export interface RoundState {
  readonly sessionId: string;
  readonly source: RoundSource;
  readonly def: CaseDefinition;
  readonly contentErrors: readonly string[];
  readonly inspected: ReadonlySet<string>;
  readonly unlocked: ReadonlySet<string>;
  readonly recorded: readonly string[];
  readonly paused: boolean;
  readonly solvedBy: string | null;
  readonly clock: RoundClock;
  readonly revision: number;
}

export interface Transition {
  readonly state: RoundState;
  readonly result: CommandResult;
}

// Informative elapsed timer. It has no deadline and never ends the round. It starts at the
// first accepted investigation step, banks time while paused, and stops when the round is
// solved. The server passes its own clock in, so the engine stays free of Date and random.
export interface RoundClock {
  readonly started: boolean;
  readonly accumulatedMs: number;
  readonly runningSince: number | null;
}

const IDLE_CLOCK: RoundClock = { started: false, accumulatedMs: 0, runningSince: null };

function elapsedAt(clock: RoundClock, nowMs: number): number {
  const running = clock.runningSince === null ? 0 : Math.max(0, nowMs - clock.runningSince);
  return clock.accumulatedMs + running;
}

function pauseClock(clock: RoundClock, nowMs: number): RoundClock {
  if (clock.runningSince === null) return clock;
  return { started: true, accumulatedMs: elapsedAt(clock, nowMs), runningSince: null };
}

function runClock(clock: RoundClock, nowMs: number): RoundClock {
  if (!clock.started) return { started: true, accumulatedMs: 0, runningSince: nowMs };
  if (clock.runningSince !== null) return clock;
  return { ...clock, runningSince: nowMs };
}

export function createRound(
  def: CaseDefinition,
  options: { sessionId: string; source: RoundSource; revision?: number },
): RoundState {
  return {
    sessionId: options.sessionId,
    source: options.source,
    def,
    contentErrors: validateCaseDefinition(def),
    inspected: new Set<string>(),
    unlocked: new Set<string>(),
    recorded: [],
    paused: false,
    solvedBy: null,
    clock: IDLE_CLOCK,
    revision: options.revision ?? 0,
  };
}

type ParsedCommand =
  | { ok: true; verb: "inspect" | "solve"; target: string }
  | { ok: true; verb: "link"; a: string; b: string }
  | { ok: false; reason: ResultReason; message: string };

// Accepts `!inspect CAM`, `!look CAM`, `!link CAM SCHEDULE`, `!solve ROBOT`. The leading
// `!` is optional so dashboard text input can reuse the same grammar.
export function parseCommand(text: string): ParsedCommand {
  const trimmed = text.trim();
  if (trimmed.length > MAX_COMMAND_LENGTH) {
    return { ok: false, reason: "INPUT_TOO_LONG", message: "Command is too long." };
  }
  if (!/^[\x20-\x7E]*$/.test(trimmed)) {
    return { ok: false, reason: "BAD_SYNTAX", message: "Use plain ASCII text." };
  }
  const body = trimmed.startsWith("!") ? trimmed.slice(1) : trimmed;
  const tokens = body.split(/\s+/).filter((token) => token.length > 0);
  if (tokens.length === 0) {
    return { ok: false, reason: "BAD_SYNTAX", message: "Empty command." };
  }
  if (tokens.length > MAX_COMMAND_TOKENS) {
    return { ok: false, reason: "TOO_MANY_TOKENS", message: "Too many words in the command." };
  }

  const [head = "", ...rest] = tokens;
  const verb = head.toLowerCase();
  const args = rest.map((token) => token.toUpperCase());
  const [first = "", second = ""] = args;
  if (verb === "inspect" || verb === "look") {
    if (args.length !== 1) return usage("!inspect <clue>");
    return { ok: true, verb: "inspect", target: first };
  }
  if (verb === "link") {
    if (args.length !== 2) return usage("!link <clue> <clue>");
    return { ok: true, verb: "link", a: first, b: second };
  }
  if (verb === "solve") {
    if (args.length !== 1) return usage("!solve <verdict>");
    return { ok: true, verb: "solve", target: first };
  }
  return {
    ok: false,
    reason: "UNKNOWN_COMMAND",
    message: "Unknown command. Try !inspect, !link, or !solve.",
  };
}

function usage(form: string): ParsedCommand {
  return { ok: false, reason: "BAD_SYNTAX", message: `Usage: ${form}` };
}

function respond(
  state: RoundState,
  code: ResultCode,
  reason: ResultReason | null,
  message: string,
  missing: readonly string[] = [],
  next: RoundState = state,
): Transition {
  return {
    state: next,
    result: { code, reason, message, missing: [...missing], revision: next.revision },
  };
}

function nodeOwning(def: CaseDefinition, evidenceId: string): ClueNodeDef | undefined {
  return def.clues.find((node) => node.unlocks.includes(evidenceId));
}

// A token names evidence when it is the full ID, an alias prefix (`CAM` for `CAM_R07`),
// or the node that unlocks it. Aliases must resolve to exactly one unlocked item.
function evidenceMatching(def: CaseDefinition, token: string): EvidenceDef[] {
  return def.evidence.filter(
    (item) =>
      item.id === token ||
      item.id.startsWith(`${token}_`) ||
      nodeOwning(def, item.id)?.id === token,
  );
}

type Resolved<T> = { ok: true; value: T } | { ok: false; code: ResultCode; reason: ResultReason; message: string };

function resolveUnlockedEvidence(state: RoundState, token: string): Resolved<string> {
  const { def } = state;
  const node = def.clues.find((clue) => clue.id === token);
  if (node && node.unlocks.length === 0) {
    return {
      ok: false,
      code: "INVALID",
      reason: "NO_CONNECTION",
      message: `${node.id} has no evidence to connect.`,
    };
  }
  const matches = evidenceMatching(def, token);
  if (matches.length === 0) {
    return { ok: false, code: "INVALID", reason: "UNKNOWN_TARGET", message: `Unknown clue: ${token}.` };
  }
  const unlocked = matches.filter((item) => state.unlocked.has(item.id));
  if (unlocked.length === 0) {
    return { ok: false, code: "NOT_AVAILABLE", reason: "NOT_UNLOCKED", message: "Not available yet." };
  }
  if (unlocked.length > 1) {
    return {
      ok: false,
      code: "INVALID",
      reason: "AMBIGUOUS_TARGET",
      message: `${token} matches several clues. Use the full ID.`,
    };
  }
  const [only] = unlocked;
  if (!only) {
    return { ok: false, code: "NOT_AVAILABLE", reason: "NOT_UNLOCKED", message: "Not available yet." };
  }
  return { ok: true, value: only.id };
}

function resolveVerdict(def: CaseDefinition, token: string) {
  return def.verdicts.find((verdict) => verdict.id === token || verdict.aliases.includes(token));
}

function missingProof(state: RoundState): string[] {
  const { def } = state;
  const missing: string[] = [];
  for (const req of def.proof.evidence) {
    if (!state.unlocked.has(req.id) && !missing.includes(req.category)) missing.push(req.category);
  }
  for (const req of def.proof.links) {
    const key = connectionKey(req.a, req.b);
    if (!state.recorded.includes(key) && !missing.includes(req.category)) missing.push(req.category);
  }
  return missing;
}

function applyInspect(state: RoundState, token: string): Transition {
  const { def } = state;
  const node = def.clues.find((clue) => clue.id === token);
  if (node) {
    if (state.inspected.has(node.id)) {
      return respond(state, "ACCEPTED_ALREADY_KNOWN", null, `Already inspected: ${node.id}.`);
    }
    const inspected = new Set<string>(state.inspected);
    inspected.add(node.id);
    const unlocked = new Set<string>(state.unlocked);
    for (const id of node.unlocks) unlocked.add(id);
    const next: RoundState = { ...state, inspected, unlocked, revision: state.revision + 1 };
    return respond(state, "ACCEPTED_NEW", null, node.observation, [], next);
  }

  const matches = evidenceMatching(def, token);
  if (matches.length === 0) {
    return respond(state, "INVALID", "UNKNOWN_TARGET", `Unknown clue: ${token}.`);
  }
  const unlocked = matches.filter((item) => state.unlocked.has(item.id));
  if (unlocked.length === 0) {
    return respond(state, "NOT_AVAILABLE", "NOT_UNLOCKED", "Not available yet.");
  }
  const owners = new Set(unlocked.map((item) => nodeOwning(def, item.id)?.id));
  if (owners.size > 1) {
    return respond(state, "INVALID", "AMBIGUOUS_TARGET", `${token} matches several clues. Use the full ID.`);
  }
  return respond(state, "ACCEPTED_ALREADY_KNOWN", null, `Already inspected: ${token}.`);
}

function applyLink(state: RoundState, tokenA: string, tokenB: string): Transition {
  const a = resolveUnlockedEvidence(state, tokenA);
  if (!a.ok) return respond(state, a.code, a.reason, a.message);
  const b = resolveUnlockedEvidence(state, tokenB);
  if (!b.ok) return respond(state, b.code, b.reason, b.message);
  if (a.value === b.value) {
    return respond(state, "INVALID", "SAME_TARGET", "Pick two different clues.");
  }

  const key = connectionKey(a.value, b.value);
  if (state.recorded.includes(key)) {
    return respond(state, "ACCEPTED_ALREADY_KNOWN", null, "Already linked.");
  }
  const isConnection = state.def.connections.some(
    (link) => connectionKey(link.a, link.b) === key,
  );
  if (!isConnection) {
    return respond(state, "INVALID", "NO_CONNECTION", "These clues do not connect.");
  }

  const next: RoundState = {
    ...state,
    recorded: [...state.recorded, key].sort(),
    revision: state.revision + 1,
  };
  return respond(state, "ACCEPTED_NEW", null, `Linked ${a.value} with ${b.value}.`, [], next);
}

function applySolve(state: RoundState, token: string): Transition {
  const { def } = state;
  const verdict = resolveVerdict(def, token);
  if (!verdict) {
    const options = def.verdicts.map((item) => item.id).join(", ");
    return respond(state, "INVALID", "UNKNOWN_VERDICT", `Unknown verdict. Options: ${options}.`);
  }
  if (state.solvedBy !== null) {
    if (state.solvedBy === verdict.id) {
      return respond(state, "ACCEPTED_ALREADY_KNOWN", null, "Already solved.");
    }
    return respond(state, "NOT_AVAILABLE", "ROUND_RESOLVED", "This round is already solved.");
  }
  if (def.falseVerdicts.includes(verdict.id)) {
    return respond(state, "INVALID", "VERDICT_NOT_SUPPORTED", "The evidence does not support that conclusion.");
  }
  if (!def.acceptedVerdicts.includes(verdict.id)) {
    return respond(state, "CONTENT_ERROR", null, "Verdict is not configured for this case.");
  }

  const missing = missingProof(state);
  if (missing.length > 0) {
    return respond(
      state,
      "INVALID",
      "VERDICT_UNPROVEN",
      `Not proven yet. Missing: ${missing.join(", ")}.`,
      missing,
    );
  }
  const next: RoundState = { ...state, solvedBy: verdict.id, revision: state.revision + 1 };
  return respond(state, "ACCEPTED_NEW", null, "Verified. The round is solved.", [], next);
}

// Single entry point for viewer and host commands. Only ACCEPTED_NEW changes the
// revision; every other outcome returns the same state object.
export function applyCommand(state: RoundState, text: string, nowMs: number): Transition {
  const transition = decideCommand(state, text);
  if (transition.result.code !== "ACCEPTED_NEW") return transition;
  // The first accepted step starts the clock. Solving stops it for good.
  const clock =
    transition.state.solvedBy !== null && state.solvedBy === null
      ? pauseClock(state.clock, nowMs)
      : runClock(state.clock, nowMs);
  return { state: { ...transition.state, clock }, result: transition.result };
}

function decideCommand(state: RoundState, text: string): Transition {
  if (state.contentErrors.length > 0) {
    return respond(state, "CONTENT_ERROR", null, "Case content is invalid. The round cannot run.");
  }
  if (state.paused) {
    return respond(state, "PAUSED", null, "The round is paused.");
  }

  const parsed = parseCommand(text);
  if (!parsed.ok) {
    return respond(state, "INVALID", parsed.reason, parsed.message);
  }

  if (state.solvedBy !== null) {
    if (parsed.verb === "solve") return applySolve(state, parsed.target);
    return respond(state, "NOT_AVAILABLE", "ROUND_RESOLVED", "This round is already solved.");
  }

  switch (parsed.verb) {
    case "inspect":
      return applyInspect(state, parsed.target);
    case "link":
      return applyLink(state, parsed.a, parsed.b);
    case "solve":
      return applySolve(state, parsed.target);
  }
}

// Host control. Pause and resume bump the revision so every overlay re-renders
// the paused state; chat commands while paused are rejected without a transition.
export function setPaused(state: RoundState, paused: boolean, nowMs: number): RoundState {
  if (state.paused === paused) return state;
  // Pausing banks the elapsed time. Resuming runs the clock again only if it has started
  // and the round is still unsolved.
  const clock = paused
    ? pauseClock(state.clock, nowMs)
    : state.solvedBy === null && state.clock.started
      ? runClock(state.clock, nowMs)
      : state.clock;
  return { ...state, paused, clock, revision: state.revision + 1 };
}

export function restartRound(state: RoundState): RoundState {
  return createRound(state.def, {
    sessionId: state.sessionId,
    source: state.source,
    revision: state.revision + 1,
  });
}

function deriveStage(state: RoundState): Stage {
  if (state.solvedBy !== null) return "reveal";
  if (state.recorded.length > 0) return "challenge";
  if (state.unlocked.size > 0) return "connect";
  return "observe";
}

function clueStatus(state: RoundState, node: ClueNodeDef): ClueStatus {
  if (!state.inspected.has(node.id)) return "locked";
  const linked = node.unlocks.some((id) =>
    state.recorded.some((key) => key.split("|").includes(id)),
  );
  return linked ? "linked" : "unlocked";
}

// Viewer-safe projection. Fields are copied explicitly so answer and proof data never
// leak through a spread of the case definition.
export function toRoundSnapshot(state: RoundState, nowMs: number): RoundSnapshot {
  const { def } = state;
  return {
    protocolVersion: 1,
    revision: state.revision,
    sessionId: state.sessionId,
    source: state.source,
    caseId: def.id,
    title: def.title,
    premise: def.premise,
    question: def.question,
    stage: deriveStage(state),
    paused: state.paused,
    timer: {
      elapsedMs: Math.floor(elapsedAt(state.clock, nowMs)),
      running: state.clock.runningSince !== null,
    },
    clues: def.clues.map((node) => ({
      id: node.id,
      label: node.label,
      teaser: node.teaser,
      status: clueStatus(state, node),
      observation: state.inspected.has(node.id) ? node.observation : null,
    })),
    verdicts: def.verdicts.map((verdict) => ({ id: verdict.id, label: verdict.label })),
    revealText: state.solvedBy !== null ? def.revealText : null,
  };
}
