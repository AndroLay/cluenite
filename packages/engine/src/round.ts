import {
  MAX_COMMAND_LENGTH,
  MAX_COMMAND_TOKENS,
  type ClueStatus,
  type CommandResult,
  type ResultCode,
  type ResultReason,
  type RoundSnapshot,
  type SessionPhase,
  type Stage,
  type TeamRole,
} from "@cluenite/contracts";
import {
  connectionKey,
  validateCaseDefinition,
  type CaseDefinition,
  type ChallengeDef,
  type ClueNodeDef,
  type EvidenceDef,
} from "./caseDefinition.js";

export type RoundSource = "simulation" | "live";
export type CommandActor = "simulation" | "host" | "twitch";

// Immutable round state. Every accepted transition returns a new object so the
// repository can atomically persist a revision and tests can replay actions.
export interface RoundState {
  readonly sessionId: string;
  readonly source: RoundSource;
  readonly def: CaseDefinition;
  readonly contentErrors: readonly string[];
  readonly inspected: ReadonlySet<string>;
  readonly unlocked: ReadonlySet<string>;
  readonly recorded: readonly string[];
  readonly completedSequences: ReadonlySet<string>;
  readonly decodedCodes: ReadonlySet<string>;
  readonly proposedTheories: ReadonlySet<string>;
  readonly challengeResults: ReadonlySet<string>;
  readonly contradictedTheories: ReadonlySet<string>;
  readonly supportedTheories: ReadonlySet<string>;
  readonly sharedEvidence: ReadonlySet<string>;
  readonly hintsUsed: number;
  readonly paused: boolean;
  readonly solvedBy: string | null;
  readonly clock: RoundClock;
  readonly revision: number;
}

export interface Transition {
  readonly state: RoundState;
  readonly result: CommandResult;
}

export interface CommandContext {
  readonly actor?: CommandActor;
  readonly team?: TeamRole | null;
}

// Informative elapsed timer. It has no deadline and never ends the round. The
// server passes its own clock in, so the engine stays free of Date and random.
export interface RoundClock {
  readonly started: boolean;
  readonly accumulatedMs: number;
  readonly runningSince: number | null;
}

const IDLE_CLOCK: RoundClock = {
  started: false,
  accumulatedMs: 0,
  runningSince: null,
};

function elapsedAt(clock: RoundClock, nowMs: number): number {
  const running =
    clock.runningSince === null ? 0 : Math.max(0, nowMs - clock.runningSince);
  return clock.accumulatedMs + running;
}

function pauseClock(clock: RoundClock, nowMs: number): RoundClock {
  if (clock.runningSince === null) return clock;
  return {
    started: true,
    accumulatedMs: elapsedAt(clock, nowMs),
    runningSince: null,
  };
}

function runClock(clock: RoundClock, nowMs: number): RoundClock {
  if (!clock.started)
    return { started: true, accumulatedMs: 0, runningSince: nowMs };
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
    completedSequences: new Set<string>(),
    decodedCodes: new Set<string>(),
    proposedTheories: new Set<string>(),
    challengeResults: new Set<string>(),
    contradictedTheories: new Set<string>(),
    supportedTheories: new Set<string>(),
    sharedEvidence: new Set<string>(),
    hintsUsed: 0,
    paused: false,
    solvedBy: null,
    clock: IDLE_CLOCK,
    revision: options.revision ?? 0,
  };
}

type ParsedCommand =
  | {
      ok: true;
      verb:
        "inspect" | "solve" | "code" | "theory" | "scan" | "verify" | "share";
      target: string;
    }
  | { ok: true; verb: "link"; a: string; b: string }
  | { ok: true; verb: "order"; items: readonly string[] }
  | { ok: true; verb: "challenge"; theory: string; evidence: string }
  | { ok: true; verb: "hint" | "help" }
  | { ok: false; reason: ResultReason; message: string };

