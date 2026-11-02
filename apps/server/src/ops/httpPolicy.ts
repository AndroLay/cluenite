import type { FastifyInstance, FastifyRequest } from "fastify";
import { BlockList, isIP } from "node:net";
import { createWorkBudget } from "./workBudget.js";

export const HTTP_BODY_LIMIT = 16 * 1024;

const renderProxyPeers = new BlockList();
for (const [network, prefix] of [
  ["10.0.0.0", 8],
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
  ["127.0.0.0", 8],
] as const)
  renderProxyPeers.addSubnet(network, prefix, "ipv4");
renderProxyPeers.addSubnet("fc00::", 7, "ipv6");
renderProxyPeers.addSubnet("fe80::", 10, "ipv6");
renderProxyPeers.addAddress("::1", "ipv6");

function admissionIdentity(request: FastifyRequest, renderEdge: boolean) {
  const peer = request.raw.socket.remoteAddress ?? request.ip;
  const family = isIP(peer);
  const trustedPeer =
    family !== 0 &&
    renderProxyPeers.check(peer, family === 4 ? "ipv4" : "ipv6");
  const header = request.headers["cf-connecting-ip"];
  const validHeader =
    typeof header === "string" &&
    header.length <= 45 &&
    !header.includes("%") &&
    isIP(header) !== 0;
  if (renderEdge && trustedPeer && validHeader) {
    // Render's public edge overwrites this single-IP header. Never trust XFF.
    const address =
      isIP(header) === 4 ? header : new URL(`http://[${header}]/`).hostname;
    return {
      key: `render:${address}`,
      source: "render-edge",
      reason: "validated-edge-header",
    };
  }
  return {
    key: `peer:${request.ip}`,
    source: "peer",
    reason: !renderEdge
      ? "direct-mode"
      : !trustedPeer
        ? "untrusted-peer"
        : header === undefined
          ? "missing-edge-header"
          : "invalid-edge-header",
  };
}

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
  options: {
    now?: () => number;
    apiMax?: number;
    oauthMax?: number;
    maxInFlight?: number;
    renderEdge?: boolean;
  } = {},
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
  const work = createWorkBudget(options.maxInFlight ?? 32);
  const readinessWork = createWorkBudget(2);
  const reportedSources = new Set<string>();
  const admitted = new WeakMap<FastifyRequest, () => void>();
  const release = (request: FastifyRequest) => {
    admitted.get(request)?.();
    admitted.delete(request);
  };
  app.addHook("onSend", async (request, _reply, payload) => {
    release(request);
    return payload;
  });
  app.addHook("onRequestAbort", async (request) => {
    release(request);
  });
  app.addHook("onRequest", async (request, reply) => {
    const rawPath = request.url.split(/[?;]/, 1)[0] ?? "";
    const path = request.routeOptions.url?.startsWith("/api/")
      ? request.routeOptions.url
      : rawPath;
    if (path === "/health/ready") {
      reply.header("cache-control", "no-store");
      const finished = readinessWork.acquire();
      if (!finished)
        return reply
          .header("retry-after", "1")
          .code(503)
          .send({ status: "not-ready" });
      admitted.set(request, finished);
      return;
    }
    if (path !== "/api" && !path.startsWith("/api/")) return;
    reply.header("cache-control", "no-store");
    const identity = admissionIdentity(request, options.renderEdge === true);
    if (options.renderEdge && !reportedSources.has(identity.reason)) {
      reportedSources.add(identity.reason);
      request.log.info(
        { clientIpSource: identity.source, reason: identity.reason },
        "HTTP rate limit source",
      );
    }
    const general = api.take(identity.key);
    const specific = path.startsWith("/api/auth/twitch/")
      ? oauth.take(identity.key)
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
    const finished = work.acquire();
    if (!finished)
      return reply
        .header("retry-after", "1")
        .code(503)
        .send({ error: "server_busy" });
    admitted.set(request, finished);
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
