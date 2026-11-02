// Same-origin requests only. Mutations are never retried automatically: the caller retains
// its idempotency key until the outcome of that user action is known.
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly retryAfter: number = 0,
  ) {
    super(code);
  }
}

export function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : null;
}

export async function api(path: string, options: {
  method?: "GET" | "POST" | "DELETE";
  csrf?: string;
  key?: string;
  body?: unknown;
} = {}): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(path, {
      method: options.method ?? "GET",
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(options.csrf ? { "X-CSRF-Token": options.csrf } : {}),
        ...(options.key ? { "Idempotency-Key": options.key } : {}),
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    });
    if (response.status === 204) return {};
    const body = record(await response.json().catch(() => null));
    if (!response.ok) {
      const code = typeof body?.error === "string" ? body.error : "request_failed";
      const seconds = Number(response.headers.get("Retry-After"));
      throw new ApiError(response.status, code, Number.isFinite(seconds) ? Math.max(0, seconds) : 0);
    }
    if (body === null) throw new ApiError(0, "response_incomplete");
    return body;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, "connection_lost");
  } finally {
    clearTimeout(timer);
  }
}

export function apiMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "The request could not be completed. Try again.";
  if (error.status === 0) return "The connection was interrupted. The outcome is unknown; retry the same action to check it safely.";
  if (error.status === 401) return "Your sign-in ended. Connect Twitch again.";
  if (error.code === "csrf_rejected") return "Your session check expired. Check your connection, then try again.";
  if (error.code === "twitch_connection_recovering") return "Twitch is reconnecting. Wait a moment, then retry.";
  if (error.code === "twitch_reauthorization_required") return "Reconnect Twitch before continuing.";
  if (error.code === "twitch_user_not_found") return "No Twitch account has that username. Check the spelling.";
  if (error.code === "idempotency_conflict") return "Another hosted case is still open. Continue it from Saved sessions, or stop it in its host controls before creating a different case.";
  if (error.code === "coop_invite_expired") return "This invitation expired. Ask the host for a new link.";
  if (error.code === "coop_invite_not_available") return "This invitation is unavailable for this Twitch account.";
  if (error.status === 429 || error.status === 503) return `The server is busy. Wait ${error.retryAfter || 2} seconds, then retry.`;
  return `The request was not accepted (${error.code.replaceAll("_", " ")}).`;
}