// Text grammar is deliberately small and case-local. Every identifier is
// normalized before authored rules are checked.
export function parseCommand(text: string): ParsedCommand {
  const trimmed = text.trim();
  if (trimmed.length > MAX_COMMAND_LENGTH) {
    return {
      ok: false,
      reason: "INPUT_TOO_LONG",
      message: "Command is too long.",
    };
  }
  if (!/^[\x20-\x7E]*$/.test(trimmed)) {
    return {
      ok: false,
      reason: "BAD_SYNTAX",
      message: "Use plain ASCII text.",
    };
  }
  const body = trimmed.startsWith("!") ? trimmed.slice(1) : trimmed;
  const tokens = body.split(/\s+/).filter((token) => token.length > 0);
  if (tokens.length === 0) {
    return { ok: false, reason: "BAD_SYNTAX", message: "Empty command." };
  }
  if (tokens.length > MAX_COMMAND_TOKENS) {
    return {
      ok: false,
      reason: "TOO_MANY_TOKENS",
      message: "Too many words in the command.",
    };
  }

  const [head = "", ...rawArgs] = tokens;
  const verb = head.toLowerCase();
  const args = rawArgs.map((token) => token.toUpperCase());
  const [first = "", second = ""] = args;
  if (verb === "inspect" || verb === "look") {
    if (args.length !== 1) return usage("!look <clue>");
    return { ok: true, verb: "inspect", target: first };
  }
  if (verb === "link") {
    if (args.length !== 2) return usage("!link <clue> <clue>");
    return { ok: true, verb: "link", a: first, b: second };
  }
  if (verb === "order") {
    if (args.length < 2) return usage("!order <event> <event> [...]");
    return { ok: true, verb: "order", items: args };
  }
  if (verb === "code" || verb === "decode") {
    if (args.length !== 1) return usage("!code <code>");
    return { ok: true, verb: "code", target: first };
  }
  if (verb === "theory") {
    if (args.length !== 1) return usage("!theory <theory>");
    return { ok: true, verb: "theory", target: first };
  }
  if (verb === "challenge") {
    if (args.length !== 2) return usage("!challenge <theory> <evidence>");
    return { ok: true, verb: "challenge", theory: first, evidence: second };
  }
  if (verb === "scan" || verb === "verify" || verb === "share") {
    if (args.length !== 1) return usage(`!${verb} <target>`);
    return { ok: true, verb, target: first };
  }
  if (verb === "solve") {
    if (args.length !== 1) return usage("!solve <verdict>");
    return { ok: true, verb: "solve", target: first };
  }
  if (verb === "hint" || verb === "help") {
    if (args.length !== 0) return usage(`!${verb}`);
    return { ok: true, verb };
  }
  return {
    ok: false,
    reason: "UNKNOWN_COMMAND",
    message:
      "Unknown command. Try !look, !link, !order, !theory, !challenge, !scan, !verify, !share, !hint, or !solve.",
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
    result: {
      code,
      reason,
      message,
      missing: [...missing],
      revision: next.revision,
    },
  };
}

function nodeOwning(
  def: CaseDefinition,
  evidenceId: string,
): ClueNodeDef | undefined {
  return def.clues.find((node) => node.unlocks.includes(evidenceId));
}

function evidenceMatching(def: CaseDefinition, token: string): EvidenceDef[] {
  return def.evidence.filter(
    (item) =>
      item.id === token ||
      item.id.startsWith(`${token}_`) ||
      nodeOwning(def, item.id)?.id === token,
  );
}

type Resolved<T> =
  | { ok: true; value: T }
  | { ok: false; code: ResultCode; reason: ResultReason; message: string };

