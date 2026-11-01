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
export const MAX_COMMAND_TOKENS = 5;

export const sessionIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);

// Command text is parsed by the engine: `inspect CAM`, `link CAM SCHEDULE`, `solve ROBOT`.
export const submitCommandSchema = z
  .object({
    sessionId: sessionIdSchema,
    text: z.string().max(MAX_COMMAND_LENGTH),
  })
  .strict();
export type SubmitCommand = z.infer<typeof submitCommandSchema>;

export const sessionControlSchema = z
  .object({
    sessionId: sessionIdSchema,
    action: z.enum(["pause", "resume", "restart"]),
  })
  .strict();
export type SessionControl = z.infer<typeof sessionControlSchema>;

export const joinSessionSchema = z
  .object({
    sessionId: sessionIdSchema,
  })
  .strict();
export type JoinSession = z.infer<typeof joinSessionSchema>;

export const stageSchema = z.enum(["observe", "connect", "challenge", "reveal"]);
export type Stage = z.infer<typeof stageSchema>;

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

// Viewer-safe round snapshot. It carries no answer, proof requirement, or
// false-verdict flag. Verdict choices are shown as options only.
export const roundSnapshotSchema = z
  .object({
    ...snapshotEnvelopeSchema.shape,
    sessionId: sessionIdSchema,
    source: z.enum(["simulation", "live"]),
    caseId: z.string(),
    title: z.string(),
    premise: z.string(),
    question: z.string(),
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
    verdicts: z.array(verdictChoiceSchema),
    revealText: z.string().nullable(),
  })
  .strict();
export type RoundSnapshot = z.infer<typeof roundSnapshotSchema>;
