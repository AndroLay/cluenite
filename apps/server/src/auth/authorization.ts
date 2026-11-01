import type { FastifyReply, FastifyRequest } from "fastify";
import type { ServerConfig } from "../config.js";
import type { HostSession, SessionStore } from "./sessionStore.js";

export const HOST_COOKIE_NAME = "cluenite_session";
export const OAUTH_STATE_COOKIE_NAME = "cluenite_oauth_state";

export interface AuthenticatedHost {
  readonly session: HostSession;
  readonly rawToken: string;
}

export function readCookie(
  header: string | undefined,
  name: string,
): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    const value = part.slice(separator + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function getHostCookie(request: FastifyRequest): string | undefined {
  return readCookie(request.headers.cookie, HOST_COOKIE_NAME);
}

export function isSameOrigin(
  request: FastifyRequest,
  config: ServerConfig,
): boolean {
  const origin = request.headers.origin;
  if (!origin) return false;
  try {
    return new URL(origin).origin === config.publicOrigin.origin;
  } catch {
    return false;
  }
}

export async function authenticateHost(
  request: FastifyRequest,
  reply: FastifyReply,
  store: SessionStore,
): Promise<AuthenticatedHost | null> {
  const rawToken = getHostCookie(request);
  const session = await store.resolveHostSession(rawToken);
  if (!rawToken || !session) {
    reply.code(401).send({ error: "authentication_required" });
    return null;
  }
  return { session, rawToken };
}

export async function authorizeHostMutation(
  request: FastifyRequest,
  reply: FastifyReply,
  store: SessionStore,
  config: ServerConfig,
): Promise<AuthenticatedHost | null> {
  const authenticated = await authenticateHost(request, reply, store);
  if (!authenticated) return null;
  if (!isSameOrigin(request, config)) {
    reply.code(403).send({ error: "origin_rejected" });
    return null;
  }
  const csrfHeader = request.headers["x-csrf-token"];
  const csrf = Array.isArray(csrfHeader) ? csrfHeader[0] : csrfHeader;
  if (!(await store.csrfMatches(authenticated.rawToken, csrf))) {
    reply.code(403).send({ error: "csrf_rejected" });
    return null;
  }
  return authenticated;
}

export function readBearer(request: FastifyRequest): string | undefined {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) return undefined;
  return authorization.slice("Bearer ".length);
}

export function cookieHeader(
  name: string,
  value: string,
  options: {
    readonly secure: boolean;
    readonly maxAge: number;
    readonly path?: string;
  },
): string {
  const secure = options.secure ? "; Secure" : "";
  return `${name}=${encodeURIComponent(value)}; Path=${options.path ?? "/"}; Max-Age=${options.maxAge}; HttpOnly; SameSite=Lax${secure}`;
}

export function clearCookieHeader(
  name: string,
  secure: boolean,
  path = "/",
): string {
  return `${name}=; Path=${path}; Max-Age=0; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}