function resolveUnlockedEvidence(
  state: RoundState,
  token: string,
  team: TeamRole | null,
): Resolved<string> {
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
    return {
      ok: false,
      code: "INVALID",
      reason: "UNKNOWN_TARGET",
      message: `Unknown clue: ${token}.`,
    };
  }
  const visible = matches.filter((item) => {
    if (team === null || item.team === undefined || item.team === team)
      return true;
    return state.sharedEvidence.has(item.id);
  });
  const unlocked = visible.filter((item) => state.unlocked.has(item.id));
  if (unlocked.length === 0) {
    return {
      ok: false,
      code: "NOT_AVAILABLE",
      reason: "NOT_UNLOCKED",
      message: "Not available yet.",
    };
  }
  if (unlocked.length > 1) {
    return {
      ok: false,
      code: "INVALID",
      reason: "AMBIGUOUS_TARGET",
      message: `${token} matches several clues. Use the full ID.`,
    };
  }
  return { ok: true, value: unlocked[0]!.id };
}

function resolveVerdict(def: CaseDefinition, token: string) {
  return def.verdicts.find(
    (verdict) => verdict.id === token || verdict.aliases.includes(token),
  );
}

function missingProof(state: RoundState): string[] {
  const { def } = state;
  const missing: string[] = [];
  const add = (category: string) => {
    if (!missing.includes(category)) missing.push(category);
  };
  for (const req of def.proof.evidence) {
    if (!state.unlocked.has(req.id)) add(req.category);
  }
  for (const req of def.proof.links) {
    if (!state.recorded.includes(connectionKey(req.a, req.b)))
      add(req.category);
  }
  for (const id of def.proof.sequences ?? []) {
    if (!state.completedSequences.has(id)) add("verified event order");
  }
  for (const id of def.proof.challenges ?? []) {
    if (!state.challengeResults.has(id)) add("theory challenge");
  }
  for (const id of def.proof.sharedEvidence ?? []) {
    if (!state.sharedEvidence.has(id)) add("cross-community evidence");
  }
  return missing;
}

function applyInspect(
  state: RoundState,
  token: string,
  team: TeamRole | null,
): Transition {
  const { def } = state;
  const node = def.clues.find((clue) => clue.id === token);
  if (node) {
    if (node.team && team !== null && team !== node.team) {
      return respond(
        state,
        "NOT_AUTHORIZED",
        "TEAM_REQUIRED",
        "This clue belongs to the other station.",
      );
    }
    if (state.inspected.has(node.id)) {
      return respond(
        state,
        "ACCEPTED_ALREADY_KNOWN",
        null,
        `Already inspected: ${node.id}.`,
      );
    }
    const inspected = new Set(state.inspected);
    inspected.add(node.id);
    const unlocked = new Set(state.unlocked);
    for (const id of node.unlocks) unlocked.add(id);
    const next: RoundState = {
      ...state,
      inspected,
      unlocked,
      revision: state.revision + 1,
    };
    return respond(state, "ACCEPTED_NEW", null, node.observation, [], next);
  }

  const matches = evidenceMatching(def, token);
  if (matches.length === 0) {
    return respond(
      state,
      "INVALID",
      "UNKNOWN_TARGET",
      `Unknown clue: ${token}.`,
    );
  }
  const visible = matches.filter((item) => {
    if (team === null || item.team === undefined || item.team === team)
      return true;
    return state.sharedEvidence.has(item.id);
  });
  const unlocked = visible.filter((item) => state.unlocked.has(item.id));
  if (unlocked.length === 0) {
    return respond(
      state,
      "NOT_AVAILABLE",
      "NOT_UNLOCKED",
      "Not available yet.",
    );
  }
  if (new Set(unlocked.map((item) => nodeOwning(def, item.id)?.id)).size > 1) {
    return respond(
      state,
      "INVALID",
      "AMBIGUOUS_TARGET",
      `${token} matches several clues. Use the full ID.`,
    );
  }
  return respond(
    state,
    "ACCEPTED_ALREADY_KNOWN",
    null,
    `Already inspected: ${token}.`,
  );
}

