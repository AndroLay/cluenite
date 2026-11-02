import { commandResultSchema, roundSnapshotSchema, type RoundSnapshot } from "@cluenite/contracts";
import { api, ApiError } from "../net/api";
import { newIdempotencyKey } from "../net/idempotency";

export interface SessionLaunchAttempt {
  readonly caseId: string;
  readonly createKey: string;
  readonly previousSessionId?: string;
  readonly stopKey: string;
  stopConfirmed: boolean;
}

export function newSessionLaunch(caseId: string, previousSessionId?: string): SessionLaunchAttempt {
  return { caseId, createKey: newIdempotencyKey(), ...(previousSessionId ? { previousSessionId } : {}), stopKey: newIdempotencyKey(), stopConfirmed: false };
}

// Retain this attempt after an unknown response. Stop and create have independent receipts;
// a retry never advances past an unconfirmed stop or repeats a confirmed stop.
export async function launchSession(attempt: SessionLaunchAttempt, csrf: string): Promise<RoundSnapshot> {
  if (attempt.previousSessionId && !attempt.stopConfirmed) {
    const stopped = await api(`/api/sessions/${encodeURIComponent(attempt.previousSessionId)}/stop`, {
      method: "POST", csrf, key: attempt.stopKey,
    });
    const result = commandResultSchema.safeParse(stopped.result);
    if (!result.success) throw new ApiError(0, "response_incomplete");
    if (result.data.code !== "ACCEPTED_NEW" && result.data.code !== "ACCEPTED_ALREADY_KNOWN") {
      throw new ApiError(409, "case_stop_not_accepted");
    }
    attempt.stopConfirmed = true;
  }
  const body = await api("/api/sessions", {
    method: "POST", csrf, key: attempt.createKey, body: { caseId: attempt.caseId },
  });
  const snapshot = roundSnapshotSchema.safeParse(body.snapshot);
  if (!snapshot.success || snapshot.data.caseId !== attempt.caseId) throw new ApiError(0, "response_incomplete");
  if (["CANCELLED", "PARTIAL", "RESOLVED"].includes(snapshot.data.phase)) throw new ApiError(409, "case_launch_ended");
  return snapshot.data;
}
