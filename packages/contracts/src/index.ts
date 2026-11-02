import { z } from "zod";

// Versioned transport envelope. Case truth and gameplay rules belong to authored
// case data and the deterministic engine, not to client claims.
export const snapshotEnvelopeSchema = z
  .object({
    protocolVersion: z.literal(1),
    revision: z.number().int().nonnegative(),
  })
  .strict();

export type SnapshotEnvelope = z.infer<typeof snapshotEnvelopeSchema>;

// Result codes from the engine spec (02_GAMEPLAY). Only ACCEPTED_NEW makes a new
// game transition; duplicates must not repeat reveals or credit.
export const resultCodeSchema = z.enum([
  "ACCEPTED_NEW",
  "ACCEPTED_ALREADY_KNOWN",
  "INVALID",
  "NOT_AVAILABLE",
  "RATE_LIMITED",
  "NOT_AUTHORIZED",
  "IDEMPOTENCY_CONFLICT",
  "PAUSED",
  "CONTENT_ERROR",
]);
export type ResultCode = z.infer<typeof resultCodeSchema>;

export const resultReasonSchema = z.enum([
  "BAD_SYNTAX",
  "INPUT_TOO_LONG",
  "TOO_MANY_TOKENS",
  "UNKNOWN_COMMAND",
  "UNKNOWN_TARGET",
  "AMBIGUOUS_TARGET",
  "NOT_UNLOCKED",
  "NO_CONNECTION",
  "SAME_TARGET",
  "UNKNOWN_VERDICT",
  "VERDICT_NOT_SUPPORTED",
  "VERDICT_UNPROVEN",
  "ROUND_RESOLVED",
  "SEQUENCE_INVALID",
  "CODE_INVALID",
  "UNKNOWN_THEORY",
  "CHALLENGE_UNSUPPORTED",
  "TEAM_REQUIRED",
  "IDEMPOTENCY_KEY_REUSED",
  "SHARE_NOT_ALLOWED",
  "HINTS_EXHAUSTED",
]);
export type ResultReason = z.infer<typeof resultReasonSchema>;

export const commandResultSchema = z
  .object({
    code: resultCodeSchema,
    reason: resultReasonSchema.nullable(),
    message: z.string(),
    // Kinds of proof still missing (categories only, never the answer).
    missing: z.array(z.string()),
    revision: z.number().int().nonnegative(),
  })
  .strict();
export type CommandResult = z.infer<typeof commandResultSchema>;

export const MAX_COMMAND_LENGTH = 120;
export const MAX_COMMAND_TOKENS = 8;

export const sessionIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
export const idempotencyKeySchema = z.string().regex(/^[A-Za-z0-9_-]{16,128}$/);

// Command text is parsed by the engine: `inspect CAM`, `link CAM_R07 SCHEDULE_R07`, `solve <verdict-id>`.
export const submitCommandSchema = z
  .object({
    sessionId: sessionIdSchema,
    text: z.string().max(MAX_COMMAND_LENGTH),
    idempotencyKey: idempotencyKeySchema.optional(),
  })
  .strict();
export type SubmitCommand = z.infer<typeof submitCommandSchema>;

export const sessionControlSchema = z
  .object({
    sessionId: sessionIdSchema,
    action: z.enum(["start", "pause", "resume", "restart", "stop"]),
    idempotencyKey: idempotencyKeySchema.optional(),
  })
  .strict();
export type SessionControl = z.infer<typeof sessionControlSchema>;

export const joinSessionSchema = z
  .object({
    sessionId: sessionIdSchema,
  })
  .strict();
export type JoinSession = z.infer<typeof joinSessionSchema>;

export const createSessionSchema = z
  .object({
    caseId: z.string().regex(/^[QMC]\d{2}_[A-Z0-9_]{1,56}$/),
  })
  .strict();
export type CreateSession = z.infer<typeof createSessionSchema>;

export const teamRoleSchema = z.enum(["A", "B"]);
export type TeamRole = z.infer<typeof teamRoleSchema>;

