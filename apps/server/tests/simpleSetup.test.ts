import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { registerAuthRoutes } from "../src/auth/routes.js";
import { SessionStore } from "../src/auth/sessionStore.js";
import { hashOpaqueToken } from "../src/auth/crypto.js";
import { parseServerConfig } from "../src/config.js";
import { PostgresRoundRepository } from "../src/db/roundRepository.js";
import { TwitchApi } from "../src/twitch/twitchApi.js";
import { createIsolatedDatabase } from "./testDatabase.js";

const withDatabase = process.env.DATABASE_URL ? describe : describe.skip;
const origin = "http://localhost:5173";
const key = Buffer.from("o".repeat(40));
let identityCounter = 8_000_000;

withDatabase("simple setup and session recovery", () => {
  let database: Awaited<ReturnType<typeof createIsolatedDatabase>>;
  let app: ReturnType<typeof Fastify>;
  let rounds: PostgresRoundRepository;
  let sessions: SessionStore;
  let lookupMode:
    | "found"
    | "missing"
    | "unavailable"
    | "mismatch"
    | "expired"
    | "malformed"
    | "multiple";
  let lookedUp: string[];
  let partner: Awaited<ReturnType<typeof principal>>;

  async function principal(login: string) {
    const id = String(++identityCounter);
    await sessions.saveTwitchAccount(
      { id, login, displayName: login },
      {
        accessToken: "fixture-access-" + id,
        refreshToken: "fixture-refresh-" + id,
        scopes: ["user:read:chat"],
        expiresIn: 3600,
      },
    );
    return { id, login, ...(await sessions.createHostSession(id)) };
  }
  function mutation(
    who: Awaited<ReturnType<typeof principal>>,
    url: string,
    payload: unknown,
  ) {
    return app.inject({
      method: "POST",
      url,
      payload,
      headers: {
        cookie: "cluenite_session=" + who.token,
        origin,
        "x-csrf-token": who.csrfToken,
        "idempotency-key": randomUUID(),
      },
    });
  }
  function listing(who: Awaited<ReturnType<typeof principal>>, query = "") {
    return app.inject({
      method: "GET",
      url: "/api/sessions" + query,
      headers: { cookie: "cluenite_session=" + who.token },
    });
  }
  async function coop(owner: Awaited<ReturnType<typeof principal>>) {
    return rounds.create({
      hostTwitchId: owner.id,
      caseId: "C01_HARBOR_SIGNAL",
      idempotencyKey: randomUUID(),
    });
  }
  beforeAll(async () => {
    database = await createIsolatedDatabase();
    sessions = new SessionStore(
      database.pool,
      Buffer.from("s".repeat(40)),
      Buffer.alloc(32, 7),
      key,
    );
    rounds = new PostgresRoundRepository(database.pool);
  });
  beforeEach(async () => {
    lookupMode = "found";
    lookedUp = [];
    partner = await principal("simplepartner");
    const config = parseServerConfig({
      NODE_ENV: "test",
      PUBLIC_ORIGIN: origin,
      DATABASE_URL: "postgresql://localhost/cluenite",
      SESSION_SIGNING_SECRET: "s".repeat(40),
      DATA_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
      OVERLAY_TOKEN_SIGNING_KEY: key.toString(),
      TWITCH_CLIENT_ID: "fixture-client",
      TWITCH_CLIENT_SECRET: "fixture-secret",
      TWITCH_REDIRECT_URI: "http://localhost:10000/api/auth/twitch/callback",
    });
    const twitchApi = new TwitchApi(config.twitch!, async (input) => {
      const url = new URL(String(input));
      lookedUp.push(url.searchParams.get("login") ?? "");
      if (lookupMode === "unavailable")
        return new Response("", { status: 503 });
      if (lookupMode === "expired") return new Response("", { status: 401 });
      if (lookupMode === "malformed") return Response.json({ data: [{}] });
      if (lookupMode === "multiple") return Response.json({ data: [{}, {}] });
      const data =
        lookupMode === "missing"
          ? []
          : [
              {
                id: partner.id,
                login:
                  lookupMode === "mismatch" ? "someoneelse" : partner.login,
                display_name: "Simple Partner",
                email: "private-fixture@example.invalid",
              },
            ];
      return Response.json({ data });
    });
    app = Fastify({ logger: false });
    registerAuthRoutes({ app, config, sessions, rounds, twitchApi });
    await app.ready();
  });
  afterEach(async () => {
    await app.close();
  });
  afterAll(async () => {
    await database?.close();
  });

  it("invites a normalized Twitch username and returns a usable fragment-only link", async () => {
    const owner = await principal("simpleowner");
    const round = await coop(owner);
    const created = await mutation(owner, "/api/coops/invitations", {
      sessionId: round.sessionId,
      inviteeLogin: " @SimplePartner ",
    });
    expect(created.statusCode).toBe(201);
    const invite = created.json();
    const url = new URL(invite.url);
    expect(url.origin + url.pathname).toBe(origin + "/coop/invite");
    expect(url.searchParams.get("invite")).toBe(invite.inviteId);
    expect(url.searchParams.has("token")).toBe(false);
    expect(new URLSearchParams(url.hash.slice(1)).get("token")).toBe(
      invite.token,
    );
    expect(invite.invitee).toEqual({
      id: partner.id,
      login: "simplepartner",
      displayName: "Simple Partner",
    });
    expect(lookedUp).toEqual(["simplepartner"]);
    const accepted = await mutation(
      partner,
      "/api/coops/invitations/" + invite.inviteId + "/accept",
      { token: invite.token },
    );
    expect(accepted.statusCode).toBe(200);
    expect(accepted.json()).toMatchObject({
      accepted: true,
      sessionId: round.sessionId,
    });
    expect(
      (await rounds.snapshotForParticipant(round.sessionId, partner.id))?.team,
    ).toBe("B");
  });

  it("preserves numeric-ID invitations without a provider lookup", async () => {
    const owner = await principal("legacyowner");
    const round = await coop(owner);
    const created = await mutation(owner, "/api/coops/invitations", {
      sessionId: round.sessionId,
      inviteeTwitchId: partner.id,
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().url).toContain("/coop/invite?invite=");
    expect(lookedUp).toEqual([]);
  });

  it("rejects ambiguous targets and non-owners before any provider lookup", async () => {
    const owner = await principal("protectedowner");
    const round = await coop(owner);
    const ambiguous = await mutation(owner, "/api/coops/invitations", {
      sessionId: round.sessionId,
      inviteeTwitchId: partner.id,
      inviteeLogin: partner.login,
    });
    expect(ambiguous.statusCode).toBe(400);
    const denied = await mutation(partner, "/api/coops/invitations", {
      sessionId: round.sessionId,
      inviteeLogin: "otherperson",
    });
    expect(denied.statusCode).toBe(404);
    expect(lookedUp).toEqual([]);
    const rows = await database.pool.query(
      "SELECT id FROM coop_invites WHERE session_id=$1",
      [round.sessionId],
    );
    expect(rows.rows).toEqual([]);
  });

  it("rejects invalid usernames without contacting Twitch or creating invitations", async () => {
    const owner = await principal("invalidtargetowner");
    const round = await coop(owner);
    for (const inviteeLogin of [
      "",
      "@@partner",
      "person@example.invalid",
      "name&login=other",
    ]) {
      const response = await mutation(owner, "/api/coops/invitations", {
        sessionId: round.sessionId,
        inviteeLogin,
      });
      expect(response.statusCode).toBe(400);
    }
    expect(lookedUp).toEqual([]);
    expect(
      (
        await database.pool.query(
          "SELECT id FROM coop_invites WHERE session_id=$1",
          [round.sessionId],
        )
      ).rows,
    ).toEqual([]);
  });

  it.each([
    ["missing", 404, "twitch_user_not_found"],
    ["unavailable", 503, "twitch_lookup_unavailable"],
    ["mismatch", 503, "twitch_lookup_unavailable"],
    ["expired", 503, "twitch_connection_recovering"],
    ["malformed", 503, "twitch_lookup_unavailable"],
    ["multiple", 503, "twitch_lookup_unavailable"],
  ] as const)(
    "does not create an invitation when username lookup is %s",
    async (mode, status, error) => {
      lookupMode = mode;
      const owner = await principal("lookupowner");
      const round = await coop(owner);
      const response = await mutation(owner, "/api/coops/invitations", {
        sessionId: round.sessionId,
        inviteeLogin: partner.login,
      });
      expect(response.statusCode).toBe(status);
      expect(response.json()).toEqual({ error });
      if (mode === "expired") {
        expect(response.headers["retry-after"]).toBe("2");
        expect(await sessions.loadTwitchAccount(owner.id)).not.toBeNull();
      }
      expect(
        (
          await database.pool.query(
            "SELECT id FROM coop_invites WHERE session_id=$1",
            [round.sessionId],
          )
        ).rows,
      ).toEqual([]);
    },
  );

  it("rediscovers only the signed-in owner's sessions and bounds optional recent history", async () => {
    const owner = await principal("recoverowner");
    const stranger = await principal("unrelatedowner");
    const old = await rounds.create({
      hostTwitchId: owner.id,
      caseId: "Q01_GALLERY_SHADOW",
      idempotencyKey: randomUUID(),
    });
    await rounds.control({
      sessionId: old.sessionId,
      hostTwitchId: owner.id,
      action: "stop",
      idempotencyKey: randomUUID(),
    });
    const current = await rounds.create({
      hostTwitchId: owner.id,
      caseId: "M01_MISSING_TROPHY",
      idempotencyKey: randomUUID(),
    });
    await coop(stranger);
    const response = await listing(owner);
    expect(response.statusCode).toBe(200);
    expect(response.json().sessions).toEqual([
      expect.objectContaining({
        sessionId: current.sessionId,
        phase: "READY",
        team: "A",
        role: "host",
        needsRejoin: false,
      }),
    ]);
    expect(response.json().sessions[0]).not.toHaveProperty("state");
    const recent = await listing(owner, "?status=all&limit=1");
    expect(recent.statusCode).toBe(200);
    expect(recent.json().sessions).toHaveLength(1);
    const all = await listing(owner, "?status=all");
    expect(
      all
        .json()
        .sessions.map((x: { sessionId: string }) => x.sessionId)
        .sort(),
    ).toEqual([old.sessionId, current.sessionId].sort());
    expect((await listing(owner, "?limit=10000")).statusCode).toBe(400);
    expect(
      (await app.inject({ method: "GET", url: "/api/sessions" })).statusCode,
    ).toBe(401);
  });

  it("finds an accepted partner's revoked open membership for explicit rejoin without granting snapshot access", async () => {
    const owner = await principal("coastowner");
    const outsider = await principal("outsider");
    const round = await coop(owner);
    const token = "t".repeat(43);
    const invite = await rounds.createCoopInvitation({
      sessionId: round.sessionId,
      inviterTwitchId: owner.id,
      inviteeTwitchId: partner.id,
      tokenHash: hashOpaqueToken(token, key, "coop-invite"),
      idempotencyKey: randomUUID(),
    });
    await rounds.acceptCoopInvitation({
      inviteId: invite!.inviteId,
      inviteeTwitchId: partner.id,
      tokenHash: hashOpaqueToken(token, key, "coop-invite"),
      idempotencyKey: randomUUID(),
    });
    await sessions.markTwitchRevoked(partner.id);
    await sessions.saveTwitchAccount(
      { id: partner.id, login: partner.login, displayName: "Simple Partner" },
      {
        accessToken: "new-fixture-access",
        refreshToken: "new-fixture-refresh",
        scopes: ["user:read:chat"],
        expiresIn: 3600,
      },
    );
    partner = {
      id: partner.id,
      login: partner.login,
      ...(await sessions.createHostSession(partner.id)),
    };
    const listed = await listing(partner);
    expect(listed.statusCode).toBe(200);
    expect(listed.json().sessions).toEqual([
      expect.objectContaining({
        sessionId: round.sessionId,
        role: "partner",
        team: "B",
        needsRejoin: true,
      }),
    ]);
    expect(
      await rounds.snapshotForParticipant(round.sessionId, partner.id),
    ).toBeNull();
    expect((await listing(outsider)).json().sessions).toEqual([]);
    const joined = await mutation(
      partner,
      "/api/coops/sessions/" + round.sessionId + "/rejoin",
      {},
    );
    expect(joined.statusCode).toBe(200);
    expect((await listing(partner)).json().sessions[0].needsRejoin).toBe(false);
  });
});
