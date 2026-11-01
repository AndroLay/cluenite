import Fastify from "fastify";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PostgresRoundRepository } from "../src/db/roundRepository.js";
import { parseServerConfig } from "../src/config.js";
import { SessionStore } from "../src/auth/sessionStore.js";
import { hashOpaqueToken } from "../src/auth/crypto.js";
import { registerAuthRoutes } from "../src/auth/routes.js";
import type { TwitchApi } from "../src/twitch/twitchApi.js";
import { createIsolatedDatabase } from "./testDatabase.js";

const describeWithDatabase = process.env.DATABASE_URL
  ? describe
  : describe.skip;
const userId = "1971641";
const hostKeys = {
  SESSION_SIGNING_SECRET: "s".repeat(40),
  DATA_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
  OVERLAY_TOKEN_SIGNING_KEY: "o".repeat(40),
};

function findCookie(
  setCookie: string | string[] | undefined,
  name: string,
): string {
  const headers = Array.isArray(setCookie)
    ? setCookie
    : setCookie
      ? [setCookie]
      : [];
  const match = headers
    .map((header) => header.match(new RegExp(`(?:^|; )${name}=([^;]*)`)))
    .find(Boolean);
  if (!match?.[1])
    throw new Error(`Cookie ${name} is missing from the response.`);
  return decodeURIComponent(match[1]);
}