function applyLink(
  state: RoundState,
  tokenA: string,
  tokenB: string,
  team: TeamRole | null,
): Transition {
  const a = resolveUnlockedEvidence(state, tokenA, team);
  if (!a.ok) return respond(state, a.code, a.reason, a.message);
  const b = resolveUnlockedEvidence(state, tokenB, team);
  if (!b.ok) return respond(state, b.code, b.reason, b.message);
  if (a.value === b.value) {
    return respond(
      state,
      "INVALID",
      "SAME_TARGET",
      "Pick two different clues.",
    );
  }
  const key = connectionKey(a.value, b.value);
  if (state.recorded.includes(key)) {
    return respond(state, "ACCEPTED_ALREADY_KNOWN", null, "Already linked.");
  }
  const isConnection = state.def.connections.some(
    (link) => connectionKey(link.a, link.b) === key,
  );
  if (!isConnection) {
    return respond(
      state,
      "INVALID",
      "NO_CONNECTION",
      "These clues do not connect.",
    );
  }
  const next: RoundState = {
    ...state,
    recorded: [...state.recorded, key].sort(),
    revision: state.revision + 1,
  };
  return respond(
    state,
    "ACCEPTED_NEW",
    null,
    `Linked ${a.value} with ${b.value}.`,
    [],
    next,
  );
}

function applyOrder(state: RoundState, items: readonly string[]): Transition {
  const sequence = state.def.sequences?.find(
    (candidate) => candidate.expectedOrder.join(" ") === items.join(" "),
  );
  if (!sequence) {
    return respond(
      state,
      "INVALID",
      "SEQUENCE_INVALID",
      "That event order is not supported by the evidence.",
    );
  }
  if (state.completedSequences.has(sequence.id)) {
    return respond(
      state,
      "ACCEPTED_ALREADY_KNOWN",
      null,
      "That timeline is already verified.",
    );
  }
  const missing = (sequence.requiredEvidence ?? [])
    .filter((id) => !state.unlocked.has(id))
    .map(
      (id) =>
        state.def.evidence.find((item) => item.id === id)?.category ??
        "timeline evidence",
    );
  if (missing.length > 0) {
    return respond(
      state,
      "NOT_AVAILABLE",
      "NOT_UNLOCKED",
      "Inspect the related records before ordering these events.",
      [...new Set(missing)],
    );
  }
  const completedSequences = new Set(state.completedSequences);
  completedSequences.add(sequence.id);
  const unlocked = new Set(state.unlocked);
  for (const id of sequence.unlocks) unlocked.add(id);
  const next: RoundState = {
    ...state,
    completedSequences,
    unlocked,
    revision: state.revision + 1,
  };
  return respond(state, "ACCEPTED_NEW", null, sequence.successText, [], next);
}

function applyCode(state: RoundState, code: string): Transition {
  const item = state.def.codes?.find(
    (candidate) => candidate.expectedCode === code,
  );
  if (!item) {
    return respond(
      state,
      "INVALID",
      "CODE_INVALID",
      "That code does not open the record.",
    );
  }
  if (state.decodedCodes.has(item.id)) {
    return respond(
      state,
      "ACCEPTED_ALREADY_KNOWN",
      null,
      "That record is already open.",
    );
  }
  const decodedCodes = new Set(state.decodedCodes);
  decodedCodes.add(item.id);
  const unlocked = new Set(state.unlocked);
  for (const id of item.unlocks) unlocked.add(id);
  const next: RoundState = {
    ...state,
    decodedCodes,
    unlocked,
    revision: state.revision + 1,
  };
  return respond(state, "ACCEPTED_NEW", null, item.successText, [], next);
}

function applyTheory(state: RoundState, token: string): Transition {
  const theory = state.def.theories?.find((item) => item.id === token);
  if (!theory) {
    return respond(
      state,
      "INVALID",
      "UNKNOWN_THEORY",
      "That theory is not part of this case.",
    );
  }
  if (state.proposedTheories.has(theory.id)) {
    return respond(
      state,
      "ACCEPTED_ALREADY_KNOWN",
      null,
      "That theory is already on the board.",
    );
  }
  const proposedTheories = new Set(state.proposedTheories);
  proposedTheories.add(theory.id);
  const next: RoundState = {
    ...state,
    proposedTheories,
    revision: state.revision + 1,
  };
  return respond(
    state,
    "ACCEPTED_NEW",
    null,
    `${theory.label} is recorded as unverified.`,
    [],
    next,
  );
}

