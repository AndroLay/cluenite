import { sendOAuthOutcome } from "./oauthOutcome.js";
import { createAdmission } from "../ops/httpPolicy.js";
import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  acceptCoopInviteSchema,
  coopInviteIdSchema,
  createCoopInviteSchema,
  createSessionSchema,
  declineCoopInviteSchema,
  idempotencyKeySchema,
  sessionIdSchema,
  type SessionControl,
} from "@cluenite/contracts";
import type { ServerConfig } from "../config.js";
import type { PostgresRoundRepository } from "../db/roundRepository.js";
import {
  CoopInviteConflictError,
  CoopInviteExpiredError,
  CoopInviteReplayError,
  IdempotencyConflictError,
  UnknownAuthoredCaseError,
} from "../db/roundRepository.js";
import {
  OverlayCredentialReplayError,
  SessionStore,
  type TwitchIdentity,
  type TwitchTokenSet,
} from "./sessionStore.js";
import {
  authenticateHost,
  authorizeHostMutation,
  clearCookieHeader,
  cookieHeader,
  getHostCookie,
  OAUTH_STATE_COOKIE_NAME,
  HOST_COOKIE_NAME,
  readBearer,
  readCookie,
} from "./authorization.js";
import {
  constantTimeEqual,
  createOpaqueToken,
  hashOpaqueToken,
} from "./crypto.js";
import { TwitchApi } from "../twitch/twitchApi.js";
import { AUTHORED_CASES } from "@cluenite/cases";

export interface AuthRoutesOptions {
  readonly app: FastifyInstance;
  readonly config: ServerConfig;
  readonly sessions: SessionStore;
  readonly rounds: PostgresRoundRepository;
  readonly twitchApi: TwitchApi | null;
  readonly onAccountAuthorized?: (twitchUserId: string) => void | Promise<void>;
  readonly onHostLogout?: (twitchUserId: string) => void | Promise<void>;
  readonly onTwitchDisconnected?: (
    twitchUserId: string,
  ) => void | Promise<void>;
  readonly onOverlayCredentialRotated?: (
    sessionId: string,
  ) => void | Promise<void>;
  readonly connectionStatus?: (twitchUserId: string) => string;
  readonly connectionDiagnostics?: (twitchUserId: string) => {
    readonly status: string;
    readonly activeSubscriptions: number;
    readonly lastNotificationAt: string | null;
  };
}

