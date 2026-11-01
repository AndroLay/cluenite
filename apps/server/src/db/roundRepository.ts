import { createHash, randomUUID } from "node:crypto";
import { constantTimeEqual } from "../auth/crypto.js";
import type {
  CommandResult,
  RoundSnapshot,
  SessionPhase,
  SessionControl,
  TeamRole,
} from "@cluenite/contracts";
import { findAuthoredCase } from "@cluenite/cases";
import {
  connectionKey,
  createRound,
  applyCommand,
  restartRound,
  setPaused,
  toRoundSnapshot,
  type CaseDefinition,
  type RoundClock,
  type RoundSource,
  type RoundState,
} from "@cluenite/engine";
import type { Pool, PoolClient } from "pg";

interface SessionRow {
  readonly id: string;
  readonly host_twitch_id: string;
  readonly case_id: string;
  readonly case_version: number;
  readonly case_content_hash: string;
  readonly phase: SessionPhase;
  readonly source: RoundSource;
  readonly revision: string | number;
  readonly state: unknown;
  readonly create_idempotency_key: string;
}

interface PersistedRoundState {
  readonly version: 2;
  readonly inspected: readonly string[];
  readonly unlocked: readonly string[];
  readonly recorded: readonly string[];
  readonly completedSequences: readonly string[];
  readonly decodedCodes: readonly string[];
  readonly proposedTheories: readonly string[];
  readonly challengeResults: readonly string[];
  readonly contradictedTheories: readonly string[];
  readonly supportedTheories: readonly string[];
  readonly sharedEvidence: readonly string[];
  readonly hintsUsed: number;
  readonly paused: boolean;
  readonly solvedBy: string | null;
  readonly clock: RoundClock;
  readonly revision: number;
}

export interface CreateRoundInput {
  readonly hostTwitchId: string;
  readonly caseId: string;
  readonly idempotencyKey: string;
}

export interface ApplyRoundInput {
  readonly sessionId: string;
  readonly inputId: string;
  readonly idempotencyKey?: string;
  readonly eventSubMessageId?: string;
  readonly actorTwitchId: string | null;
  readonly text: string;
  readonly source: "twitch" | "host";
  readonly channelId?: string;
  readonly leaderOwnerId?: string;
  readonly leaderEpoch?: number;
  readonly originBroadcasterId?: string;
  readonly sourceMessageId?: string;
}

export interface ControlRoundInput {
  readonly sessionId: string;
  readonly hostTwitchId: string;
  readonly action: SessionControl["action"];
  readonly idempotencyKey: string;
}

export interface CreateCoopInvitationInput {
  readonly sessionId: string;
  readonly inviterTwitchId: string;
  readonly inviteeTwitchId: string;
  readonly tokenHash: string;
  readonly idempotencyKey: string;
}

export interface AcceptCoopInvitationInput {
  readonly inviteId: string;
  readonly inviteeTwitchId: string;
  readonly tokenHash: string;
  readonly idempotencyKey: string;
}

export interface DeclineCoopInvitationInput {
  readonly inviteId: string;
  readonly inviteeTwitchId: string;
  readonly tokenHash: string;
  readonly idempotencyKey: string;
}

export interface SessionOperationalDiagnostic {
  readonly sessionId: string;
  readonly caseId: string;
  readonly phase: SessionPhase;
  readonly revision: number;
  readonly pendingOutboxCount: number;
}

export interface OutboxMessage {
  readonly id: number;
  readonly eventId: string;
  readonly sessionId: string;
  readonly revision: number;
  readonly snapshotA: RoundSnapshot;
  readonly snapshotB: RoundSnapshot;
  readonly previousSnapshotA: RoundSnapshot | null;
  readonly previousSnapshotB: RoundSnapshot | null;
}

interface OutboxViews {
  readonly A: RoundSnapshot;
  readonly B: RoundSnapshot;
}

function outboxViews(payload: unknown): OutboxViews {
  return isRecord(payload) && isRecord(payload.A) && isRecord(payload.B)
    ? {
        A: payload.A as unknown as RoundSnapshot,
        B: payload.B as unknown as RoundSnapshot,
      }
    : { A: payload as RoundSnapshot, B: payload as RoundSnapshot };
}

export class IdempotencyConflictError extends Error {
  constructor() {
    super("The idempotency key was already used for a different operation.");
    this.name = "IdempotencyConflictError";
  }
}

export class UnknownAuthoredCaseError extends Error {
  constructor() {
    super("The requested case is not available.");
    this.name = "UnknownAuthoredCaseError";
  }
}

export class CoopInviteConflictError extends Error {
  constructor() {
    super("The co-op invitation conflicts with the current session state.");
    this.name = "CoopInviteConflictError";
  }
}

export class CoopInviteReplayError extends Error {
  constructor() {
    super("The invitation was already created for this idempotency key.");
    this.name = "CoopInviteReplayError";
  }
}

export class CoopInviteExpiredError extends Error {
  constructor() {
    super("The co-op invitation is expired or no longer available.");
    this.name = "CoopInviteExpiredError";
  }
}

const OPEN_PHASES = new Set<SessionPhase>([
  "COOP_WAITING",
  "READY",
  "ACTIVE",
  "PAUSED",
]);

function publicErrorResult(revision = 0): CommandResult {
  return {
    code: "NOT_AVAILABLE",
    reason: "UNKNOWN_TARGET",
    message: "This round is not available.",
    missing: [],
    revision,
  };
}