function applyChallenge(
  state: RoundState,
  theoryId: string,
  evidenceToken: string,
  team: TeamRole | null,
): Transition {
  const theory = state.def.theories?.find((item) => item.id === theoryId);
  if (!theory) {
    return respond(
      state,
      "INVALID",
      "UNKNOWN_THEORY",
      "That theory is not part of this case.",
    );
  }
  if (!state.proposedTheories.has(theory.id)) {
    return respond(
      state,
      "NOT_AVAILABLE",
      "NOT_UNLOCKED",
      "Put the theory on the board before challenging it.",
    );
  }
  const evidence = resolveUnlockedEvidence(state, evidenceToken, team);
  if (!evidence.ok)
    return respond(state, evidence.code, evidence.reason, evidence.message);
  const rule: ChallengeDef | undefined = state.def.challenges?.find(
    (candidate) =>
      candidate.theoryId === theory.id &&
      candidate.evidenceId === evidence.value,
  );
  if (!rule) {
    return respond(
      state,
      "INVALID",
      "CHALLENGE_UNSUPPORTED",
      "That evidence does not establish a challenge to this theory.",
    );
  }
  if (state.challengeResults.has(rule.id)) {
    return respond(
      state,
      "ACCEPTED_ALREADY_KNOWN",
      null,
      "That theory has already been checked.",
    );
  }
  const challengeResults = new Set(state.challengeResults);
  challengeResults.add(rule.id);
  const contradictedTheories = new Set(state.contradictedTheories);
  if (rule.status === "CONTRADICTED") contradictedTheories.add(theory.id);
  const supportedTheories = new Set(state.supportedTheories);
  if (rule.status === "SUPPORTED") supportedTheories.add(theory.id);
  const unlocked = new Set(state.unlocked);
  for (const id of rule.unlocks ?? []) unlocked.add(id);
  const next: RoundState = {
    ...state,
    challengeResults,
    contradictedTheories,
    supportedTheories,
    unlocked,
    revision: state.revision + 1,
  };
  return respond(state, "ACCEPTED_NEW", null, rule.message, [], next);
}

function applyStationAction(
  state: RoundState,
  verb: "scan" | "verify",
  target: string,
  context: CommandContext,
): Transition {
  const action = state.def.stationActions?.find(
    (item) => item.verb === verb && item.targetId === target,
  );
  if (!action) {
    return respond(
      state,
      "INVALID",
      "UNKNOWN_TARGET",
      `Unknown ${verb} target: ${target}.`,
    );
  }
  if (context.actor !== "twitch") {
    return respond(
      state,
      "NOT_AUTHORIZED",
      "TEAM_REQUIRED",
      "Station proof must come from its connected Twitch channel.",
    );
  }
  if (context.team !== action.team) {
    return respond(
      state,
      "NOT_AUTHORIZED",
      "TEAM_REQUIRED",
      "That action belongs to the other station.",
    );
  }
  if (state.unlocked.has(action.evidenceId)) {
    return respond(
      state,
      "ACCEPTED_ALREADY_KNOWN",
      null,
      "That station finding is already confirmed.",
    );
  }
  const unlocked = new Set(state.unlocked);
  unlocked.add(action.evidenceId);
  const next: RoundState = { ...state, unlocked, revision: state.revision + 1 };
  return respond(state, "ACCEPTED_NEW", null, action.message, [], next);
}

