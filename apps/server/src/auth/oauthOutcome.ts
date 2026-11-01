import type { FastifyReply, FastifyRequest } from "fastify";
import type { ServerConfig } from "../config.js";

export type OAuthOutcome =
  | "connected"
  | "denied"
  | "invalid"
  | "state_rejected"
  | "unavailable"
  | "exchange_failed";

function prefersHtml(accept: string | undefined): boolean {
  let html = 0;
  let json = 0;
  for (const entry of (accept ?? "").toLowerCase().split(",")) {
    const [media, ...parameters] = entry.trim().split(";");
    const quality = parameters.find((value) => value.trim().startsWith("q="));
    const weight = quality ? Number(quality.trim().slice(2)) : 1;
    if (!Number.isFinite(weight) || weight < 0 || weight > 1) continue;
    if (media === "text/html" || media === "application/xhtml+xml")
      html = Math.max(html, weight);
    if (media === "application/json" || media?.endsWith("+json"))
      json = Math.max(json, weight);
  }
  return html > 0 && html >= json;
}

export function sendOAuthOutcome(
  request: FastifyRequest,
  reply: FastifyReply,
  config: ServerConfig,
  outcome: OAuthOutcome,
  legacyStatus = 400,
  legacyError = "twitch_authorization_failed",
): FastifyReply {
  reply.header("cache-control", "no-store");
  reply.header("vary", "Accept");
  reply.header("referrer-policy", "no-referrer");
  if (prefersHtml(request.headers.accept)) {
    const destination = new URL("/connect", config.publicOrigin);
    destination.searchParams.set("result", outcome);
    return reply.redirect(destination.href);
  }
  if (outcome === "connected")
    return reply.redirect(config.publicOrigin.toString());
  return reply.code(legacyStatus).send({ error: legacyError });
}
