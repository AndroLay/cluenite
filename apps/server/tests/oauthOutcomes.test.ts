import Fastify from "fastify";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { registerAuthRoutes } from "../src/auth/routes.js";
import { SessionStore } from "../src/auth/sessionStore.js";
import { parseServerConfig } from "../src/config.js";
import { PostgresRoundRepository } from "../src/db/roundRepository.js";
import type { TwitchApi } from "../src/twitch/twitchApi.js";
import { createIsolatedDatabase } from "./testDatabase.js";

const describeWithDatabase = process.env.DATABASE_URL
  ? describe
  : describe.skip;
const state = "s".repeat(43);
const origin = "http://localhost:5173";
const config = parseServerConfig({
  NODE_ENV: "test",
  PUBLIC_ORIGIN: origin,
  DATABASE_URL: "postgresql://localhost/cluenite",
  TWITCH_CLIENT_ID: "outcome-test-client",
  TWITCH_CLIENT_SECRET: "outcome-test-secret",
  TWITCH_REDIRECT_URI: "http://localhost:10000/api/auth/twitch/callback",
  SESSION_SIGNING_SECRET: "s".repeat(40),
  DATA_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString("base64"),
  OVERLAY_TOKEN_SIGNING_KEY: "o".repeat(40),
});

describeWithDatabase("browser OAuth outcomes", () => {
  let database: Awaited<ReturnType<typeof createIsolatedDatabase>>;
  let app: ReturnType<typeof Fastify>;
  let sessions: SessionStore;
  let exchangeCode: ReturnType<typeof vi.fn>;
  let api: TwitchApi;

  function makeApp(provider: TwitchApi | null) {
    const server = Fastify({ logger: false });
    registerAuthRoutes({
      app: server,
      config,
      sessions,
      rounds: new PostgresRoundRepository(database.pool),
      twitchApi: provider,
    });
    return server;
  }

  beforeAll(async () => {
    database = await createIsolatedDatabase();
    sessions = new SessionStore(
      database.pool,
      Buffer.from("s".repeat(40)),
      Buffer.alloc(32, 9),
      Buffer.from("o".repeat(40)),
    );
  });
  beforeEach(() => {
    exchangeCode = vi.fn(async () => ({
      accessToken: "private-access-token",
      refreshToken: "private-refresh-token",
      expiresIn: 3600,
      scopes: ["user:read:chat"],
    }));
    api = {
      authorizationUrl: (nonce: string) =>
        new URL(`https://id.twitch.tv/oauth2/authorize?state=${nonce}`),
      exchangeCode,
      validateToken: vi.fn(async () => ({
        user_id: "330000002",
        scopes: ["user:read:chat"],
        expires_in: 3600,
      })),
      getCurrentUser: vi.fn(async () => ({
        id: "330000002",
        login: "outcomehost",
        displayName: "Outcome Host",
      })),
    } as unknown as TwitchApi;
    app = makeApp(api);
  });
  afterEach(async () => {
    await app.close();
  });
  afterAll(async () => {
    await database?.close();
  });

  it("limits authenticated mutations per account across multiple host cookies", async () => {
    const id = "330000003";
    await sessions.saveTwitchAccount(
      { id, login: "limitedhost", displayName: "Limited Host" },
      {
        accessToken: "test-access",
        refreshToken: "test-refresh",
        expiresIn: 3600,
        scopes: ["user:read:chat"],
      },
    );
    const cookies = await Promise.all([
      sessions.createHostSession(id),
      sessions.createHostSession(id),
    ]);
    for (let i = 0; i < 60; i++) {
      const credential = cookies[i % 2]!;
      const response = await app.inject({
        method: "POST",
        url: "/api/sessions",
        headers: {
          cookie: `cluenite_session=${credential.token}`,
          origin,
          "x-csrf-token": credential.csrfToken,
          "idempotency-key": "rate-limit-create-key",
        },
        payload: { caseId: "Q01_GALLERY_SHADOW" },
      });
      expect([200, 201]).toContain(response.statusCode);
    }
    const credential = cookies[0]!;
    const blocked = await app.inject({
      method: "POST",
      url: "/api/sessions",
      headers: {
        cookie: `cluenite_session=${credential.token}`,
        origin,
        "x-csrf-token": credential.csrfToken,
        "idempotency-key": "rate-limit-create-key",
      },
      payload: { caseId: "Q01_GALLERY_SHADOW" },
    });
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json()).toEqual({ error: "rate_limited" });
    expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0);
    for (const url of [
      "/api/coops/invitations/00000000-0000-4000-8000-000000000001/accept",
      "/api/sessions/00000000-0000-4000-8000-000000000001/overlay-credential",
    ]) {
      const response = await app.inject({
        method: "POST",
        url,
        headers: {
          cookie: `cluenite_session=${cookies[1]!.token}`,
          origin,
          "x-csrf-token": cookies[1]!.csrfToken,
          "idempotency-key": "limited-mutation-test-key",
        },
        payload: {},
      });
      expect(response.statusCode, url).toBe(429);
    }
    expect(
      (
        await database.pool.query(
          "SELECT 1 FROM game_sessions WHERE host_twitch_id = $1",
          [id],
        )
      ).rowCount,
    ).toBe(1);
  });

  it.each([
    {
      name: "denied consent",
      query: "error=access_denied&error_description=private-marker",
      result: "denied",
    },
    { name: "missing code", query: `state=${state}`, result: "invalid" },
    {
      name: "invalid state",
      query: "code=private-code&state=bad",
      result: "invalid",
    },
    {
      name: "state mismatch",
      query: `code=private-code&state=${"x".repeat(43)}`,
      result: "state_rejected",
    },
  ])(
    "redirects $name without reflecting callback secrets",
    async ({ query, result }) => {
      const response = await app.inject({
        method: "GET",
        url: `/api/auth/twitch/callback?${query}&next=https://example.invalid/`,
        headers: {
          accept: "text/html,application/xhtml+xml",
          cookie: `cluenite_oauth_state=${state}`,
        },
      });
      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe(
        `${origin}/connect?result=${result}`,
      );
      expect(response.headers["set-cookie"]).toContain("Max-Age=0");
      expect(response.headers["cache-control"]).toBe("no-store");
      expect(response.headers.vary).toContain("Accept");
      expect(exchangeCode).not.toHaveBeenCalled();
    },
  );

  it("redirects successful browser authorization after creating a real local host session", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/auth/twitch/callback?code=private-code&state=${state}`,
      headers: { accept: "text/html", cookie: `cluenite_oauth_state=${state}` },
    });
    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe(
      `${origin}/connect?result=connected`,
    );
    expect(response.headers["referrer-policy"]).toBe("no-referrer");
    const cookieHeaders = response.headers["set-cookie"];
    const cookies = Array.isArray(cookieHeaders)
      ? cookieHeaders
      : [cookieHeaders ?? ""];
    const hostCookie = cookies
      .find((value) => value.startsWith("cluenite_session="))
      ?.split(";")[0];
    expect(hostCookie).toBeTruthy();
    const me = await app.inject({
      method: "GET",
      url: "/api/me",
      headers: { cookie: hostCookie! },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json().profile.login).toBe("outcomehost");
    expect(response.headers.location).not.toContain("private-");
  });

  it("redirects an exchange failure without exposing the provider error", async () => {
    exchangeCode.mockRejectedValueOnce(new Error("private-provider-marker"));
    const response = await app.inject({
      method: "GET",
      url: `/api/auth/twitch/callback?code=private-code&state=${state}`,
      headers: { accept: "text/html", cookie: `cluenite_oauth_state=${state}` },
    });
    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe(
      `${origin}/connect?result=exchange_failed`,
    );
    expect(response.body).not.toContain("private-provider-marker");
  });

  it.each(["/api/auth/twitch/start", "/api/auth/twitch/callback"])(
    "redirects unavailable OAuth at %s",
    async (url) => {
      await app.close();
      app = makeApp(null);
      const response = await app.inject({
        method: "GET",
        url,
        headers: { accept: "text/html" },
      });
      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe(
        `${origin}/connect?result=unavailable`,
      );
    },
  );

  it.each([
    undefined,
    "application/json",
    "text/html;q=0,application/json",
    "text/html;q=0.1,application/json;q=1",
  ])("preserves JSON failure semantics for Accept %s", async (accept) => {
    const response = await app.inject({
      method: "GET",
      url: "/api/auth/twitch/callback?error=access_denied",
      headers: accept ? { accept } : {},
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "twitch_authorization_failed" });
    expect(response.headers.location).toBeUndefined();
  });
});