function applyShare(
  state: RoundState,
  token: string,
  context: CommandContext,
): Transition {
  if (state.def.mode !== "coop" || !state.def.jointProof) {
    return respond(
      state,
      "NOT_AVAILABLE",
      "SHARE_NOT_ALLOWED",
      "This case does not have a shared station board.",
    );
  }
  if (context.actor !== "twitch" || !context.team) {
    return respond(
      state,
      "NOT_AUTHORIZED",
      "TEAM_REQUIRED",
      "Only a connected station channel can share evidence.",
    );
  }
  const evidence = resolveUnlockedEvidence(state, token, context.team);
  if (!evidence.ok)
    return respond(state, evidence.code, evidence.reason, evidence.message);
  const item = state.def.evidence.find(
    (candidate) => candidate.id === evidence.value,
  );
  if (!item || item.team !== context.team) {
    return respond(
      state,
      "NOT_AUTHORIZED",
      "TEAM_REQUIRED",
      "Only your station can share its local evidence.",
    );
  }
  if (state.sharedEvidence.has(item.id)) {
    return respond(
      state,
      "ACCEPTED_ALREADY_KNOWN",
      null,
      "That finding is already shared.",
    );
  }
  const sharedEvidence = new Set(state.sharedEvidence);
  sharedEvidence.add(item.id);
  const unlocked = new Set(state.unlocked);
  let message = `Shared ${item.label} with the other community.`;
  const joint = state.def.jointProof;
  if (
    sharedEvidence.has(joint.evidenceFromA) &&
    sharedEvidence.has(joint.evidenceFromB) &&
    !unlocked.has(joint.evidenceId)
  ) {
    unlocked.add(joint.evidenceId);
    message = joint.message;
  }
  const next: RoundState = {
    ...state,
    sharedEvidence,
    unlocked,
    revision: state.revision + 1,
  };
  return respond(state, "ACCEPTED_NEW", null, message, [], next);
}

function applyHint(state: RoundState): Transition {
  const hints = state.def.hints ?? [];
  if (state.hintsUsed >= hints.length) {
    return respond(
      state,
      "NOT_AVAILABLE",
      "HINTS_EXHAUSTED",
      "No more hints are available yet.",
    );
  }
  const message = hints[state.hintsUsed]!;
  const next: RoundState = {
    ...state,
    hintsUsed: state.hintsUsed + 1,
    revision: state.revision + 1,
  };
  return respond(state, "ACCEPTED_NEW", null, message, [], next);
}

function availableActions(state: RoundState, team: TeamRole | null): string[] {
  if (state.paused || state.solvedBy !== null || state.contentErrors.length > 0)
    return [];

  const hasUnlockedEvidence = (id: string): boolean => {
    const evidence = state.def.evidence.find((item) => item.id === id);
    if (!evidence || !state.unlocked.has(id)) return false;
    return (
      team === null ||
      evidence.team === undefined ||
      evidence.team === team ||
      state.sharedEvidence.has(id)
    );
  };
  const actions: string[] = [];
  if (
    state.def.clues.some(
      (clue) =>
        !state.inspected.has(clue.id) &&
        (team === null || clue.team === undefined || clue.team === team),
    )
  ) {
    actions.push("look");
  }
  if (
    state.def.connections.some(
      ({ a, b }) =>
        !state.recorded.includes(connectionKey(a, b)) &&
        hasUnlockedEvidence(a) &&
        hasUnlockedEvidence(b),
    )
  ) {
    actions.push("link");
  }
  if (
    state.def.sequences?.some(
      (sequence) =>
        !state.completedSequences.has(sequence.id) &&
        (sequence.requiredEvidence ?? []).every(hasUnlockedEvidence),
    )
  ) {
    actions.push("order");
  }
  if (state.def.codes?.some((code) => !state.decodedCodes.has(code.id))) {
    actions.push("code");
  }
  if (
    state.def.theories?.some((theory) => !state.proposedTheories.has(theory.id))
  ) {
    actions.push("theory");
  }
  if (
    state.def.challenges?.some(
      (challenge) =>
        state.proposedTheories.has(challenge.theoryId) &&
        !state.challengeResults.has(challenge.id) &&
        hasUnlockedEvidence(challenge.evidenceId),
    )
  ) {
    actions.push("challenge");
  }
  for (const action of ["scan", "verify"] as const) {
    if (
      state.def.stationActions?.some(
        (item) =>
          item.verb === action &&
          item.team === team &&
          !state.unlocked.has(item.evidenceId),
      )
    ) {
      actions.push(action);
    }
  }
  if (
    team !== null &&
    state.def.mode === "coop" &&
    state.def.jointProof &&
    state.def.evidence.some(
      (item) =>
        item.team === team &&
        state.unlocked.has(item.id) &&
        !state.sharedEvidence.has(item.id),
    )
  ) {
    actions.push("share");
  }
  if (missingProof(state).length === 0) actions.push("solve");
  if (state.hintsUsed < (state.def.hints?.length ?? 0)) actions.push("hint");
  return actions;
}