function emptyState(state: RoundState): PersistedRoundState {
  return {
    version: 2,
    inspected: [...state.inspected].sort(),
    unlocked: [...state.unlocked].sort(),
    recorded: [...state.recorded].sort(),
    completedSequences: [...state.completedSequences].sort(),
    decodedCodes: [...state.decodedCodes].sort(),
    proposedTheories: [...state.proposedTheories].sort(),
    challengeResults: [...state.challengeResults].sort(),
    contradictedTheories: [...state.contradictedTheories].sort(),
    supportedTheories: [...state.supportedTheories].sort(),
    sharedEvidence: [...state.sharedEvidence].sort(),
    hintsUsed: state.hintsUsed,
    paused: state.paused,
    solvedBy: state.solvedBy,
    clock: state.clock,
    revision: state.revision,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string"))
    return null;
  return value;
}

function parseClock(value: unknown): RoundClock | null {
  if (!isRecord(value)) return null;
  const { started, accumulatedMs, runningSince } = value;
  if (
    typeof started !== "boolean" ||
    typeof accumulatedMs !== "number" ||
    !Number.isFinite(accumulatedMs) ||
    accumulatedMs < 0 ||
    (runningSince !== null &&
      (typeof runningSince !== "number" ||
        !Number.isFinite(runningSince) ||
        runningSince < 0))
  ) {
    return null;
  }
  if (!started && (accumulatedMs !== 0 || runningSince !== null)) return null;
  return { started, accumulatedMs, runningSince };
}

function hydrate(row: SessionRow, def: CaseDefinition): RoundState {
  const stored = row.state;
  if (!isRecord(stored) || (stored.version !== 1 && stored.version !== 2))
    throw new Error("Stored round state is unsupported.");
  const inspected = stringArray(stored.inspected);
  const unlocked = stringArray(stored.unlocked);
  const recorded = stringArray(stored.recorded);
  const completedSequences =
    stored.version === 1 ? [] : stringArray(stored.completedSequences);
  const decodedCodes =
    stored.version === 1 ? [] : stringArray(stored.decodedCodes);
  const proposedTheories =
    stored.version === 1 ? [] : stringArray(stored.proposedTheories);
  const challengeResults =
    stored.version === 1 ? [] : stringArray(stored.challengeResults);
  const contradictedTheories =
    stored.version === 1 ? [] : stringArray(stored.contradictedTheories);
  const supportedTheories =
    stored.version === 1 ? [] : stringArray(stored.supportedTheories);
  const sharedEvidence =
    stored.version === 1 ? [] : stringArray(stored.sharedEvidence);
  const hintsUsed = stored.version === 1 ? 0 : stored.hintsUsed;
  const clock = parseClock(stored.clock);
  const revision = Number(row.revision);
  const knownNodes = new Set(def.clues.map((clue) => clue.id));
  const knownEvidence = new Set(def.evidence.map((evidence) => evidence.id));
  const knownLinks = new Set(
    def.connections.map((link) => connectionKey(link.a, link.b)),
  );
  const knownSequences = new Set((def.sequences ?? []).map((item) => item.id));
  const knownCodes = new Set((def.codes ?? []).map((item) => item.id));
  const knownTheories = new Set((def.theories ?? []).map((item) => item.id));
  const knownChallenges = new Set(
    (def.challenges ?? []).map((item) => item.id),
  );
  const solvedBy = stored.solvedBy;
  const validPhase = [
    "READY",
    "COOP_WAITING",
    "ACTIVE",
    "PAUSED",
    "RESOLVED",
    "PARTIAL",
    "CANCELLED",
  ].includes(row.phase);
  const validSource = row.source === "simulation" || row.source === "live";
  const unique = (items: readonly string[]) =>
    new Set(items).size === items.length;
  const sets = [
    completedSequences,
    decodedCodes,
    proposedTheories,
    challengeResults,
    contradictedTheories,
    supportedTheories,
    sharedEvidence,
  ];
  const validAdditionalState = sets.every(
    (items) => items !== null && unique(items),
  );
  const safeSequences = completedSequences ?? [];
  const safeCodes = decodedCodes ?? [];
  const safeTheories = proposedTheories ?? [];
  const safeChallenges = challengeResults ?? [];
  const safeContradictions = contradictedTheories ?? [];
  const safeSupported = supportedTheories ?? [];
  const safeShared = sharedEvidence ?? [];
  const allowedUnlocked = new Set<string>();
  for (const clue of def.clues) {
    if (inspected?.includes(clue.id))
      for (const id of clue.unlocks) allowedUnlocked.add(id);
  }
  for (const sequence of def.sequences ?? []) {
    if (safeSequences.includes(sequence.id))
      for (const id of sequence.unlocks) allowedUnlocked.add(id);
  }
  for (const code of def.codes ?? []) {
    if (safeCodes.includes(code.id))
      for (const id of code.unlocks) allowedUnlocked.add(id);
  }
  for (const challenge of def.challenges ?? []) {
    if (safeChallenges.includes(challenge.id))
      for (const id of challenge.unlocks ?? []) allowedUnlocked.add(id);
  }
  for (const action of def.stationActions ?? [])
    allowedUnlocked.add(action.evidenceId);
  if (
    def.jointProof &&
    safeShared.includes(def.jointProof.evidenceFromA) &&
    safeShared.includes(def.jointProof.evidenceFromB)
  ) {
    allowedUnlocked.add(def.jointProof.evidenceId);
  }
  const evidenceById = new Map(def.evidence.map((item) => [item.id, item]));
  const expectedContradictions = (def.challenges ?? [])
    .filter(
      (item) =>
        safeChallenges.includes(item.id) && item.status === "CONTRADICTED",
    )
    .map((item) => item.theoryId);
  const expectedSupported = (def.challenges ?? [])
    .filter(
      (item) => safeChallenges.includes(item.id) && item.status === "SUPPORTED",
    )
    .map((item) => item.theoryId);
  if (
    !inspected ||
    !unlocked ||
    !recorded ||
    !validAdditionalState ||
    !clock ||
    !validPhase ||
    !validSource ||
    !Number.isSafeInteger(revision) ||
    revision < 0 ||
    stored.revision !== revision ||
    typeof stored.paused !== "boolean" ||
    !unique(inspected) ||
    !unique(unlocked) ||
    !unique(recorded) ||
    !unique(safeSequences) ||
    safeSequences.some((id) => !knownSequences.has(id)) ||
    !unique(safeCodes) ||
    safeCodes.some((id) => !knownCodes.has(id)) ||
    !unique(safeTheories) ||
    safeTheories.some((id) => !knownTheories.has(id)) ||
    !unique(safeChallenges) ||
    safeChallenges.some((id) => !knownChallenges.has(id)) ||
    !unique(safeContradictions) ||
    safeContradictions.some((id) => !knownTheories.has(id)) ||
    !unique(safeSupported) ||
    safeSupported.some((id) => !knownTheories.has(id)) ||
    !unique(safeShared) ||
    safeShared.some(
      (id) =>
        !knownEvidence.has(id) ||
        !evidenceById.get(id)?.team ||
        !unlocked.includes(id),
    ) ||
    typeof hintsUsed !== "number" ||
    !Number.isSafeInteger(hintsUsed) ||
    hintsUsed < 0 ||
    hintsUsed > (def.hints?.length ?? 0) ||
    (solvedBy !== null &&
      (typeof solvedBy !== "string" ||
        !def.acceptedVerdicts.includes(solvedBy))) ||
    ((row.phase === "COOP_WAITING" ||
      row.phase === "READY" ||
      row.phase === "PAUSED" ||
      row.phase === "PARTIAL" ||
      row.phase === "CANCELLED") &&
      !stored.paused) ||
    (row.phase === "ACTIVE" && stored.paused) ||
    (row.phase === "RESOLVED") !== (solvedBy !== null) ||
    ((stored.paused || solvedBy !== null) && clock.runningSince !== null) ||
    inspected.some((id) => !knownNodes.has(id)) ||
    unlocked.some((id) => !knownEvidence.has(id)) ||
    recorded.some((key) => !knownLinks.has(key)) ||
    recorded.some((key) =>
      key.split("|").some((id) => !unlocked.includes(id)),
    ) ||
    unlocked.some((id) => !allowedUnlocked.has(id)) ||
    safeChallenges.some((id) => {
      const rule = def.challenges?.find((item) => item.id === id);
      return (
        !rule ||
        !safeTheories.includes(rule.theoryId) ||
        !unlocked.includes(rule.evidenceId)
      );
    }) ||
    expectedContradictions.some((id) => !safeContradictions.includes(id)) ||
    safeContradictions.some((id) => !expectedContradictions.includes(id)) ||
    expectedSupported.some((id) => !safeSupported.includes(id)) ||
    safeSupported.some((id) => !expectedSupported.includes(id)) ||
    (row.phase === "COOP_WAITING" && def.mode !== "coop")
  ) {
    throw new Error("Stored round state failed validation.");
  }

  const base = createRound(def, {
    sessionId: row.id,
    source: row.source,
    revision,
  });
  return {
    ...base,
    inspected: new Set(inspected),
    unlocked: new Set(unlocked),
    recorded: [...new Set(recorded)].sort(),
    completedSequences: new Set(safeSequences),
    decodedCodes: new Set(safeCodes),
    proposedTheories: new Set(safeTheories),
    challengeResults: new Set(safeChallenges),
    contradictedTheories: new Set(safeContradictions),
    supportedTheories: new Set(safeSupported),
    sharedEvidence: new Set(safeShared),
    hintsUsed: hintsUsed as number,
    paused: stored.paused,
    solvedBy,
    clock,
  };
}

function stateForPhase(state: RoundState, phase: SessionPhase): RoundState {
  if (
    phase === "COOP_WAITING" ||
    phase === "READY" ||
    phase === "PAUSED" ||
    phase === "PARTIAL" ||
    phase === "CANCELLED"
  ) {
    if (state.paused) return state;
    return { ...state, paused: true };
  }
  return state;
}

function snapshot(
  state: RoundState,
  phase: SessionPhase,
  now: number,
  team: TeamRole | null = "A",
): RoundSnapshot {
  return {
    ...toRoundSnapshot(stateForPhase(state, phase), now, team, phase),
    // Accepted verdict only. The engine's solvedBy is set when a verdict is accepted, never for a rejected one.
    chosenVerdictId: state.solvedBy,
  };
}

function hasMeaningfulProgress(state: RoundState): boolean {
  return (
    state.inspected.size > 0 ||
    state.unlocked.size > 0 ||
    state.recorded.length > 0 ||
    state.completedSequences.size > 0 ||
    state.decodedCodes.size > 0 ||
    state.proposedTheories.size > 0 ||
    state.challengeResults.size > 0 ||
    state.sharedEvidence.size > 0 ||
    state.hintsUsed > 0
  );
}

function contentHash(def: CaseDefinition): string {
  return createHash("sha256").update(JSON.stringify(def)).digest("hex");
}

function publicCaseMetadata(def: CaseDefinition): Record<string, unknown> {
  return {
    title: def.title,
    premise: def.premise,
    question: def.question,
    clues: def.clues.map(({ id, label, teaser }) => ({ id, label, teaser })),
    verdicts: def.verdicts.map(({ id, label }) => ({ id, label })),
  };
}

function conflictResult(revision: number): CommandResult {
  return {
    code: "IDEMPOTENCY_CONFLICT",
    reason: "IDEMPOTENCY_KEY_REUSED",
    message: "This idempotency key was used for a different request.",
    missing: [],
    revision,
  };
}

function canonicalFingerprint(
  fields: Readonly<Record<string, string | null>>,
): string {
  const canonical = Object.entries(fields).sort(([left], [right]) =>
    left.localeCompare(right),
  );
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

function applyInputFingerprint(input: ApplyRoundInput): string {
  return canonicalFingerprint({
    actionType: "command",
    actorTwitchId: input.actorTwitchId,
    channelId: input.channelId ?? null,
    idempotencyKey: input.idempotencyKey ?? null,
    originBroadcasterId: input.originBroadcasterId ?? null,
    sessionId: input.sessionId,
    source: input.source,
    sourceMessageId: input.sourceMessageId ?? null,
    text: input.text,
    version: "1",
  });
}

function controlFingerprint(input: ControlRoundInput): string {
  return canonicalFingerprint({
    action: input.action,
    actionType: "control",
    actorTwitchId: input.hostTwitchId,
    idempotencyKey: input.idempotencyKey,
    sessionId: input.sessionId,
    version: "1",
  });
}

function scopedInputId(input: ApplyRoundInput): string {
  const actor = input.actorTwitchId ?? "anonymous";
  const requestId = input.idempotencyKey
    ? `key:${input.idempotencyKey}`
    : `input:${input.inputId}`;
  return `command:${input.source}:${actor}:${requestId}`;
}

function legacyActionSummary(text: string): string {
  return text.trim().slice(0, 120);
}

function sanitizedActionSummary(text: string, result: CommandResult): string {
  const verb = text.trim().replace(/^!/, "").split(/\s+/, 1)[0]?.toLowerCase();
  const allowed = [
    "inspect",
    "look",
    "link",
    "solve",
    "order",
    "code",
    "theory",
    "hint",
    "recap",
  ];
  return `command:${verb && allowed.includes(verb) ? verb : "unknown"}:${result.code}`;
}

function isLegacyInputType(input: ApplyRoundInput, legacyId: string): boolean {
  return input.source === "host"
    ? legacyId.startsWith("host:")
    : legacyId.startsWith("twitch:");
}

function controlResult(
  code: CommandResult["code"],
  message: string,
  revision: number,
): CommandResult {
  return { code, reason: null, message, missing: [], revision };
}

function contributionKind(text: string): {
  kind: string;
  evidenceId: string | null;
} {
  const tokens = text.trim().replace(/^!/, "").split(/\s+/);
  const verb = tokens[0]?.toLowerCase();
  if (verb === "look")
    return { kind: "inspect", evidenceId: tokens[1]?.toUpperCase() ?? null };
  if (verb === "inspect")
    return { kind: "inspect", evidenceId: tokens[1]?.toUpperCase() ?? null };
  if (verb === "link") {
    return {
      kind: "link",
      evidenceId:
        [tokens[1], tokens[2]].filter(Boolean).join(":").toUpperCase() || null,
    };
  }
  if (verb === "solve")
    return { kind: "solve", evidenceId: tokens[1]?.toUpperCase() ?? null };
  if (verb === "order")
    return {
      kind: "order",
      evidenceId:
        tokens
          .slice(1)
          .map((token) => token.toUpperCase())
          .join(":") || null,
    };
  if (verb === "scan" || verb === "verify" || verb === "share")
    return { kind: verb, evidenceId: tokens[1]?.toUpperCase() ?? null };
  if (verb === "challenge")
    return {
      kind: "challenge",
      evidenceId:
        tokens
          .slice(1)
          .map((token) => token.toUpperCase())
          .join(":") || null,
    };
  return { kind: "action", evidenceId: null };
}

async function writeEvent(
  client: PoolClient,
  sessionId: string,
  revision: number,
  eventType: string,
  actorTwitchId: string | null,
  viewA: RoundSnapshot,
  viewB: RoundSnapshot = viewA,
): Promise<void> {
  const eventId = randomUUID();
  const payload = JSON.stringify(viewA);
  const outboxPayload = JSON.stringify({
    A: viewA,
    B: viewB,
  } satisfies OutboxViews);
  await client.query(
    `INSERT INTO session_events (event_id, session_id, revision, event_type, actor_twitch_id, payload)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [eventId, sessionId, revision, eventType, actorTwitchId, payload],
  );
  await client.query(
    `INSERT INTO outbox (event_id, session_id, revision, payload)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [eventId, sessionId, revision, outboxPayload],
  );
}

export class PostgresRoundRepository {
  constructor(
    private readonly pool: Pool,
    private readonly now: () => number = Date.now,
  ) {}

  async createCoopInvitation(
    input: CreateCoopInvitationInput,
  ): Promise<{ inviteId: string; expiresAt: Date } | null> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const selected = await client.query<SessionRow>(
        `SELECT * FROM game_sessions
         WHERE id = $1 AND host_twitch_id = $2 FOR UPDATE`,
        [input.sessionId, input.inviterTwitchId],
      );
      const session = selected.rows[0];
      if (!session) {
        await client.query("COMMIT");
        return null;
      }
      const def = findAuthoredCase(session.case_id);
      if (!def || def.mode !== "coop" || session.phase !== "COOP_WAITING") {
        throw new CoopInviteConflictError();
      }
      if (input.inviteeTwitchId === input.inviterTwitchId) {
        throw new CoopInviteConflictError();
      }
      const prior = await client.query(
        `SELECT 1 FROM coop_invites
         WHERE session_id = $1 AND inviter_twitch_id = $2 AND idempotency_key = $3`,
        [input.sessionId, input.inviterTwitchId, input.idempotencyKey],
      );
      if (prior.rowCount) throw new CoopInviteReplayError();
      const existingMember = await client.query(
        `SELECT 1 FROM session_channels
         WHERE session_id = $1 AND broadcaster_id = $2 AND revoked_at IS NULL`,
        [input.sessionId, input.inviteeTwitchId],
      );
      if (existingMember.rowCount) throw new CoopInviteConflictError();
      await client.query(
        `UPDATE coop_invites SET status = 'EXPIRED'
         WHERE session_id = $1 AND status = 'PENDING' AND expires_at <= now()`,
        [input.sessionId],
      );
      await client.query(
        `UPDATE coop_invites SET status = 'REVOKED'
         WHERE session_id = $1 AND status = 'PENDING'`,
        [input.sessionId],
      );
      const inviteId = randomUUID();
      const expiresAt = new Date(this.now() + 24 * 60 * 60 * 1000);
      await client.query(
        `INSERT INTO coop_invites (
           id, session_id, inviter_twitch_id, invitee_twitch_id, token_hash,
           idempotency_key, status, expires_at
         ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7)`,
        [
          inviteId,
          input.sessionId,
          input.inviterTwitchId,
          input.inviteeTwitchId,
          input.tokenHash,
          input.idempotencyKey,
          expiresAt,
        ],
      );
      await client.query("COMMIT");
      return { inviteId, expiresAt };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async acceptCoopInvitation(input: AcceptCoopInvitationInput): Promise<{
    sessionId: string;
    revision: number;
    alreadyAccepted: boolean;
  } | null> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const inviteResult = await client.query<{
        id: string;
        session_id: string;
        inviter_twitch_id: string;
        invitee_twitch_id: string;
        token_hash: string;
        status: string;
        expires_at: Date;
        accept_idempotency_key: string | null;
        decline_idempotency_key: string | null;
      }>(
        `SELECT id, session_id, inviter_twitch_id, invitee_twitch_id, token_hash,
                status, expires_at, accept_idempotency_key, decline_idempotency_key
         FROM coop_invites WHERE id = $1 FOR UPDATE`,
        [input.inviteId],
      );
      const invite = inviteResult.rows[0];
      if (
        !invite ||
        !constantTimeEqual(invite.token_hash, input.tokenHash) ||
        invite.invitee_twitch_id !== input.inviteeTwitchId
      ) {
        await client.query("COMMIT");
        return null;
      }
      if (invite.status === "ACCEPTED") {
        const existing = await client.query<{ team_role: string }>(
          `SELECT team_role FROM session_channels
           WHERE session_id = $1 AND broadcaster_id = $2 AND revoked_at IS NULL`,
          [invite.session_id, input.inviteeTwitchId],
        );
        if (existing.rows[0]?.team_role !== "B") {
          await client.query("COMMIT");
          return null;
        }
        const session = await client.query<{ revision: string | number }>(
          "SELECT revision FROM game_sessions WHERE id = $1",
          [invite.session_id],
        );
        await client.query("COMMIT");
        return {
          sessionId: invite.session_id,
          revision: Number(session.rows[0]?.revision ?? 0),
          alreadyAccepted: true,
        };
      }
      if (invite.status === "EXPIRED") {
        await client.query("COMMIT");
        throw new CoopInviteExpiredError();
      }
      if (invite.status !== "PENDING") throw new CoopInviteConflictError();
      if (invite.expires_at.getTime() <= this.now()) {
        await client.query(
          "UPDATE coop_invites SET status = 'EXPIRED' WHERE id = $1 AND status = 'PENDING'",
          [input.inviteId],
        );
        await client.query("COMMIT");
        throw new CoopInviteExpiredError();
      }
      const account = await client.query(
        `SELECT 1 FROM twitch_accounts
         WHERE twitch_user_id = $1 AND revoked_at IS NULL`,
        [input.inviteeTwitchId],
      );
      if (!account.rowCount) {
        await client.query("COMMIT");
        return null;
      }
      const sessionResult = await client.query<SessionRow>(
        "SELECT * FROM game_sessions WHERE id = $1 FOR UPDATE",
        [invite.session_id],
      );
      const session = sessionResult.rows[0];
      if (!session || session.phase !== "COOP_WAITING") {
        throw new CoopInviteConflictError();
      }
      const def = findAuthoredCase(session.case_id);
      if (!def || def.mode !== "coop") throw new CoopInviteConflictError();
      const current = hydrate(session, def);
      const next: RoundState = { ...current, revision: current.revision + 1 };
      const oldTeamB = await client.query<{
        broadcaster_id: string;
        revoked_at: Date | null;
      }>(
        `SELECT broadcaster_id, revoked_at FROM session_channels
         WHERE session_id = $1 AND team_role = 'B' FOR UPDATE`,
        [invite.session_id],
      );
      if (oldTeamB.rows[0] && oldTeamB.rows[0].revoked_at === null) {
        throw new CoopInviteConflictError();
      }
      if (oldTeamB.rows[0]) {
        await client.query(
          `UPDATE session_channels SET broadcaster_id = $2, consented_at = now(), revoked_at = NULL
           WHERE session_id = $1 AND team_role = 'B'`,
          [invite.session_id, input.inviteeTwitchId],
        );
      } else {
        await client.query(
          `INSERT INTO session_channels (session_id, broadcaster_id, team_role)
           VALUES ($1, $2, 'B')`,
          [invite.session_id, input.inviteeTwitchId],
        );
      }
      await client.query(
        `UPDATE coop_invites SET status = 'ACCEPTED', accepted_at = now(), accept_idempotency_key = $2
         WHERE id = $1`,
        [input.inviteId, input.idempotencyKey],
      );
      await client.query(
        `UPDATE game_sessions SET phase = 'READY', revision = $2, state = $3::jsonb, updated_at = now()
         WHERE id = $1`,
        [invite.session_id, next.revision, JSON.stringify(emptyState(next))],
      );
      await writeEvent(
        client,
        invite.session_id,
        next.revision,
        "COOP_PARTNER_ACCEPTED",
        input.inviteeTwitchId,
        snapshot(next, "READY", this.now(), "A"),
        snapshot(next, "READY", this.now(), "B"),
      );
      await client.query("COMMIT");
      return {
        sessionId: invite.session_id,
        revision: next.revision,
        alreadyAccepted: false,
      };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async declineCoopInvitation(
    input: DeclineCoopInvitationInput,
  ): Promise<{ sessionId: string; alreadyDeclined: boolean } | null> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<{
        id: string;
        session_id: string;
        invitee_twitch_id: string;
        token_hash: string;
        status: string;
        expires_at: Date;
        decline_idempotency_key: string | null;
      }>(
        `SELECT id, session_id, invitee_twitch_id, token_hash, status, expires_at,
                decline_idempotency_key
         FROM coop_invites WHERE id = $1 FOR UPDATE`,
        [input.inviteId],
      );
      const invite = result.rows[0];
      if (
        !invite ||
        invite.invitee_twitch_id !== input.inviteeTwitchId ||
        !constantTimeEqual(invite.token_hash, input.tokenHash)
      ) {
        await client.query("COMMIT");
        return null;
      }
      if (invite.status === "DECLINED") {
        if (invite.decline_idempotency_key !== input.idempotencyKey) {
          throw new CoopInviteConflictError();
        }
        await client.query("COMMIT");
        return { sessionId: invite.session_id, alreadyDeclined: true };
      }
      if (invite.status === "EXPIRED") {
        await client.query("COMMIT");
        throw new CoopInviteExpiredError();
      }
      if (invite.status !== "PENDING") throw new CoopInviteConflictError();
      if (invite.expires_at.getTime() <= this.now()) {
        await client.query(
          "UPDATE coop_invites SET status = 'EXPIRED' WHERE id = $1 AND status = 'PENDING'",
          [input.inviteId],
        );
        await client.query("COMMIT");
        throw new CoopInviteExpiredError();
      }
      await client.query(
        `UPDATE coop_invites
         SET status = 'DECLINED', declined_at = now(), decline_idempotency_key = $2
         WHERE id = $1`,
        [input.inviteId, input.idempotencyKey],
      );
      await client.query("COMMIT");
      return { sessionId: invite.session_id, alreadyDeclined: false };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async rejoinCoopSession(input: {
    readonly sessionId: string;
    readonly broadcasterId: string;
  }): Promise<{ snapshot: RoundSnapshot; alreadyRejoined: boolean } | null> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const sessionResult = await client.query<SessionRow>(
        "SELECT * FROM game_sessions WHERE id = $1 FOR UPDATE",
        [input.sessionId],
      );
      const row = sessionResult.rows[0];
      if (!row || !["READY", "ACTIVE", "PAUSED"].includes(row.phase)) {
        await client.query("COMMIT");
        return null;
      }
      const def = findAuthoredCase(row.case_id);
      if (!def || def.mode !== "coop") {
        await client.query("COMMIT");
        return null;
      }
      const memberResult = await client.query<{
        broadcaster_id: string;
        revoked_at: Date | null;
      }>(
        `SELECT broadcaster_id, revoked_at FROM session_channels
         WHERE session_id = $1 AND team_role = 'B' FOR UPDATE`,
        [input.sessionId],
      );
      const member = memberResult.rows[0];
      if (!member || member.broadcaster_id !== input.broadcasterId) {
        await client.query("COMMIT");
        return null;
      }
      const account = await client.query(
        `SELECT 1 FROM twitch_accounts
         WHERE twitch_user_id = $1 AND revoked_at IS NULL`,
        [input.broadcasterId],
      );
      if (!account.rowCount) {
        await client.query("COMMIT");
        return null;
      }
      const acceptedConsent = await client.query(
        `SELECT 1 FROM coop_invites
         WHERE session_id = $1 AND invitee_twitch_id = $2 AND status = 'ACCEPTED'
         LIMIT 1`,
        [input.sessionId, input.broadcasterId],
      );
      if (!acceptedConsent.rowCount) {
        await client.query("COMMIT");
        return null;
      }
      const current = hydrate(row, def);
      if (member.revoked_at === null) {
        await client.query("COMMIT");
        return {
          snapshot: snapshot(current, row.phase, this.now(), "B"),
          alreadyRejoined: true,
        };
      }
      await client.query(
        `UPDATE session_channels SET revoked_at = NULL
         WHERE session_id = $1 AND team_role = 'B' AND broadcaster_id = $2`,
        [input.sessionId, input.broadcasterId],
      );
      const next: RoundState = { ...current, revision: current.revision + 1 };
      await client.query(
        `UPDATE game_sessions SET revision = $2, state = $3::jsonb, updated_at = now()
         WHERE id = $1`,
        [input.sessionId, next.revision, JSON.stringify(emptyState(next))],
      );
      await writeEvent(
        client,
        input.sessionId,
        next.revision,
        "COOP_PARTNER_REJOINED",
        input.broadcasterId,
        snapshot(next, row.phase, this.now(), "A"),
        snapshot(next, row.phase, this.now(), "B"),
      );
      await client.query("COMMIT");
      return {
        snapshot: snapshot(next, row.phase, this.now(), "B"),
        alreadyRejoined: false,
      };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async create(input: CreateRoundInput): Promise<RoundSnapshot> {
    const def = findAuthoredCase(input.caseId);
    if (!def) throw new UnknownAuthoredCaseError();
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        input.hostTwitchId,
      ]);
      await this.registerCase(client, def);

      const existingByKey = await client.query<SessionRow>(
        `SELECT * FROM game_sessions
         WHERE host_twitch_id = $1 AND create_idempotency_key = $2
         FOR UPDATE`,
        [input.hostTwitchId, input.idempotencyKey],
      );
      const existingOpen =
        existingByKey.rows[0] ??
        (
          await client.query<SessionRow>(
            `SELECT * FROM game_sessions
             WHERE host_twitch_id = $1 AND phase IN ('COOP_WAITING', 'READY', 'ACTIVE', 'PAUSED')
             ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
            [input.hostTwitchId],
          )
        ).rows[0];
      if (existingOpen) {
        if (existingOpen.case_id !== input.caseId)
          throw new IdempotencyConflictError();
        const existingDef = findAuthoredCase(existingOpen.case_id);
        if (
          !existingDef ||
          existingDef.version !== existingOpen.case_version ||
          contentHash(existingDef) !== existingOpen.case_content_hash
        ) {
          throw new Error("Pinned case content is unavailable.");
        }
        const result = snapshot(
          hydrate(existingOpen, existingDef),
          existingOpen.phase,
          this.now(),
          "A",
        );
        await client.query("COMMIT");
        return result;
      }

      const sessionId = randomUUID();
      const initial = createRound(def, { sessionId, source: "live" });
      const state = setPaused(initial, true, this.now());
      const phase: SessionPhase =
        def.mode === "coop" ? "COOP_WAITING" : "READY";
      const hash = contentHash(def);
      await client.query(
        `INSERT INTO game_sessions (
           id, host_twitch_id, case_id, case_version, case_content_hash, phase, source,
           revision, state, create_idempotency_key
         ) VALUES ($1, $2, $3, $4, $5, $6, 'live', $7, $8::jsonb, $9)`,
        [
          sessionId,
          input.hostTwitchId,
          def.id,
          def.version,
          hash,
          phase,
          state.revision,
          JSON.stringify(emptyState(state)),
          input.idempotencyKey,
        ],
      );
      await client.query(
        `INSERT INTO session_channels (session_id, broadcaster_id, team_role)
         VALUES ($1, $2, 'A') ON CONFLICT DO NOTHING`,
        [sessionId, input.hostTwitchId],
      );
      const result = snapshot(state, phase, this.now());
      await writeEvent(
        client,
        sessionId,
        state.revision,
        "SESSION_CREATED",
        input.hostTwitchId,
        result,
        snapshot(state, phase, this.now(), "B"),
      );
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async snapshotForHost(
    sessionId: string,
    hostTwitchId: string,
  ): Promise<RoundSnapshot | null> {
    const result = await this.pool.query<SessionRow>(
      `SELECT * FROM game_sessions WHERE id = $1 AND host_twitch_id = $2`,
      [sessionId, hostTwitchId],
    );
    const row = result.rows[0];
    if (!row) return null;
    const def = findAuthoredCase(row.case_id);
    if (
      !def ||
      def.version !== row.case_version ||
      contentHash(def) !== row.case_content_hash
    ) {
      throw new Error("Pinned case content is unavailable.");
    }
    return snapshot(hydrate(row, def), row.phase, this.now(), "A");
  }

  async snapshotForOverlay(
    sessionId: string,
    tokenHash: string,
  ): Promise<RoundSnapshot | null> {
    const result = await this.pool.query<SessionRow & { view: string }>(
      `SELECT s.*, o.view
       FROM overlay_credentials o
       JOIN game_sessions s ON s.id = o.session_id
       WHERE o.session_id = $1 AND o.token_hash = $2
         AND o.view IN ('overlay', 'team_a', 'team_b') AND o.revoked_at IS NULL AND o.expires_at > now()`,
      [sessionId, tokenHash],
    );
    const row = result.rows[0];
    if (!row) return null;
    const def = findAuthoredCase(row.case_id);
    if (
      !def ||
      def.version !== row.case_version ||
      contentHash(def) !== row.case_content_hash
    ) {
      throw new Error("Pinned case content is unavailable.");
    }
    const team = row.view === "team_b" ? "B" : "A";
    return snapshot(hydrate(row, def), row.phase, this.now(), team);
  }

  async snapshotForParticipant(
    sessionId: string,
    twitchUserId: string,
  ): Promise<RoundSnapshot | null> {
    const result = await this.pool.query<SessionRow & { team_role: TeamRole }>(
      `SELECT s.*, sc.team_role
       FROM game_sessions s
       JOIN session_channels sc ON sc.session_id = s.id
       WHERE s.id = $1 AND sc.broadcaster_id = $2 AND sc.revoked_at IS NULL`,
      [sessionId, twitchUserId],
    );
    const row = result.rows[0];
    if (!row) return null;
    const def = findAuthoredCase(row.case_id);
    if (
      !def ||
      def.version !== row.case_version ||
      contentHash(def) !== row.case_content_hash
    ) {
      throw new Error("Pinned case content is unavailable.");
    }
    return snapshot(hydrate(row, def), row.phase, this.now(), row.team_role);
  }

  async hostTwitchUserIdForSession(sessionId: string): Promise<string | null> {
    const result = await this.pool.query<{ host_twitch_id: string }>(
      "SELECT host_twitch_id FROM game_sessions WHERE id = $1",
      [sessionId],
    );
    return result.rows[0]?.host_twitch_id ?? null;
  }

  async diagnosticsForParticipant(
    twitchUserId: string,
  ): Promise<SessionOperationalDiagnostic[]> {
    const result = await this.pool.query<{
      id: string;
      case_id: string;
      phase: SessionPhase;
      revision: string;
      pending_outbox_count: string;
    }>(
      `SELECT s.id, s.case_id, s.phase, s.revision::text,
              count(o.id) FILTER (WHERE o.published_at IS NULL)::text AS pending_outbox_count
       FROM session_channels sc
       JOIN game_sessions s ON s.id = sc.session_id
       LEFT JOIN outbox o ON o.session_id = s.id
       WHERE sc.broadcaster_id = $1 AND sc.revoked_at IS NULL
       GROUP BY s.id, s.case_id, s.phase, s.revision, s.updated_at
       ORDER BY s.updated_at DESC
       LIMIT 50`,
      [twitchUserId],
    );
    return result.rows.map((row) => ({
      sessionId: row.id,
      caseId: row.case_id,
      phase: row.phase,
      revision: Number(row.revision),
      pendingOutboxCount: Number(row.pending_outbox_count),
    }));
  }

  async pauseActiveSessionsForHost(hostTwitchId: string): Promise<number> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const selected = await client.query<SessionRow>(
        `SELECT * FROM game_sessions
         WHERE host_twitch_id = $1 AND phase = 'ACTIVE'
         ORDER BY id FOR UPDATE`,
        [hostTwitchId],
      );
      for (const row of selected.rows) {
        const def = findAuthoredCase(row.case_id);
        if (
          !def ||
          def.version !== row.case_version ||
          contentHash(def) !== row.case_content_hash
        ) {
          throw new Error("Pinned case content is unavailable.");
        }
        const current = hydrate(row, def);
        const next = setPaused(current, true, this.now());
        await client.query(
          `UPDATE game_sessions SET phase = 'PAUSED', revision = $2, state = $3::jsonb, updated_at = now()
           WHERE id = $1`,
          [row.id, next.revision, JSON.stringify(emptyState(next))],
        );
        await writeEvent(
          client,
          row.id,
          next.revision,
          "HOST_AUTHORIZATION_REVOKED",
          hostTwitchId,
          snapshot(next, "PAUSED", this.now(), "A"),
          snapshot(next, "PAUSED", this.now(), "B"),
        );
      }
      await client.query("COMMIT");
      return selected.rows.length;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async findOpenSessionForBroadcaster(
    broadcasterId: string,
  ): Promise<string | null> {
    const result = await this.pool.query<{ id: string }>(
      `SELECT s.id FROM game_sessions s
       JOIN session_channels sc ON sc.session_id = s.id
       WHERE sc.broadcaster_id = $1 AND sc.revoked_at IS NULL
         AND s.phase IN ('COOP_WAITING', 'READY', 'ACTIVE', 'PAUSED')
       ORDER BY s.created_at DESC LIMIT 1`,
      [broadcasterId],
    );
    return result.rows[0]?.id ?? null;
  }

  async findActiveSessionForBroadcaster(
    broadcasterId: string,
  ): Promise<{ sessionId: string; teamRole: TeamRole } | null> {
    const result = await this.pool.query<{ id: string; team_role: TeamRole }>(
      `SELECT s.id, sc.team_role FROM game_sessions s
       JOIN session_channels sc ON sc.session_id = s.id
       WHERE sc.broadcaster_id = $1 AND sc.revoked_at IS NULL AND s.phase = 'ACTIVE'
       ORDER BY s.created_at DESC LIMIT 1`,
      [broadcasterId],
    );
    const row = result.rows[0];
    return row ? { sessionId: row.id, teamRole: row.team_role } : null;
  }

  async applyInput(input: ApplyRoundInput): Promise<CommandResult> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const selected = await client.query<SessionRow>(
        "SELECT * FROM game_sessions WHERE id = $1 FOR UPDATE",
        [input.sessionId],
      );
      const row = selected.rows[0];
      if (!row) {
        await client.query("COMMIT");
        return publicErrorResult();
      }
      const def = findAuthoredCase(row.case_id);
      if (
        !def ||
        def.version !== row.case_version ||
        contentHash(def) !== row.case_content_hash
      ) {
        throw new Error("Pinned case content is unavailable.");
      }
      const state = hydrate(row, def);
      if (
        input.source === "twitch" &&
        (input.leaderOwnerId !== undefined || input.leaderEpoch !== undefined)
      ) {
        if (!input.leaderOwnerId || !Number.isSafeInteger(input.leaderEpoch)) {
          await client.query("COMMIT");
          return publicErrorResult(state.revision);
        }
        const leader = await client.query<{
          epoch: string | number;
          owner_id: string | null;
        }>(
          `SELECT epoch, owner_id FROM eventsub_leader_state
           WHERE name = 'eventsub-ingest' FOR SHARE`,
        );
        if (
          Number(leader.rows[0]?.epoch) !== input.leaderEpoch ||
          leader.rows[0]?.owner_id !== input.leaderOwnerId
        ) {
          await client.query("COMMIT");
          return publicErrorResult(state.revision);
        }
      }
      let team: TeamRole;
      if (input.source === "host") {
        if (
          !input.actorTwitchId ||
          input.actorTwitchId !== row.host_twitch_id
        ) {
          await client.query("COMMIT");
          return publicErrorResult(state.revision);
        }
        team = "A";
      } else {
        const channelId = input.channelId ?? input.originBroadcasterId;
        if (!channelId) {
          await client.query("COMMIT");
          return publicErrorResult(state.revision);
        }
        const membership = await client.query<{ team_role: TeamRole }>(
          `SELECT team_role FROM session_channels
           WHERE session_id = $1 AND broadcaster_id = $2 AND revoked_at IS NULL`,
          [input.sessionId, channelId],
        );
        const role = membership.rows[0]?.team_role;
        if (role !== "A" && role !== "B") {
          await client.query("COMMIT");
          return publicErrorResult(state.revision);
        }
        team = role;
      }
      const fingerprint = applyInputFingerprint(input);
      const requestIds = {
        primary: scopedInputId(input),
        legacy: input.inputId,
      };
      const duplicate = await this.findDuplicate(client, {
        sessionId: input.sessionId,
        primaryInputId: requestIds.primary,
        legacyInputIds: [requestIds.legacy],
        ...(input.eventSubMessageId
          ? { eventSubMessageId: input.eventSubMessageId }
          : {}),
        actorTwitchId: input.actorTwitchId,
        fingerprint,
        legacySummary: legacyActionSummary(input.text),
        legacyTypeAllowed: isLegacyInputType(input, requestIds.legacy),
        revision: state.revision,
      });
      if (duplicate) {
        await client.query("COMMIT");
        return duplicate;
      }
      const transition = applyCommand(state, input.text, this.now(), {
        actor: input.source,
        team,
      });
      const result = transition.result;
      const persistedId = `${input.sessionId}:${requestIds.primary}`;
      const pending: CommandResult = {
        code: "NOT_AVAILABLE",
        reason: null,
        message: "Processing input.",
        missing: [],
        revision: state.revision,
      };
      const inserted = await client.query(
        `INSERT INTO processed_inputs (
           input_id, eventsub_message_id, session_id, actor_twitch_id,
           action_summary, request_fingerprint, result
         ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
         ON CONFLICT DO NOTHING RETURNING input_id`,
        [
          persistedId,
          input.eventSubMessageId ?? null,
          input.sessionId,
          input.actorTwitchId,
          sanitizedActionSummary(input.text, result),
          fingerprint,
          JSON.stringify(pending),
        ],
      );
      if (inserted.rowCount !== 1) {
        const duplicateAfterRace = await this.findDuplicate(client, {
          sessionId: input.sessionId,
          primaryInputId: requestIds.primary,
          legacyInputIds: [requestIds.legacy],
          ...(input.eventSubMessageId
            ? { eventSubMessageId: input.eventSubMessageId }
            : {}),
          actorTwitchId: input.actorTwitchId,
          fingerprint,
          legacySummary: legacyActionSummary(input.text),
          legacyTypeAllowed: isLegacyInputType(input, requestIds.legacy),
          revision: state.revision,
        });
        await client.query("COMMIT");
        return duplicateAfterRace ?? conflictResult(state.revision);
      }

      let phase = row.phase;
      if (transition.state.solvedBy !== null) phase = "RESOLVED";
      if (transition.state.revision !== state.revision) {
        const nextSnapshotA = snapshot(
          transition.state,
          phase,
          this.now(),
          "A",
        );
        const nextSnapshotB = snapshot(
          transition.state,
          phase,
          this.now(),
          "B",
        );
        await client.query(
          `UPDATE game_sessions
           SET state = $2::jsonb, revision = $3, phase = $4, updated_at = now()
           WHERE id = $1`,
          [
            input.sessionId,
            JSON.stringify(emptyState(transition.state)),
            transition.state.revision,
            phase,
          ],
        );
        await writeEvent(
          client,
          input.sessionId,
          transition.state.revision,
          "ROUND_TRANSITION",
          input.actorTwitchId,
          nextSnapshotA,
          nextSnapshotB,
        );
        if (
          input.source === "twitch" &&
          input.actorTwitchId &&
          input.sourceMessageId
        ) {
          const contribution = contributionKind(input.text);
          await client.query(
            `INSERT INTO contributions (
               session_id, event_id, actor_twitch_id, kind, origin_broadcaster_id, evidence_id, source_message_id
             ) VALUES (
               $1,
               (SELECT event_id FROM session_events WHERE session_id = $1 AND revision = $2),
               $3, $4, $5, $6, $7
             ) ON CONFLICT DO NOTHING`,
            [
              input.sessionId,
              transition.state.revision,
              input.actorTwitchId,
              contribution.kind,
              input.originBroadcasterId ?? row.host_twitch_id,
              contribution.evidenceId,
              input.sourceMessageId,
            ],
          );
        }
      }
      await client.query(
        "UPDATE processed_inputs SET result = $2::jsonb WHERE input_id = $1",
        [persistedId, JSON.stringify(result)],
      );
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async control(input: ControlRoundInput): Promise<CommandResult> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const selected = await client.query<SessionRow>(
        `SELECT * FROM game_sessions WHERE id = $1 AND host_twitch_id = $2 FOR UPDATE`,
        [input.sessionId, input.hostTwitchId],
      );
      const row = selected.rows[0];
      if (!row) {
        await client.query("COMMIT");
        return publicErrorResult();
      }
      const def = findAuthoredCase(row.case_id);
      if (
        !def ||
        def.version !== row.case_version ||
        contentHash(def) !== row.case_content_hash
      ) {
        throw new Error("Pinned case content is unavailable.");
      }
      const current = hydrate(row, def);
      const primaryInputId = `control:${input.hostTwitchId}:${input.idempotencyKey}`;
      const legacyInputId = `control:${input.idempotencyKey}`;
      const fingerprint = controlFingerprint(input);
      const duplicate = await this.findDuplicate(client, {
        sessionId: input.sessionId,
        primaryInputId,
        legacyInputIds: [legacyInputId],
        actorTwitchId: input.hostTwitchId,
        fingerprint,
        legacySummary: input.action,
        legacyTypeAllowed: true,
        revision: current.revision,
      });
      if (duplicate) {
        await client.query("COMMIT");
        return duplicate;
      }
      const persistedId = `${input.sessionId}:${primaryInputId}`;
      let next = current;
      let phase = row.phase;
      let result: CommandResult;
      switch (input.action) {
        case "start":
          if (row.phase === "COOP_WAITING") {
            result = {
              code: "NOT_AVAILABLE",
              reason: "TEAM_REQUIRED",
              message:
                "The second broadcaster must accept the invitation first.",
              missing: [],
              revision: current.revision,
            };
          } else if (row.phase === "READY") {
            next = setPaused(current, false, this.now());
            phase = "ACTIVE";
            result = controlResult(
              "ACCEPTED_NEW",
              "Round started.",
              next.revision,
            );
          } else {
            result = controlResult(
              "ACCEPTED_ALREADY_KNOWN",
              "Round is already started.",
              current.revision,
            );
          }
          break;
        case "pause":
          if (row.phase === "ACTIVE") {
            next = setPaused(current, true, this.now());
            phase = "PAUSED";
            result = controlResult(
              "ACCEPTED_NEW",
              "Round paused.",
              next.revision,
            );
          } else {
            result = controlResult(
              "ACCEPTED_ALREADY_KNOWN",
              "Round is not active.",
              current.revision,
            );
          }
          break;
        case "resume":
          if (row.phase === "PAUSED") {
            next = setPaused(current, false, this.now());
            phase = "ACTIVE";
            result = controlResult(
              "ACCEPTED_NEW",
              "Round resumed.",
              next.revision,
            );
          } else {
            result = controlResult(
              "ACCEPTED_ALREADY_KNOWN",
              "Round is not paused.",
              current.revision,
            );
          }
          break;
        case "restart":
          if (row.phase === "COOP_WAITING") {
            result = {
              code: "NOT_AVAILABLE",
              reason: "TEAM_REQUIRED",
              message:
                "The second broadcaster must accept the invitation first.",
              missing: [],
              revision: current.revision,
            };
          } else if (OPEN_PHASES.has(row.phase)) {
            next = restartRound(current);
            phase = "ACTIVE";
            result = controlResult(
              "ACCEPTED_NEW",
              "Round restarted.",
              next.revision,
            );
          } else {
            result = controlResult(
              "ACCEPTED_ALREADY_KNOWN",
              "A finished round cannot be restarted.",
              current.revision,
            );
          }
          break;
        case "stop":
          if (
            row.phase === "CANCELLED" ||
            row.phase === "PARTIAL" ||
            row.phase === "RESOLVED"
          ) {
            result = controlResult(
              "ACCEPTED_ALREADY_KNOWN",
              "Round is already stopped.",
              current.revision,
            );
          } else {
            next = current.paused
              ? { ...current, revision: current.revision + 1 }
              : setPaused(current, true, this.now());
            phase = hasMeaningfulProgress(current) ? "PARTIAL" : "CANCELLED";
            result = controlResult(
              "ACCEPTED_NEW",
              "Round stopped.",
              next.revision,
            );
          }
          break;
      }
      const pending = controlResult(
        "NOT_AVAILABLE",
        "Processing control.",
        current.revision,
      );
      const inserted = await client.query(
        `INSERT INTO processed_inputs (
           input_id, session_id, actor_twitch_id, action_summary,
           request_fingerprint, result
         ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)
         ON CONFLICT DO NOTHING RETURNING input_id`,
        [
          persistedId,
          input.sessionId,
          input.hostTwitchId,
          input.action,
          fingerprint,
          JSON.stringify(pending),
        ],
      );
      if (inserted.rowCount !== 1) {
        const dupe = await this.findDuplicate(client, {
          sessionId: input.sessionId,
          primaryInputId,
          legacyInputIds: [legacyInputId],
          actorTwitchId: input.hostTwitchId,
          fingerprint,
          legacySummary: input.action,
          legacyTypeAllowed: true,
          revision: current.revision,
        });
        await client.query("COMMIT");
        return dupe ?? conflictResult(current.revision);
      }
      if (next.revision !== current.revision) {
        const viewA = snapshot(next, phase, this.now(), "A");
        const viewB = snapshot(next, phase, this.now(), "B");
        await client.query(
          `UPDATE game_sessions
           SET state = $2::jsonb, revision = $3, phase = $4, updated_at = now()
           WHERE id = $1`,
          [
            input.sessionId,
            JSON.stringify(emptyState(next)),
            next.revision,
            phase,
          ],
        );
        await writeEvent(
          client,
          input.sessionId,
          next.revision,
          `SESSION_${input.action.toUpperCase()}`,
          input.hostTwitchId,
          viewA,
          viewB,
        );
      }
      await client.query(
        "UPDATE processed_inputs SET result = $2::jsonb WHERE input_id = $1",
        [persistedId, JSON.stringify(result)],
      );
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async claimOutboxBatch(limit = 50): Promise<OutboxMessage[]> {
    const boundedLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const selected = await client.query<{
        id: number;
        event_id: string;
        session_id: string;
        revision: string;
        payload: unknown;
        previous_payload: unknown | null;
      }>(
        `SELECT ob.id, ob.event_id, ob.session_id,
                ob.revision, ob.payload, previous.payload AS previous_payload
         FROM outbox AS ob
         LEFT JOIN LATERAL (
           SELECT prior.payload
           FROM outbox AS prior
           WHERE prior.session_id = ob.session_id
             AND prior.revision = ob.revision - 1
           LIMIT 1
         ) AS previous ON true
         WHERE ob.published_at IS NULL AND ob.next_attempt_at <= now()
         ORDER BY ob.id
         LIMIT $1
         FOR UPDATE OF ob SKIP LOCKED`,
        [boundedLimit],
      );
      for (const row of selected.rows) {
        await client.query(
          `UPDATE outbox SET attempts = attempts + 1, next_attempt_at = now() + interval '5 seconds'
           WHERE id = $1`,
          [row.id],
        );
      }
      await client.query("COMMIT");
      return selected.rows.map((row) => {
        const views = outboxViews(row.payload);
        const previous = row.previous_payload
          ? outboxViews(row.previous_payload)
          : null;
        return {
          id: row.id,
          eventId: row.event_id,
          sessionId: row.session_id,
          revision: Number(row.revision),
          snapshotA: views.A,
          snapshotB: views.B,
          previousSnapshotA: previous?.A ?? null,
          previousSnapshotB: previous?.B ?? null,
        };
      });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async markOutboxPublished(id: number): Promise<void> {
    await this.pool.query(
      "UPDATE outbox SET published_at = now() WHERE id = $1 AND published_at IS NULL",
      [id],
    );
  }

  async deferOutbox(id: number): Promise<void> {
    await this.pool.query(
      `UPDATE outbox
       SET next_attempt_at = now() + interval '5 seconds'
       WHERE id = $1 AND published_at IS NULL`,
      [id],
    );
  }

  private async registerCase(
    client: PoolClient,
    def: CaseDefinition,
  ): Promise<void> {
    const hash = contentHash(def);
    await client.query(
      `INSERT INTO cases (case_id, version, content_hash, public_metadata)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (case_id, version) DO NOTHING`,
      [def.id, def.version, hash, JSON.stringify(publicCaseMetadata(def))],
    );
    const stored = await client.query<{ content_hash: string }>(
      "SELECT content_hash FROM cases WHERE case_id = $1 AND version = $2",
      [def.id, def.version],
    );
    if (stored.rows[0]?.content_hash !== hash) {
      throw new Error("A case version already exists with different content.");
    }
  }

  private async findDuplicate(
    client: PoolClient,
    input: {
      readonly sessionId: string;
      readonly primaryInputId: string;
      readonly legacyInputIds: readonly string[];
      readonly eventSubMessageId?: string;
      readonly actorTwitchId: string | null;
      readonly fingerprint: string;
      readonly legacySummary: string;
      readonly legacyTypeAllowed: boolean;
      readonly revision: number;
    },
  ): Promise<CommandResult | null> {
    const primaryInputId = `${input.sessionId}:${input.primaryInputId}`;
    const candidateInputIds = [
      primaryInputId,
      ...input.legacyInputIds.map((id) => `${input.sessionId}:${id}`),
    ];
    const result = await client.query<{
      input_id: string;
      session_id: string;
      eventsub_message_id: string | null;
      actor_twitch_id: string | null;
      action_summary: string;
      request_fingerprint: string | null;
      result: CommandResult;
    }>(
      `SELECT input_id, session_id, eventsub_message_id, actor_twitch_id,
              action_summary, request_fingerprint, result
       FROM processed_inputs
       WHERE input_id = ANY($1::text[])
          OR ($2::text IS NOT NULL AND eventsub_message_id = $2)`,
      [candidateInputIds, input.eventSubMessageId ?? null],
    );
    const rows = result.rows;
    if (rows.length === 0) return null;

    const sameRequest = (row: (typeof rows)[number]): boolean => {
      if (
        row.session_id !== input.sessionId ||
        row.actor_twitch_id !== input.actorTwitchId
      ) {
        return false;
      }
      if (row.request_fingerprint !== null)
        return row.request_fingerprint === input.fingerprint;
      // Legacy rows only persisted a 120-character summary, so a full-length
      // summary cannot prove that the unrecorded suffix matches this request.
      if (row.action_summary.length >= 120) return false;
      return row.action_summary === input.legacySummary;
    };

    const eventSubRow = input.eventSubMessageId
      ? rows.find((row) => row.eventsub_message_id === input.eventSubMessageId)
      : undefined;
    if (eventSubRow && !sameRequest(eventSubRow))
      return conflictResult(input.revision);

    const primaryRow = rows.find((row) => row.input_id === primaryInputId);
    if (primaryRow && !sameRequest(primaryRow))
      return conflictResult(input.revision);

    const legacyRow = rows.find((row) =>
      input.legacyInputIds.some(
        (id) => row.input_id === `${input.sessionId}:${id}`,
      ),
    );
    if (
      legacyRow &&
      input.legacyTypeAllowed &&
      legacyRow.actor_twitch_id === input.actorTwitchId
    ) {
      if (!sameRequest(legacyRow)) return conflictResult(input.revision);
    }

    if (primaryRow) return primaryRow.result;
    if (eventSubRow) return eventSubRow.result;
    if (
      legacyRow &&
      input.legacyTypeAllowed &&
      legacyRow.actor_twitch_id === input.actorTwitchId
    ) {
      return legacyRow.result;
    }
    return null;
  }
}
