import type { SessionSummary } from "@cluenite/contracts";
import { sessionPhaseSchema } from "@cluenite/contracts";
import { api, record } from "../net/api";

export function isSessionSummary(value: unknown): value is SessionSummary {
  const row = record(value);
  return row !== null && typeof row.sessionId === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(row.sessionId)
    && typeof row.caseId === "string" && typeof row.title === "string"
    && sessionPhaseSchema.safeParse(row.phase).success && Number.isInteger(row.revision)
    && (row.team === "A" || row.team === "B") && (row.role === "host" || row.role === "partner")
    && typeof row.needsRejoin === "boolean" && typeof row.updatedAt === "string";
}

export async function listSessions(): Promise<SessionSummary[]> {
  const body = await api("/api/sessions?status=open&limit=20");
  if (!Array.isArray(body.sessions) || !body.sessions.every(isSessionSummary)) throw new Error("Invalid session list");
  return body.sessions;
}

export function sessionHref(session: Pick<SessionSummary, "sessionId" | "role">): string {
  return `/?session=${encodeURIComponent(session.sessionId)}${session.role === "host" ? "&view=dashboard" : ""}`;
}