function applySolve(state: RoundState, token: string): Transition {
  const { def } = state;
  const verdict = resolveVerdict(def, token);
  if (!verdict) {
    const options = def.verdicts.map((item) => item.id).join(", ");
    return respond(
      state,
      "INVALID",
      "UNKNOWN_VERDICT",
      `Unknown verdict. Options: ${options}.`,
    );
  }
  if (state.solvedBy !== null) {
    if (state.solvedBy === verdict.id) {
      return respond(state, "ACCEPTED_ALREADY_KNOWN", null, "Already solved.");
    }
    return respond(
      state,
      "NOT_AVAILABLE",
      "ROUND_RESOLVED",
      "This round is already solved.",
    );
  }
  if (def.falseVerdicts.includes(verdict.id)) {
    return respond(
      state,
      "INVALID",
      "VERDICT_NOT_SUPPORTED",
      "The evidence does not support that conclusion.",
    );
  }
  if (!def.acceptedVerdicts.includes(verdict.id)) {
    return respond(
      state,
      "CONTENT_ERROR",
      null,
      "Verdict is not configured for this case.",
    );
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
  const next: RoundState = {
    ...state,
    solvedBy: verdict.id,
    revision: state.revision + 1,
  };
  return respond(
    state,
    "ACCEPTED_NEW",
    null,
    "Verified. The round is solved.",
    [],
    next,
  );
}

// Single entry point for viewer and host commands. Only ACCEPTED_NEW changes
// the revision; duplicates and rejected actions return the same state object.
export function applyCommand(
  state: RoundState,
  text: string,
  nowMs: number,
  context: CommandContext = {},
): Transition {
  const transition = decideCommand(state, text, context);
  if (transition.result.code !== "ACCEPTED_NEW") return transition;
  const clock =
    transition.state.solvedBy !== null && state.solvedBy === null
      ? pauseClock(state.clock, nowMs)
      : runClock(state.clock, nowMs);
  return { state: { ...transition.state, clock }, result: transition.result };
}

function decideCommand(
  state: RoundState,
  text: string,
  context: CommandContext,
): Transition {
  if (state.contentErrors.length > 0) {
    return respond(
      state,
      "CONTENT_ERROR",
      null,
      "Case content is invalid. The round cannot run.",
    );
  }
  if (state.paused) {
    return respond(state, "PAUSED", null, "The round is paused.");
  }
  const parsed = parseCommand(text);
  if (!parsed.ok)
    return respond(state, "INVALID", parsed.reason, parsed.message);
  if (state.solvedBy !== null) {
    if (parsed.verb === "solve") return applySolve(state, parsed.target);
    return respond(
      state,
      "NOT_AVAILABLE",
      "ROUND_RESOLVED",
      "This round is already solved.",
    );
  }
  switch (parsed.verb) {
    case "inspect":
      return applyInspect(state, parsed.target, context.team ?? null);
    case "link":
      return applyLink(state, parsed.a, parsed.b, context.team ?? null);
    case "order":
      return applyOrder(state, parsed.items);
    case "code":
      return applyCode(state, parsed.target);
    case "theory":
      return applyTheory(state, parsed.target);
    case "challenge":
      return applyChallenge(
        state,
        parsed.theory,
        parsed.evidence,
        context.team ?? null,
      );
    case "scan":
    case "verify":
      return applyStationAction(state, parsed.verb, parsed.target, context);
    case "share":
      return applyShare(state, parsed.target, context);
    case "hint":
      return applyHint(state);
    case "help":
      return respond(
        state,
        "ACCEPTED_ALREADY_KNOWN",
        null,
        `Commands: ${availableActions(state, context.team ?? null)
          .map((item) => `!${item}`)
          .join(", ")}.`,
      );
    case "solve":
      return applySolve(state, parsed.target);
  }
}

// Host control. Pause and resume bump revision so every projection re-renders.
export function setPaused(
  state: RoundState,
  paused: boolean,
  nowMs: number,
): RoundState {
  if (state.paused === paused) return state;
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
  if (
    state.recorded.length > 0 ||
    state.proposedTheories.size > 0 ||
    state.challengeResults.size > 0
  )
    return "challenge";
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

// Viewer-safe projection. Fields are copied explicitly: the case answer, proof
// predicates, code values and sequence solution never cross this boundary.
export function toRoundSnapshot(
  state: RoundState,
  nowMs: number,
  team: TeamRole | null = null,
  phase: SessionPhase = state.solvedBy !== null
    ? "RESOLVED"
    : state.paused
      ? "PAUSED"
      : "ACTIVE",
): RoundSnapshot {
  const { def } = state;
  const visibleClues = def.clues.filter(
    (node) =>
      def.mode !== "coop" || !node.team || team === null || node.team === team,
  );
  const visibleEvidence = def.evidence.filter((item) => {
    if (!state.unlocked.has(item.id)) return false;
    if (
      def.mode !== "coop" ||
      team === null ||
      item.team === undefined ||
      item.team === team
    )
      return true;
    return state.sharedEvidence.has(item.id);
  });
  return {
    protocolVersion: 1,
    revision: state.revision,
    sessionId: state.sessionId,
    source: state.source,
    caseId: def.id,
    caseMode: def.mode,
    team,
    phase,
    title: def.title,
    premise: def.premise,
    question: def.question,
    stage: deriveStage(state),
    paused: state.paused,
    timer: {
      elapsedMs: Math.floor(elapsedAt(state.clock, nowMs)),
      running: state.clock.runningSince !== null,
    },
    clues: visibleClues.map((node) => ({
      id: node.id,
      label: node.label,
      teaser: node.teaser,
      status: clueStatus(state, node),
      observation: state.inspected.has(node.id) ? node.observation : null,
    })),
    evidence: visibleEvidence.map((item) => ({
      id: item.id,
      label: item.label,
      team: item.team ?? null,
      shared: state.sharedEvidence.has(item.id),
    })),
    sequences: (def.sequences ?? []).map((item) => ({
      id: item.id,
      label: item.label,
      complete: state.completedSequences.has(item.id),
      ...(item.events
        ? { events: item.events.map(({ id, label }) => ({ id, label })) }
        : {}),
    })),
    theories: (def.theories ?? []).map((item) => ({
      id: item.id,
      label: item.label,
      status: state.contradictedTheories.has(item.id)
        ? ("CONTRADICTED" as const)
        : state.supportedTheories.has(item.id)
          ? ("SUPPORTED" as const)
          : ("UNVERIFIED" as const),
    })),
    currentHint:
      state.hintsUsed > 0 ? (def.hints?.[state.hintsUsed - 1] ?? null) : null,
    hintLevel: state.hintsUsed,
    availableActions: availableActions(state, team),
    verdicts: def.verdicts.map((verdict) => ({
      id: verdict.id,
      label: verdict.label,
    })),
    revealText: state.solvedBy !== null ? def.revealText : null,
  };
}