function queryString(request: FastifyRequest, key: string): string | undefined {
  const query = request.query;
  if (typeof query !== "object" || query === null) return undefined;
  const value = (query as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function idempotencyKey(request: FastifyRequest): string | null {
  const value = request.headers["idempotency-key"];
  const parsed = idempotencyKeySchema.safeParse(
    Array.isArray(value) ? value[0] : value,
  );
  return parsed.success ? parsed.data : null;
}

function pathSessionId(request: FastifyRequest): string | null {
  const params = request.params;
  if (typeof params !== "object" || params === null) return null;
  const parsed = sessionIdSchema.safeParse(
    (params as Record<string, unknown>).sessionId,
  );
  return parsed.success ? parsed.data : null;
}

function requiredScope(scopes: readonly string[]): boolean {
  return scopes.includes("user:read:chat");
}

function safeErrorCode(error: unknown): string {
  return error instanceof Error && "code" in error
    ? String(error.code).slice(0, 32)
    : "unknown";
}

export function registerAuthRoutes(options: AuthRoutesOptions): void {
  const { app, config, sessions, rounds, twitchApi } = options;
  const cookieSecure =
    config.nodeEnv === "production" ||
    config.publicOrigin.protocol === "https:";

  const mutations = createAdmission(60, 60_000);
  const authorizeMutation = async (
    request: FastifyRequest,
    reply: import("fastify").FastifyReply,
  ) => {
    const host = await authorizeHostMutation(request, reply, sessions, config);
    if (!host) return null;
    const admission = mutations.take(host.session.twitchUserId);
    if (!admission.allowed) {
      reply
        .header("retry-after", admission.retryAfter)
        .header("cache-control", "no-store")
        .code(429)
        .send({ error: "rate_limited" });
      return null;
    }
    return host;
  };

  app.get("/api/auth/twitch/start", async (request, reply) => {
    if (!twitchApi)
      return sendOAuthOutcome(
        request,
        reply,
        config,
        "unavailable",
        503,
        "twitch_oauth_not_configured",
      );
    const state = createOpaqueToken();
    reply.header(
      "set-cookie",
      cookieHeader(OAUTH_STATE_COOKIE_NAME, state, {
        secure: cookieSecure,
        maxAge: 600,
        path: "/api/auth/twitch",
      }),
    );
    return reply.redirect(twitchApi.authorizationUrl(state).toString());
  });

  app.get("/api/auth/twitch/callback", async (request, reply) => {
    const stateCookie = readCookie(
      request.headers.cookie,
      OAUTH_STATE_COOKIE_NAME,
    );
    const returnedState = queryString(request, "state");
    const code = queryString(request, "code");
    if (
      queryString(request, "error") ||
      !twitchApi ||
      !stateCookie ||
      !returnedState ||
      !/^[A-Za-z0-9_-]{43}$/.test(returnedState) ||
      !code ||
      code.length > 4096
    ) {
      reply.header(
        "set-cookie",
        clearCookieHeader(
          OAUTH_STATE_COOKIE_NAME,
          cookieSecure,
          "/api/auth/twitch",
        ),
      );
      return sendOAuthOutcome(
        request,
        reply,
        config,
        !twitchApi
          ? "unavailable"
          : queryString(request, "error") === "access_denied"
            ? "denied"
            : "invalid",
        twitchApi ? 400 : 503,
      );
    }
    if (!constantTimeEqual(stateCookie, returnedState)) {
      reply.header(
        "set-cookie",
        clearCookieHeader(
          OAUTH_STATE_COOKIE_NAME,
          cookieSecure,
          "/api/auth/twitch",
        ),
      );
      return sendOAuthOutcome(
        request,
        reply,
        config,
        "state_rejected",
        403,
        "oauth_state_rejected",
      );
    }

    try {
      const tokenSet: TwitchTokenSet = await twitchApi.exchangeCode(code);
      if (!requiredScope(tokenSet.scopes))
        throw new Error("Required Twitch permission was not granted.");
      const validation = await twitchApi.validateToken(tokenSet.accessToken);
      if (!requiredScope(validation.scopes))
        throw new Error("Required Twitch permission was not granted.");
      const identity: TwitchIdentity = await twitchApi.getCurrentUser(
        tokenSet.accessToken,
      );
      if (identity.id !== validation.user_id)
        throw new Error("Twitch identity validation failed.");
      await sessions.saveTwitchAccount(identity, {
        ...tokenSet,
        scopes: validation.scopes,
      });
      const hostSession = await sessions.createHostSession(identity.id);
      reply.header("set-cookie", [
        clearCookieHeader(
          OAUTH_STATE_COOKIE_NAME,
          cookieSecure,
          "/api/auth/twitch",
        ),
        cookieHeader(HOST_COOKIE_NAME, hostSession.token, {
          secure: cookieSecure,
          maxAge: Math.floor(
            (hostSession.expiresAt.getTime() - Date.now()) / 1000,
          ),
        }),
      ]);
      if (options.onAccountAuthorized) {
        void Promise.resolve(options.onAccountAuthorized(identity.id)).catch(
          () => {
            request.log.warn(
              { twitchUserId: identity.id },
              "Twitch chat connection could not start",
            );
          },
        );
      }
      return sendOAuthOutcome(request, reply, config, "connected");
    } catch (error) {
      request.log.warn(
        { code: safeErrorCode(error) },
        "Twitch authorization callback failed",
      );
      reply.header(
        "set-cookie",
        clearCookieHeader(
          OAUTH_STATE_COOKIE_NAME,
          cookieSecure,
          "/api/auth/twitch",
        ),
      );
      return sendOAuthOutcome(request, reply, config, "exchange_failed", 502);
    }
  });

  app.get("/api/me", async (request, reply) => {
    const host = await authenticateHost(request, reply, sessions);
    if (!host) return;
    return {
      authenticated: true,
      profile: {
        login: host.session.login,
        displayName: host.session.displayName,
      },
      twitch: {
        connected: true,
        chatStatus:
          options.connectionStatus?.(host.session.twitchUserId) ?? "starting",
      },
      csrfToken: host.session.csrfToken,
      expiresAt: host.session.expiresAt.toISOString(),
    };
  });

  app.get("/api/cases", async () => ({
    cases: AUTHORED_CASES.map((definition) => ({
      id: definition.id,
      version: definition.version,
      mode: definition.mode,
      title: definition.title,
      premise: definition.premise,
      question: definition.question,
      clues: definition.clues.map(({ id, label, teaser, team }) => ({
        id,
        label,
        teaser,
        team: team ?? null,
      })),
      verdicts: definition.verdicts.map(({ id, label }) => ({ id, label })),
    })),
  }));

  app.get("/api/ops/diagnostics", async (request, reply) => {
    const host = await authenticateHost(request, reply, sessions);
    if (!host) return;
    const sessionDiagnostics = await rounds.diagnosticsForParticipant(
      host.session.twitchUserId,
    );
    return {
      capturedAt: new Date().toISOString(),
      database: { healthy: true },
      twitch: options.connectionDiagnostics?.(host.session.twitchUserId) ?? {
        status:
          options.connectionStatus?.(host.session.twitchUserId) ??
          "disconnected",
        activeSubscriptions: 0,
        lastNotificationAt: null,
      },
      sessions: sessionDiagnostics,
      pendingOutboxCount: sessionDiagnostics.reduce(
        (total, session) => total + session.pendingOutboxCount,
        0,
      ),
    };
  });

  app.post("/api/auth/logout", async (request, reply) => {
    const host = await authorizeMutation(request, reply);
    if (!host) return;
    const userId = await sessions.revokeHostSession(getHostCookie(request));
    reply.header(
      "set-cookie",
      clearCookieHeader(HOST_COOKIE_NAME, cookieSecure),
    );
    if (userId && options.onHostLogout) {
      await Promise.resolve(options.onHostLogout(userId)).catch(() => {
        request.log.warn(
          { twitchUserId: userId },
          "Twitch chat worker did not stop after logout",
        );
      });
    }
    return reply.code(204).send();
  });

  app.post("/api/auth/twitch/disconnect", async (request, reply) => {
    const host = await authorizeMutation(request, reply);
    if (!host) return;
    const userId = host.session.twitchUserId;
    const account = await sessions.loadTwitchAccount(userId);
    let providerRevocation:
      "confirmed" | "already_invalid" | "unconfirmed" | "unconfigured" =
      twitchApi ? "unconfirmed" : "unconfigured";
    if (account && twitchApi) {
      try {
        providerRevocation =
          (await twitchApi.revokeToken(account.accessToken)) === "revoked"
            ? "confirmed"
            : "already_invalid";
      } catch (error) {
        request.log.warn(
          { code: safeErrorCode(error) },
          "Twitch token revocation could not be confirmed",
        );
      }
    }
    await sessions.markTwitchRevoked(userId);
    await rounds.pauseActiveSessionsForHost(userId);
    await options.onTwitchDisconnected?.(userId);
    reply.header(
      "set-cookie",
      clearCookieHeader(HOST_COOKIE_NAME, cookieSecure),
    );
    return { disconnected: true, providerRevocation };
  });

  app.post("/api/sessions", async (request, reply) => {
    const host = await authorizeMutation(request, reply);
    if (!host) return;
    const key = idempotencyKey(request);
    if (!key)
      return reply.code(400).send({ error: "valid_idempotency_key_required" });
    const parsed = createSessionSchema.safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({ error: "invalid_session_request" });
    try {
      const snapshot = await rounds.create({
        hostTwitchId: host.session.twitchUserId,
        caseId: parsed.data.caseId,
        idempotencyKey: key,
      });
      return reply.code(201).send({ snapshot });
    } catch (error) {
      if (error instanceof IdempotencyConflictError)
        return reply.code(409).send({ error: "idempotency_conflict" });
      if (error instanceof UnknownAuthoredCaseError)
        return reply.code(404).send({ error: "case_not_found" });
      request.log.error(
        { code: safeErrorCode(error) },
        "Session creation failed",
      );
      return reply.code(500).send({ error: "session_creation_failed" });
    }
  });

  app.post("/api/coops/invitations", async (request, reply) => {
    const host = await authorizeMutation(request, reply);
    if (!host) return;
    const key = idempotencyKey(request);
    if (!key)
      return reply.code(400).send({ error: "valid_idempotency_key_required" });
    const parsed = createCoopInviteSchema.safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({ error: "invalid_coop_invite" });
    const token = createOpaqueToken();
    try {
      const invite = await rounds.createCoopInvitation({
        sessionId: parsed.data.sessionId,
        inviterTwitchId: host.session.twitchUserId,
        inviteeTwitchId: parsed.data.inviteeTwitchId,
        tokenHash: hashOpaqueToken(
          token,
          config.overlayHashKey!,
          "coop-invite",
        ),
        idempotencyKey: key,
      });
      return invite
        ? reply.code(201).send({ ...invite, token })
        : reply.code(404).send({ error: "session_not_found" });
    } catch (error) {
      if (error instanceof CoopInviteReplayError)
        return reply.code(409).send({ error: "invite_idempotency_replay" });
      if (error instanceof CoopInviteConflictError)
        return reply.code(409).send({ error: "coop_invite_conflict" });
      request.log.error(
        { code: safeErrorCode(error) },
        "Co-op invitation creation failed",
      );
      return reply.code(500).send({ error: "coop_invite_creation_failed" });
    }
  });

  app.post(
    "/api/coops/invitations/:inviteId/accept",
    async (request, reply) => {
      const host = await authorizeMutation(request, reply);
      if (!host) return;
      const params = request.params as Record<string, unknown>;
      const inviteId = coopInviteIdSchema.safeParse(params.inviteId);
      const key = idempotencyKey(request);
      const parsed = acceptCoopInviteSchema.safeParse(request.body);
      if (!inviteId.success)
        return reply.code(400).send({ error: "invalid_invite_id" });
      if (!key)
        return reply
          .code(400)
          .send({ error: "valid_idempotency_key_required" });
      if (!parsed.success)
        return reply.code(400).send({ error: "invalid_coop_invite_token" });
      try {
        const result = await rounds.acceptCoopInvitation({
          inviteId: inviteId.data,
          inviteeTwitchId: host.session.twitchUserId,
          tokenHash: hashOpaqueToken(
            parsed.data.token,
            config.overlayHashKey!,
            "coop-invite",
          ),
          idempotencyKey: key,
        });
        return result
          ? { accepted: true, ...result }
          : reply.code(404).send({ error: "coop_invite_not_available" });
      } catch (error) {
        if (error instanceof CoopInviteExpiredError)
          return reply.code(410).send({ error: "coop_invite_expired" });
        if (error instanceof CoopInviteConflictError)
          return reply.code(409).send({ error: "coop_invite_conflict" });
        request.log.error(
          { code: safeErrorCode(error) },
          "Co-op invitation acceptance failed",
        );
        return reply.code(500).send({ error: "coop_invite_acceptance_failed" });
      }
    },
  );

  app.post(
    "/api/coops/invitations/:inviteId/decline",
    async (request, reply) => {
      const invitee = await authorizeMutation(request, reply);
      if (!invitee) return;
      const params = request.params as Record<string, unknown>;
      const inviteId = coopInviteIdSchema.safeParse(params.inviteId);
      const key = idempotencyKey(request);
      const parsed = declineCoopInviteSchema.safeParse(request.body);
      if (!inviteId.success)
        return reply.code(400).send({ error: "invalid_invite_id" });
      if (!key)
        return reply
          .code(400)
          .send({ error: "valid_idempotency_key_required" });
      if (!parsed.success)
        return reply.code(400).send({ error: "invalid_coop_invite_token" });
      try {
        const result = await rounds.declineCoopInvitation({
          inviteId: inviteId.data,
          inviteeTwitchId: invitee.session.twitchUserId,
          tokenHash: hashOpaqueToken(
            parsed.data.token,
            config.overlayHashKey!,
            "coop-invite",
          ),
          idempotencyKey: key,
        });
        return result
          ? { declined: true, ...result }
          : reply.code(404).send({ error: "coop_invite_not_available" });
      } catch (error) {
        if (error instanceof CoopInviteExpiredError)
          return reply.code(410).send({ error: "coop_invite_expired" });
        if (error instanceof CoopInviteConflictError)
          return reply.code(409).send({ error: "coop_invite_conflict" });
        request.log.error(
          { code: safeErrorCode(error) },
          "Co-op invitation decline failed",
        );
        return reply.code(500).send({ error: "coop_invite_decline_failed" });
      }
    },
  );

  app.post("/api/coops/sessions/:sessionId/rejoin", async (request, reply) => {
    const host = await authorizeMutation(request, reply);
    if (!host) return;
    const sessionId = pathSessionId(request);
    if (!sessionId)
      return reply.code(400).send({ error: "invalid_session_id" });
    if (!idempotencyKey(request))
      return reply.code(400).send({ error: "valid_idempotency_key_required" });
    try {
      const result = await rounds.rejoinCoopSession({
        sessionId,
        broadcasterId: host.session.twitchUserId,
      });
      return (
        result ?? reply.code(404).send({ error: "coop_session_not_available" })
      );
    } catch (error) {
      request.log.error(
        { code: safeErrorCode(error) },
        "Co-op session rejoin failed",
      );
      return reply.code(500).send({ error: "coop_session_rejoin_failed" });
    }
  });

  app.get("/api/sessions/:sessionId/snapshot", async (request, reply) => {
    const sessionId = pathSessionId(request);
    if (!sessionId)
      return reply.code(400).send({ error: "invalid_session_id" });

    const hostToken = getHostCookie(request);
    const host = await sessions.resolveHostSession(hostToken);
    if (host) {
      const snapshot = await rounds.snapshotForParticipant(
        sessionId,
        host.twitchUserId,
      );
      return snapshot
        ? { snapshot }
        : reply.code(404).send({ error: "session_not_found" });
    }
    const overlay = await sessions.resolveOverlay(readBearer(request));
    if (!overlay || overlay.sessionId !== sessionId)
      return reply.code(404).send({ error: "session_not_found" });
    const snapshot = await rounds.snapshotForOverlay(
      sessionId,
      overlay.tokenHash,
    );
    return snapshot
      ? { snapshot }
      : reply.code(404).send({ error: "session_not_found" });
  });

  app.post("/api/sessions/:sessionId/:action", async (request, reply) => {
    const host = await authorizeMutation(request, reply);
    if (!host) return;
    const sessionId = pathSessionId(request);
    if (!sessionId)
      return reply.code(400).send({ error: "invalid_session_id" });
    const key = idempotencyKey(request);
    if (!key)
      return reply.code(400).send({ error: "valid_idempotency_key_required" });
    const params = request.params as Record<string, unknown>;
    const rawAction = params.action;
    if (!isControlAction(rawAction))
      return reply.code(404).send({ error: "unknown_session_action" });
    const result = await rounds.control({
      sessionId,
      hostTwitchId: host.session.twitchUserId,
      action: rawAction,
      idempotencyKey: key,
    });
    if (result.code === "NOT_AVAILABLE" && result.reason === "UNKNOWN_TARGET")
      return reply.code(404).send({ error: "session_not_found" });
    return { result };
  });

  app.post(
    "/api/sessions/:sessionId/overlay-credential",
    async (request, reply) => {
      const host = await authorizeMutation(request, reply);
      if (!host) return;
      const sessionId = pathSessionId(request);
      const key = idempotencyKey(request);
      if (!sessionId)
        return reply.code(400).send({ error: "invalid_session_id" });
      if (!key)
        return reply
          .code(400)
          .send({ error: "valid_idempotency_key_required" });
      let credential: Awaited<
        ReturnType<SessionStore["createOverlayCredential"]>
      >;
      try {
        credential = await sessions.createOverlayCredential(
          sessionId,
          host.session.twitchUserId,
          key,
        );
      } catch (error) {
        if (error instanceof OverlayCredentialReplayError) {
          return reply.code(409).send({
            error: "overlay_credential_already_issued",
            rotate_with_new_key: true,
          });
        }
        request.log.error(
          { code: safeErrorCode(error) },
          "Overlay credential creation failed",
        );
        return reply
          .code(500)
          .send({ error: "overlay_credential_creation_failed" });
      }
      if (!credential)
        return reply.code(404).send({ error: "session_not_found" });
      await options.onOverlayCredentialRotated?.(sessionId);
      const overlayUrl = new URL("/", config.publicOrigin);
      overlayUrl.searchParams.set("mode", "obs");
      overlayUrl.searchParams.set("session", sessionId);
      overlayUrl.hash = `overlay=${credential.token}`;
      return reply.code(201).send({
        url: overlayUrl.toString(),
        expiresAt: credential.expiresAt.toISOString(),
      });
    },
  );

  app.delete(
    "/api/sessions/:sessionId/overlay-credential",
    async (request, reply) => {
      const host = await authorizeMutation(request, reply);
      if (!host) return;
      const sessionId = pathSessionId(request);
      if (!sessionId)
        return reply.code(400).send({ error: "invalid_session_id" });
      const revoked = await sessions.revokeOverlayCredential(
        sessionId,
        host.session.twitchUserId,
      );
      if (revoked) await options.onOverlayCredentialRotated?.(sessionId);
      return revoked
        ? { revoked: true }
        : reply.code(404).send({ error: "session_not_found" });
    },
  );
}

function isControlAction(value: unknown): value is SessionControl["action"] {
  return (
    value === "start" ||
    value === "pause" ||
    value === "resume" ||
    value === "restart" ||
    value === "stop"
  );
}