describeWithDatabase("host auth and session API", () => {
  let database: Awaited<ReturnType<typeof createIsolatedDatabase>>;
  let app: ReturnType<typeof Fastify>;
  let rounds: PostgresRoundRepository;
  let sessions: SessionStore;
  let exchangeCode: ReturnType<typeof vi.fn>;
  let revokeToken: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    database = await createIsolatedDatabase();
    const config = parseServerConfig({
      NODE_ENV: "test",
      PUBLIC_ORIGIN: "http://localhost:5173",
      DATABASE_URL: "postgresql://localhost/cluenite_test",
      TWITCH_CLIENT_ID: "test-client-id",
      TWITCH_CLIENT_SECRET: "test-client-secret",
      TWITCH_REDIRECT_URI: "http://localhost:10000/api/auth/twitch/callback",
      ...hostKeys,
    });
    rounds = new PostgresRoundRepository(
      database.pool,
      () => 1_800_000_000_000,
    );
    sessions = new SessionStore(
      database.pool,
      Buffer.from(hostKeys.SESSION_SIGNING_SECRET),
      Buffer.from(hostKeys.DATA_ENCRYPTION_KEY, "base64"),
      Buffer.from(hostKeys.OVERLAY_TOKEN_SIGNING_KEY),
    );
    exchangeCode = vi.fn(async () => ({
      accessToken: "access-token-for-test",
      refreshToken: "refresh-token-for-test",
      expiresIn: 3600,
      scopes: ["user:read:chat"],
    }));
    revokeToken = vi.fn(async () => "revoked" as const);
    const fakeTwitchApi = {
      authorizationUrl: (state: string) =>
        new URL(`https://id.twitch.tv/oauth2/authorize?state=${state}`),
      exchangeCode,
      validateToken: vi.fn(async () => ({
        client_id: "test-client-id",
        user_id: userId,
        login: "cluenitehost",
        scopes: ["user:read:chat"],
        expires_in: 3600,
      })),
      getCurrentUser: vi.fn(async () => ({
        id: userId,
        login: "cluenitehost",
        displayName: "Cluenite Host",
      })),
      revokeToken,
    } as unknown as TwitchApi;
    app = Fastify({ logger: false });
    registerAuthRoutes({
      app,
      config,
      sessions,
      rounds,
      twitchApi: fakeTwitchApi,
      connectionStatus: () => "connected",
    });
    await app.ready();
  });

  afterAll(async () => {
    await app?.close();
    await database?.close();
  });

  it("rejects OAuth state mismatch before exchanging a Twitch code", async () => {
    const started = await app.inject({
      method: "GET",
      url: "/api/auth/twitch/start",
    });
    const stateCookie = findCookie(
      started.headers["set-cookie"],
      "cluenite_oauth_state",
    );
    const response = await app.inject({
      method: "GET",
      url: `/api/auth/twitch/callback?code=not-a-real-code&state=${"x".repeat(43)}`,
      headers: { cookie: `cluenite_oauth_state=${stateCookie}` },
    });

    expect(response.statusCode).toBe(403);
    expect(exchangeCode).not.toHaveBeenCalled();
  });

  it("handles Twitch denial without exchanging a code and rejects expired app sessions", async () => {
    const started = await app.inject({
      method: "GET",
      url: "/api/auth/twitch/start",
    });
    const stateCookie = findCookie(
      started.headers["set-cookie"],
      "cluenite_oauth_state",
    );
    const denied = await app.inject({
      method: "GET",
      url: "/api/auth/twitch/callback?error=access_denied&state=ignored",
      headers: { cookie: `cluenite_oauth_state=${stateCookie}` },
    });
    expect(denied.statusCode).toBe(400);
    expect(exchangeCode).not.toHaveBeenCalled();

    await database.pool.query(
      `INSERT INTO twitch_accounts (
         twitch_user_id, login, display_name,
         access_token_ciphertext, access_token_iv, access_token_tag,
         refresh_token_ciphertext, refresh_token_iv, refresh_token_tag, token_expires_at
       ) VALUES ($1, 'expiryhost', 'Expiry Host', 'cipher', 'iv', 'tag', 'cipher', 'iv', 'tag', now() + interval '1 hour')
       ON CONFLICT (twitch_user_id) DO NOTHING`,
      ["300000001"],
    );
    const created = await sessions.createHostSession("300000001");
    await database.pool.query(
      "UPDATE user_sessions SET expires_at = now() - interval '1 second' WHERE token_hash = $1",
      [
        hashOpaqueToken(
          created.token,
          Buffer.from(hostKeys.SESSION_SIGNING_SECRET),
          "host-session",
        ),
      ],
    );
    expect(await sessions.resolveHostSession(created.token)).toBeNull();
  });

  it("authenticates a host, enforces CSRF and ownership, and scopes overlay tokens read-only", async () => {
    const started = await app.inject({
      method: "GET",
      url: "/api/auth/twitch/start",
    });
    const stateCookie = findCookie(
      started.headers["set-cookie"],
      "cluenite_oauth_state",
    );
    const state = new URL(started.headers.location!).searchParams.get("state");
    expect(state).toBe(stateCookie);

    const callback = await app.inject({
      method: "GET",
      url: `/api/auth/twitch/callback?code=opaque-code&state=${state}`,
      headers: { cookie: `cluenite_oauth_state=${stateCookie}` },
    });
    expect(callback.statusCode).toBe(302);
    const hostToken = findCookie(
      callback.headers["set-cookie"],
      "cluenite_session",
    );
    const cookie = `cluenite_session=${hostToken}`;
    const me = await app.inject({
      method: "GET",
      url: "/api/me",
      headers: { cookie },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json().profile.displayName).toBe("Cluenite Host");

    const missingCsrf = await app.inject({
      method: "POST",
      url: "/api/sessions",
      headers: {
        cookie,
        origin: "http://localhost:5173",
        "idempotency-key": "session-create-key-001",
      },
      payload: { caseId: "Q01_GALLERY_SHADOW" },
    });
    expect(missingCsrf.statusCode).toBe(403);

    const csrfToken = me.json().csrfToken as string;
    const created = await app.inject({
      method: "POST",
      url: "/api/sessions",
      headers: {
        cookie,
        origin: "http://localhost:5173",
        "x-csrf-token": csrfToken,
        "idempotency-key": "session-create-key-002",
      },
      payload: { caseId: "Q01_GALLERY_SHADOW" },
    });
    expect(created.statusCode).toBe(201);
    const sessionId = created.json().snapshot.sessionId as string;

    const unsupportedCase = await app.inject({
      method: "POST",
      url: "/api/sessions",
      headers: {
        cookie,
        origin: "http://localhost:5173",
        "x-csrf-token": csrfToken,
        "idempotency-key": "session-create-key-003",
      },
      payload: { caseId: "Q99_MISSING_CASE" },
    });
    expect(unsupportedCase.statusCode).toBe(404);

    const ownedSnapshot = await app.inject({
      method: "GET",
      url: `/api/sessions/${sessionId}/snapshot`,
      headers: { cookie },
    });
    expect(ownedSnapshot.statusCode).toBe(200);
    const unauthenticatedDiagnostics = await app.inject({
      method: "GET",
      url: "/api/ops/diagnostics",
    });
    const diagnostics = await app.inject({
      method: "GET",
      url: "/api/ops/diagnostics",
      headers: { cookie },
    });

    const foreignId = "299999999";
    await database.pool.query(
      `INSERT INTO twitch_accounts (
         twitch_user_id, login, display_name,
         access_token_ciphertext, access_token_iv, access_token_tag,
         refresh_token_ciphertext, refresh_token_iv, refresh_token_tag, token_expires_at
       ) VALUES ($1, 'otherhost', 'Other Host', 'cipher', 'iv', 'tag', 'cipher', 'iv', 'tag', now() + interval '1 hour')`,
      [foreignId],
    );
    const foreignSession = await rounds.create({
      hostTwitchId: foreignId,
      caseId: "Q01_GALLERY_SHADOW",
      idempotencyKey: "foreign-session-create-001",
    });
    const crossOwnerRead = await app.inject({
      method: "GET",
      url: `/api/sessions/${foreignSession.sessionId}/snapshot`,
      headers: { cookie },
    });
    expect(crossOwnerRead.statusCode).toBe(404);
    const scopedDiagnostics = await app.inject({
      method: "GET",
      url: "/api/ops/diagnostics",
      headers: { cookie },
    });
    expect(scopedDiagnostics.statusCode).toBe(200);
    expect(
      scopedDiagnostics
        .json()
        .sessions.map((session: { sessionId: string }) => session.sessionId),
    ).not.toContain(foreignSession.sessionId);

    const overlayResponse = await app.inject({
      method: "POST",
      url: `/api/sessions/${sessionId}/overlay-credential`,
      headers: {
        cookie,
        origin: "http://localhost:5173",
        "x-csrf-token": csrfToken,
        "idempotency-key": "overlay-create-key-001",
      },
    });
    expect(overlayResponse.statusCode).toBe(201);
    const overlayUrl = new URL(overlayResponse.json().url as string);
    const overlayToken = new URLSearchParams(overlayUrl.hash.slice(1)).get(
      "overlay",
    );
    expect(overlayToken).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const overlayRead = await app.inject({
      method: "GET",
      url: `/api/sessions/${sessionId}/snapshot`,
      headers: { authorization: `Bearer ${overlayToken}` },
    });
    expect(overlayRead.statusCode).toBe(200);
    const overlayMutation = await app.inject({
      method: "POST",
      url: `/api/sessions/${sessionId}/start`,
      headers: {
        authorization: `Bearer ${overlayToken}`,
        origin: "http://localhost:5173",
      },
    });
    expect(overlayMutation.statusCode).toBe(401);

    const replay = await app.inject({
      method: "POST",
      url: `/api/sessions/${sessionId}/overlay-credential`,
      headers: {
        cookie,
        origin: "http://localhost:5173",
        "x-csrf-token": csrfToken,
        "idempotency-key": "overlay-create-key-001",
      },
    });
    expect(replay.statusCode).toBe(409);

    await rounds.control({
      sessionId,
      hostTwitchId: userId,
      action: "stop",
      idempotencyKey: "auth-session-stop-001",
    });

    expect(unauthenticatedDiagnostics.statusCode).toBe(401);
    expect(diagnostics.statusCode).toBe(200);
    expect(diagnostics.json()).toMatchObject({
      database: { healthy: true },
      sessions: [
        expect.objectContaining({
          sessionId,
          caseId: "Q01_GALLERY_SHADOW",
          phase: "READY",
          revision: 1,
          pendingOutboxCount: 1,
        }),
      ],
    });
    expect(diagnostics.json().twitch).toHaveProperty("activeSubscriptions");
    expect(diagnostics.json().twitch).toHaveProperty("lastNotificationAt");
    expect(JSON.stringify(diagnostics.json())).not.toContain("accessToken");

    const logout = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      headers: {
        cookie,
        origin: "http://localhost:5173",
        "x-csrf-token": csrfToken,
      },
    });
    expect(logout.statusCode).toBe(204);
    const afterLogout = await app.inject({
      method: "GET",
      url: "/api/me",
      headers: { cookie },
    });
    expect(afterLogout.statusCode).toBe(401);
  });

  it("requires explicit, token-backed co-op invitation acceptance by the named broadcaster", async () => {
    const started = await app.inject({
      method: "GET",
      url: "/api/auth/twitch/start",
    });
    const stateCookie = findCookie(
      started.headers["set-cookie"],
      "cluenite_oauth_state",
    );
    const state = new URL(started.headers.location!).searchParams.get("state");
    const callback = await app.inject({
      method: "GET",
      url: `/api/auth/twitch/callback?code=coop-host-code&state=${state}`,
      headers: { cookie: `cluenite_oauth_state=${stateCookie}` },
    });
    const hostCookie = `cluenite_session=${findCookie(callback.headers["set-cookie"], "cluenite_session")}`;
    const hostMe = await app.inject({
      method: "GET",
      url: "/api/me",
      headers: { cookie: hostCookie },
    });
    const hostCsrf = hostMe.json().csrfToken as string;
    const created = await app.inject({
      method: "POST",
      url: "/api/sessions",
      headers: {
        cookie: hostCookie,
        origin: "http://localhost:5173",
        "x-csrf-token": hostCsrf,
        "idempotency-key": "coop-session-create-key-001",
      },
      payload: { caseId: "C01_HARBOR_SIGNAL" },
    });
    expect(created.statusCode).toBe(201);
    const sessionId = created.json().snapshot.sessionId as string;

    const inviteeId = "188888888";
    await sessions.saveTwitchAccount(
      { id: inviteeId, login: "cohost", displayName: "Co Host" },
      {
        accessToken: "cohost-access-token",
        refreshToken: "cohost-refresh-token",
        expiresIn: 3600,
        scopes: ["user:read:chat"],
      },
    );
    const inviteeSession = await sessions.createHostSession(inviteeId);
    const invite = await app.inject({
      method: "POST",
      url: "/api/coops/invitations",
      headers: {
        cookie: hostCookie,
        origin: "http://localhost:5173",
        "x-csrf-token": hostCsrf,
        "idempotency-key": "coop-invite-create-key-001",
      },
      payload: { sessionId, inviteeTwitchId: inviteeId },
    });
    expect(invite.statusCode).toBe(201);
    const inviteId = invite.json().inviteId as string;
    const inviteToken = invite.json().token as string;

    const wrongAccount = await app.inject({
      method: "POST",
      url: `/api/coops/invitations/${inviteId}/accept`,
      headers: {
        cookie: hostCookie,
        origin: "http://localhost:5173",
        "x-csrf-token": hostCsrf,
        "idempotency-key": "coop-invite-accept-host-001",
      },
      payload: { token: inviteToken },
    });
    expect(wrongAccount.statusCode).toBe(404);

    const accepted = await app.inject({
      method: "POST",
      url: `/api/coops/invitations/${inviteId}/accept`,
      headers: {
        cookie: `cluenite_session=${inviteeSession.token}`,
        origin: "http://localhost:5173",
        "x-csrf-token": inviteeSession.csrfToken,
        "idempotency-key": "coop-invite-accept-b-001",
      },
      payload: { token: inviteToken },
    });
    expect(accepted.statusCode).toBe(200);
    expect(accepted.json()).toMatchObject({ accepted: true, sessionId });

    const inviteeSnapshot = await app.inject({
      method: "GET",
      url: `/api/sessions/${sessionId}/snapshot`,
      headers: { cookie: `cluenite_session=${inviteeSession.token}` },
    });
    expect(inviteeSnapshot.statusCode).toBe(200);
    expect(inviteeSnapshot.json().snapshot.team).toBe("B");
    expect(
      inviteeSnapshot
        .json()
        .snapshot.clues.map((clue: { id: string }) => clue.id),
    ).toEqual(["RADAR", "MANUAL"]);

    await rounds.control({
      sessionId,
      hostTwitchId: userId,
      action: "start",
      idempotencyKey: "coop-session-start-before-rejoin-001",
    });
    const teamAScan = await rounds.applyInput({
      sessionId,
      inputId: "coop-rejoin-a-scan-001",
      actorTwitchId: "viewer-a",
      text: "!scan P4",
      source: "twitch",
      channelId: userId,
      originBroadcasterId: userId,
      sourceMessageId: "coop-rejoin-a-message-001",
    });

    await sessions.markTwitchRevoked(inviteeId);
    const revokedSnapshot = await app.inject({
      method: "GET",
      url: `/api/sessions/${sessionId}/snapshot`,
      headers: { cookie: `cluenite_session=${inviteeSession.token}` },
    });
    expect(revokedSnapshot.statusCode).toBe(404);
    const teamBWhileRevoked = await rounds.applyInput({
      sessionId,
      inputId: "coop-rejoin-b-offline-001",
      actorTwitchId: "viewer-b",
      text: "!verify B17",
      source: "twitch",
      channelId: inviteeId,
      originBroadcasterId: inviteeId,
      sourceMessageId: "coop-rejoin-b-offline-message-001",
    });
    await sessions.saveTwitchAccount(
      { id: inviteeId, login: "cohost", displayName: "Co Host" },
      {
        accessToken: "cohost-reauth-access-token",
        refreshToken: "cohost-reauth-refresh-token",
        expiresIn: 3600,
        scopes: ["user:read:chat"],
      },
    );
    const reauthSession = await sessions.createHostSession(inviteeId);
    const rejoinHeaders = {
      cookie: `cluenite_session=${reauthSession.token}`,
      origin: "http://localhost:5173",
      "x-csrf-token": reauthSession.csrfToken,
      "idempotency-key": "coop-rejoin-b-001",
    };
    const rejoined = await app.inject({
      method: "POST",
      url: `/api/coops/sessions/${sessionId}/rejoin`,
      headers: rejoinHeaders,
    });
    const rejoinReplay = await app.inject({
      method: "POST",
      url: `/api/coops/sessions/${sessionId}/rejoin`,
      headers: rejoinHeaders,
    });
    const teamBAfterRejoin = await rounds.applyInput({
      sessionId,
      inputId: "coop-rejoin-b-verify-001",
      actorTwitchId: "viewer-b",
      text: "!verify B17",
      source: "twitch",
      channelId: inviteeId,
      originBroadcasterId: inviteeId,
      sourceMessageId: "coop-rejoin-b-message-001",
    });

    const phase = await database.pool.query<{ phase: string }>(
      "SELECT phase FROM game_sessions WHERE id = $1",
      [sessionId],
    );
    await rounds.control({
      sessionId,
      hostTwitchId: userId,
      action: "stop",
      idempotencyKey: "coop-session-stop-key-001",
    });
    expect(rejoined.statusCode).toBe(200);
    expect(rejoined.json()).toMatchObject({
      alreadyRejoined: false,
      snapshot: { sessionId, team: "B", phase: "ACTIVE" },
    });
    expect(rejoined.json().snapshot.revision).toBe(teamAScan.revision + 1);
    expect(rejoinReplay.statusCode).toBe(200);
    expect(rejoinReplay.json()).toMatchObject({ alreadyRejoined: true });
    expect(teamAScan.code).toBe("ACCEPTED_NEW");
    expect(teamBWhileRevoked.code).not.toBe("ACCEPTED_NEW");
    expect(teamBAfterRejoin.code).toBe("ACCEPTED_NEW");
    expect(teamBAfterRejoin.revision).toBe(
      rejoined.json().snapshot.revision + 1,
    );
    expect(phase.rows[0]?.phase).toBe("ACTIVE");
  });

  it("lets only the invited broadcaster decline a co-op invitation idempotently", async () => {
    const started = await app.inject({
      method: "GET",
      url: "/api/auth/twitch/start",
    });
    const stateCookie = findCookie(
      started.headers["set-cookie"],
      "cluenite_oauth_state",
    );
    const state = new URL(started.headers.location!).searchParams.get("state");
    const callback = await app.inject({
      method: "GET",
      url: `/api/auth/twitch/callback?code=decline-host-code&state=${state}`,
      headers: { cookie: `cluenite_oauth_state=${stateCookie}` },
    });
    const hostCookie = `cluenite_session=${findCookie(callback.headers["set-cookie"], "cluenite_session")}`;
    const hostMe = await app.inject({
      method: "GET",
      url: "/api/me",
      headers: { cookie: hostCookie },
    });
    const hostCsrf = hostMe.json().csrfToken as string;
    const created = await app.inject({
      method: "POST",
      url: "/api/sessions",
      headers: {
        cookie: hostCookie,
        origin: "http://localhost:5173",
        "x-csrf-token": hostCsrf,
        "idempotency-key": "decline-session-create-key-001",
      },
      payload: { caseId: "C01_HARBOR_SIGNAL" },
    });
    const sessionId = created.json().snapshot.sessionId as string;
    const inviteeId = "177777777";
    await sessions.saveTwitchAccount(
      { id: inviteeId, login: "declinee", displayName: "Declining Host" },
      {
        accessToken: "declinee-access-token",
        refreshToken: "declinee-refresh-token",
        expiresIn: 3600,
        scopes: ["user:read:chat"],
      },
    );
    const inviteeSession = await sessions.createHostSession(inviteeId);
    const invitation = await app.inject({
      method: "POST",
      url: "/api/coops/invitations",
      headers: {
        cookie: hostCookie,
        origin: "http://localhost:5173",
        "x-csrf-token": hostCsrf,
        "idempotency-key": "decline-invite-create-key-001",
      },
      payload: { sessionId, inviteeTwitchId: inviteeId },
    });
    const inviteId = invitation.json().inviteId as string;
    const token = invitation.json().token as string;
    const declineHeaders = {
      cookie: `cluenite_session=${inviteeSession.token}`,
      origin: "http://localhost:5173",
      "x-csrf-token": inviteeSession.csrfToken,
      "idempotency-key": "decline-invite-001",
    };
    const wrongAccount = await app.inject({
      method: "POST",
      url: `/api/coops/invitations/${inviteId}/decline`,
      headers: {
        cookie: hostCookie,
        origin: "http://localhost:5173",
        "x-csrf-token": hostCsrf,
        "idempotency-key": "decline-invite-wrong-account-001",
      },
      payload: { token },
    });
    expect(wrongAccount.statusCode).toBe(404);
    const declined = await app.inject({
      method: "POST",
      url: `/api/coops/invitations/${inviteId}/decline`,
      headers: declineHeaders,
      payload: { token },
    });
    await rounds.control({
      sessionId,
      hostTwitchId: userId,
      action: "stop",
      idempotencyKey: "decline-session-stop-key-001",
    });
    expect(declined.statusCode).toBe(200);
    expect(declined.json()).toMatchObject({
      declined: true,
      sessionId,
      alreadyDeclined: false,
    });
    const replay = await app.inject({
      method: "POST",
      url: `/api/coops/invitations/${inviteId}/decline`,
      headers: declineHeaders,
      payload: { token },
    });
    expect(replay.statusCode).toBe(200);
    expect(replay.json()).toMatchObject({
      declined: true,
      alreadyDeclined: true,
    });
    const differentKeyReplay = await app.inject({
      method: "POST",
      url: `/api/coops/invitations/${inviteId}/decline`,
      headers: { ...declineHeaders, "idempotency-key": "decline-invite-002" },
      payload: { token },
    });
    expect(differentKeyReplay.statusCode).toBe(409);
  });

  it("disconnects Twitch, erases local tokens, revokes overlays, and pauses the active round", async () => {
    const started = await app.inject({
      method: "GET",
      url: "/api/auth/twitch/start",
    });
    const stateCookie = findCookie(
      started.headers["set-cookie"],
      "cluenite_oauth_state",
    );
    const state = new URL(started.headers.location!).searchParams.get("state");
    const callback = await app.inject({
      method: "GET",
      url: `/api/auth/twitch/callback?code=disconnect-code&state=${state}`,
      headers: { cookie: `cluenite_oauth_state=${stateCookie}` },
    });
    const hostToken = findCookie(
      callback.headers["set-cookie"],
      "cluenite_session",
    );
    const cookie = `cluenite_session=${hostToken}`;
    const me = await app.inject({
      method: "GET",
      url: "/api/me",
      headers: { cookie },
    });
    const csrfToken = me.json().csrfToken as string;
    const session = await rounds.create({
      hostTwitchId: userId,
      caseId: "Q01_GALLERY_SHADOW",
      idempotencyKey: "disconnect-session-create-001",
    });
    await rounds.control({
      sessionId: session.sessionId,
      hostTwitchId: userId,
      action: "start",
      idempotencyKey: "disconnect-session-start-001",
    });
    const overlay = await sessions.createOverlayCredential(
      session.sessionId,
      userId,
      "disconnect-overlay-key-001",
    );
    expect(overlay).not.toBeNull();

    const response = await app.inject({
      method: "POST",
      url: "/api/auth/twitch/disconnect",
      headers: {
        cookie,
        origin: "http://localhost:5173",
        "x-csrf-token": csrfToken,
      },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      disconnected: true,
      providerRevocation: "confirmed",
    });
    expect(revokeToken).toHaveBeenCalledWith("access-token-for-test");
    expect(await sessions.loadTwitchAccount(userId)).toBeNull();
    expect(await sessions.resolveOverlay(overlay!.token)).toBeNull();
    const phase = await database.pool.query<{ phase: string }>(
      "SELECT phase FROM game_sessions WHERE id = $1",
      [session.sessionId],
    );
    expect(phase.rows[0]?.phase).toBe("PAUSED");
    expect(
      (await app.inject({ method: "GET", url: "/api/me", headers: { cookie } }))
        .statusCode,
    ).toBe(401);
  });
});