export const twitchLoginSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/^@/, "").toLowerCase())
  .pipe(
    z
      .string()
      .min(1)
      .max(25)
      .regex(/^[a-z0-9_]+$/),
  );

export const createCoopInviteSchema = z.union([
  z
    .object({
      sessionId: sessionIdSchema,
      inviteeTwitchId: z.string().regex(/^\d{1,32}$/),
    })
    .strict(),
  z
    .object({
      sessionId: sessionIdSchema,
      inviteeLogin: twitchLoginSchema,
    })
    .strict(),
]);
export type CreateCoopInvite = z.infer<typeof createCoopInviteSchema>;

export const sessionListQuerySchema = z
  .object({
    status: z.enum(["open", "all"]).default("open"),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();
export type SessionListQuery = z.infer<typeof sessionListQuerySchema>;

export interface SessionSummary {
  readonly sessionId: string;
  readonly caseId: string;
  readonly title: string;
  readonly phase: SessionPhase;
  readonly revision: number;
  readonly team: TeamRole;
  readonly role: "host" | "partner";
  readonly needsRejoin: boolean;
  readonly updatedAt: string;
}

export const acceptCoopInviteSchema = z
  .object({
    token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  })
  .strict();
export type AcceptCoopInvite = z.infer<typeof acceptCoopInviteSchema>;
export const declineCoopInviteSchema = acceptCoopInviteSchema;
export type DeclineCoopInvite = z.infer<typeof declineCoopInviteSchema>;

export const coopInviteIdSchema = z.string().uuid();

export const twitchIdentitySchema = z
  .object({
    id: z.string().regex(/^\d{1,32}$/),
    login: z
      .string()
      .min(1)
      .max(25)
      .regex(/^[A-Za-z0-9_]+$/),
    displayName: z.string().min(1).max(50),
  })
  .strict();
export type TwitchIdentity = z.infer<typeof twitchIdentitySchema>;

// Only the Twitch adapter may create this normalized envelope. Browsers must never
// submit this shape to a public mutation endpoint.
export const chatActionEnvelopeSchema = z
  .object({
    provider: z.literal("twitch"),
    eventSubMessageId: z.string().min(1).max(128),
    twitchMessageId: z.string().min(1).max(128),
    sourceMessageId: z.string().min(1).max(128).nullable().optional(),
    broadcasterId: z.string().regex(/^\d{1,32}$/),
    originBroadcasterId: z.string().regex(/^\d{1,32}$/),
    actorTwitchId: z.string().regex(/^\d{1,32}$/),
    receivedAt: z.string().datetime({ offset: true }),
    text: z.string().max(500),
  })
  .strict();
export type ChatActionEnvelope = z.infer<typeof chatActionEnvelopeSchema>;

export const overlayTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

export const stageSchema = z.enum([
  "observe",
  "connect",
  "challenge",
  "reveal",
]);
export type Stage = z.infer<typeof stageSchema>;

export const sessionPhaseSchema = z.enum([
  "COOP_WAITING",
  "READY",
  "ACTIVE",
  "PAUSED",
  "RESOLVED",
  "PARTIAL",
  "CANCELLED",
]);
export type SessionPhase = z.infer<typeof sessionPhaseSchema>;

export const clueStatusSchema = z.enum(["locked", "unlocked", "linked"]);
export type ClueStatus = z.infer<typeof clueStatusSchema>;

// Viewer-safe clue. `observation` is present only after an accepted inspect.
export const clueViewSchema = z
  .object({
    id: z.string().min(1).max(32),
    label: z.string(),
    teaser: z.string(),
    status: clueStatusSchema,
    observation: z.string().nullable(),
  })
  .strict();
export type ClueView = z.infer<typeof clueViewSchema>;

export const verdictChoiceSchema = z
  .object({
    id: z.string().min(1).max(32),
    label: z.string(),
  })
  .strict();
export type VerdictChoice = z.infer<typeof verdictChoiceSchema>;

export const evidenceViewSchema = z
  .object({
    id: z.string().min(1).max(32),
    label: z.string(),
    team: teamRoleSchema.nullable(),
    shared: z.boolean(),
  })
  .strict();

export const sequenceViewSchema = z
  .object({
    id: z.string().min(1).max(32),
    label: z.string(),
    complete: z.boolean(),
    // Public unordered event choices; the correct order is never sent to clients.
    events: z
      .array(
        z.object({ id: z.string().min(1).max(32), label: z.string() }).strict(),
      )
      .optional(),
  })
  .strict();

export const theoryViewSchema = z
  .object({
    id: z.string().min(1).max(32),
    label: z.string(),
    status: z.enum(["UNVERIFIED", "CONTRADICTED", "SUPPORTED"]),
  })
  .strict();

// Viewer-safe round snapshot. It carries no answer, proof requirement, or
// false-verdict flag. Verdict choices are shown as options only.
export const roundSnapshotSchema = z
  .object({
    ...snapshotEnvelopeSchema.shape,
    sessionId: sessionIdSchema,
    source: z.enum(["simulation", "live"]),
    caseId: z.string(),
    caseMode: z.enum(["quick", "mystery", "coop"]),
    team: teamRoleSchema.nullable(),
    title: z.string(),
    premise: z.string(),
    question: z.string(),
    phase: sessionPhaseSchema,
    stage: stageSchema,
    paused: z.boolean(),
    // Informative only. Clients add local time while running; the server never punishes elapsed time.
    timer: z
      .object({
        elapsedMs: z.number().int().nonnegative(),
        running: z.boolean(),
      })
      .strict(),
    clues: z.array(clueViewSchema),
    evidence: z.array(evidenceViewSchema),
    sequences: z.array(sequenceViewSchema),
    theories: z.array(theoryViewSchema),
    currentHint: z.string().nullable(),
    hintLevel: z.number().int().nonnegative(),
    availableActions: z.array(z.string()),
    verdicts: z.array(verdictChoiceSchema),
    // The verdict the server accepted. Shown only at reveal. Optional so the engine's
    // toRoundSnapshot output (which does not set it) still matches the type; the server adds it.
    chosenVerdictId: z.string().min(1).max(32).nullable().optional(),
    revealText: z.string().nullable(),
  })
  .strict();
export type RoundSnapshot = z.infer<typeof roundSnapshotSchema>;

export const roundDeltaChangeSchema = z
  .object({
    field: z.enum([
      "protocolVersion",
      "revision",
      "sessionId",
      "source",
      "caseId",
      "caseMode",
      "team",
      "title",
      "premise",
      "question",
      "phase",
      "stage",
      "paused",
      "timer",
      "clues",
      "evidence",
      "sequences",
      "theories",
      "currentHint",
      "hintLevel",
      "availableActions",
      "verdicts",
      "chosenVerdictId",
      "revealText",
    ]),
    operation: z.enum(["set", "remove"]),
    value: z.unknown().optional(),
  })
  .strict();

export const roundDeltaSchema = z
  .object({
    sessionId: sessionIdSchema,
    previousRevision: z.number().int().nonnegative(),
    revision: z.number().int().positive(),
    changes: z.array(roundDeltaChangeSchema),
    cues: z.array(z.string()),
    eventId: z.string().uuid(),
  })
  .strict();
export type RoundDelta = z.infer<typeof roundDeltaSchema>;

export const sessionResyncRequestSchema = z
  .object({
    sessionId: sessionIdSchema,
    currentRevision: z.number().int().nonnegative(),
  })
  .strict();
export type SessionResyncRequest = z.infer<typeof sessionResyncRequestSchema>;

export const sessionResyncRequiredSchema = z
  .object({
    sessionId: sessionIdSchema,
    expectedRevision: z.number().int().positive(),
    serverRevision: z.number().int().nonnegative(),
  })
  .strict();
export type SessionResyncRequired = z.infer<typeof sessionResyncRequiredSchema>;

export const connectionStatusSchema = z
  .object({
    provider: z.literal("twitch"),
    state: z.enum(["ONLINE", "RECONNECTING", "OFFLINE", "REVOKED"]),
    since: z.string().datetime().nullable(),
  })
  .strict();
export type ConnectionStatus = z.infer<typeof connectionStatusSchema>;
