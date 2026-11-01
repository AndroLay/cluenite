import type { FastifyInstance, FastifyRequest } from "fastify";

export const HTTP_BODY_LIMIT = 16 * 1024;

export function createAdmission(
  max: number,
  windowMs: number,
  now = Date.now,
  capacity = 10_000,
) {
  const entries = new Map<string, { hits: number; resetAt: number }>();
  let nextSweep = 0;
  return {
    take(key: string) {
      const at = now();
      if (at >= nextSweep) {
        for (const [id, value] of entries)
          if (value.resetAt <= at) entries.delete(id);
        nextSweep = at + windowMs;
      }
      let entry = entries.get(key);
      if (!entry || entry.resetAt <= at) {
        if (!entry && entries.size >= capacity)
          return {
            allowed: false,
            retryAfter: Math.max(1, Math.ceil((nextSweep - at) / 1000)),
          };
        entry = { hits: 0, resetAt: at + windowMs };
        entries.set(key, entry);
      }
      const allowed = entry.hits < max;
      if (allowed) entry.hits++;
      return {
        allowed,
        retryAfter: Math.max(1, Math.ceil((entry.resetAt - at) / 1000)),
      };
    },
  };
}

export function registerHttpAdmission(
  app: FastifyInstance,
  options: { now?: () => number; apiMax?: number; oauthMax?: number } = {},
) {
  app.setErrorHandler((error, request, reply) => {
    const failure = error as { statusCode?: number };
    const status =
      failure.statusCode &&
      failure.statusCode >= 400 &&
      failure.statusCode <= 599
        ? failure.statusCode
        : 500;
    request.log[status >= 500 ? "error" : "warn"](
      { err: error },
      "HTTP request failed",
    );
    return reply.code(status).send({
      error:
        status === 413
          ? "request_body_too_large"
          : status >= 500
            ? "internal_error"
            : "request_rejected",
    });
  });
  const api = createAdmission(options.apiMax ?? 600, 60_000, options.now);
  const oauth = createAdmission(options.oauthMax ?? 20, 60_000, options.now);
  app.addHook("onRequest", async (request, reply) => {
    const rawPath = request.url.split(/[?;]/, 1)[0] ?? "";
    const path = request.routeOptions.url?.startsWith("/api/")
      ? request.routeOptions.url
      : rawPath;
    if (path !== "/api" && !path.startsWith("/api/")) return;
    reply.header("cache-control", "no-store");
    const general = api.take(request.ip);
    const specific = path.startsWith("/api/auth/twitch/")
      ? oauth.take(request.ip)
      : null;
    const denied = !general.allowed
      ? general
      : specific && !specific.allowed
        ? specific
        : null;
    if (denied)
      return reply
        .header("retry-after", denied.retryAfter)
        .header("cache-control", "no-store")
        .code(429)
        .send({ error: "rate_limited" });
  });
}

export const safeLoggerOptions = {
  serializers: {
    req(request: FastifyRequest) {
      return {
        method: request.method,
        route: request.routeOptions?.url ?? "unmatched",
      };
    },
    err(error: { code?: unknown }) {
      const code =
        typeof error.code === "string" &&
        /^(FST_ERR_[A-Z_]+|[0-9A-Z]{5})$/.test(error.code)
          ? error.code
          : "INTERNAL_ERROR";
      return {
        type: "RequestError",
        code,
        message: "HTTP request failed",
        stack: "",
      };
    },
  },
  redact: {
    paths: ["req.headers", "req.url", "req.query", "req.body", "res.headers"],
    censor: "[REDACTED]",
  },
};
