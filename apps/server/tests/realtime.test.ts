import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import {
  io as socketClient,
  type Socket as ClientSocket,
} from "../../web/node_modules/socket.io-client";
import { Server as SocketServer } from "socket.io";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RoundSnapshot } from "@cluenite/contracts";
import { parseServerConfig } from "../src/config.js";
import { SessionStore } from "../src/auth/sessionStore.js";
import { PostgresRoundRepository } from "../src/db/roundRepository.js";
import {
  attachRealtime,
  CONNECTION_STATUS_EVENT,
  DELTA_EVENT,
  RESYNC_REQUIRED_EVENT,
  SNAPSHOT_EVENT,
  startOutboxPublisher,
} from "../src/realtime.js";
import { createIsolatedDatabase } from "./testDatabase.js";

const describeWithDatabase = process.env.DATABASE_URL
  ? describe
  : describe.skip;
const serverKeys = {
  session: "s".repeat(40),
  encryption: Buffer.alloc(32, 5),
  overlay: "o".repeat(40),
};

describeWithDatabase("authorized realtime rooms", () => {
  let database: Awaited<ReturnType<typeof createIsolatedDatabase>>;
  let sessions: SessionStore;
  let rounds: PostgresRoundRepository;
  let ioServer: SocketServer;
  let realtimeLifecycle: ReturnType<typeof attachRealtime>;
  let httpServer: ReturnType<typeof createServer>;
  let publisher: ReturnType<typeof startOutboxPublisher>;
  let address: string;
  let sessionId: string;
  let foreignSessionId: string;
  let hostCookie: string;
  let foreignHostCookie: string;
  let overlayToken: string;
  const clients: ClientSocket[] = [];

  beforeAll(async () => {
    database = await createIsolatedDatabase();
    const config = parseServerConfig({
      NODE_ENV: "test",
      PUBLIC_ORIGIN: "http://127.0.0.1:5173",
      DATABASE_URL: "postgresql://localhost/cluenite_test",
    });
    sessions = new SessionStore(
      database.pool,
      Buffer.from(serverKeys.session),
      serverKeys.encryption,
      Buffer.from(serverKeys.overlay),
    );
    rounds = new PostgresRoundRepository(database.pool);
    const hostId = "1971641";
    const foreignHostId = "299999999";
    for (const [id, login] of [
      [hostId, "host"],
      [foreignHostId, "foreign"],
    ]) {
      await database.pool.query(
        `INSERT INTO twitch_accounts (
           twitch_user_id, login, display_name,
           access_token_ciphertext, access_token_iv, access_token_tag,
           refresh_token_ciphertext, refresh_token_iv, refresh_token_tag,
           token_expires_at
         ) VALUES ($1, $2, $2, 'cipher', 'iv', 'tag', 'cipher', 'iv', 'tag', now() + interval '1 hour')`,
        [id, login],
      );
    }
    hostCookie = `cluenite_session=${(await sessions.createHostSession(hostId)).token}`;
    foreignHostCookie = `cluenite_session=${(await sessions.createHostSession(foreignHostId)).token}`;
    const created = await rounds.create({
      hostTwitchId: hostId,
      caseId: "Q01_GALLERY_SHADOW",
      idempotencyKey: "realtime-session-create-1",
    });
    sessionId = created.sessionId;
    await rounds.control({
      sessionId,
      hostTwitchId: hostId,
      action: "start",
      idempotencyKey: "realtime-session-start-1",
    });
    const foreign = await rounds.create({
      hostTwitchId: foreignHostId,
      caseId: "Q01_GALLERY_SHADOW",
      idempotencyKey: "foreign-session-create-1",
    });
    foreignSessionId = foreign.sessionId;
    const overlay = await sessions.createOverlayCredential(
      sessionId,
      hostId,
      "realtime-overlay-key-001",
    );
    overlayToken = overlay!.token;

    // Historical creation/start events predate these test subscribers.
    await database.pool.query("UPDATE outbox SET published_at = now()");
    httpServer = createServer();
    ioServer = new SocketServer(httpServer, { path: "/socket.io" });
    realtimeLifecycle = attachRealtime(ioServer, {
      config,
      sessions,
      rounds,
      connectionStatusForSession: async () => ({
        provider: "twitch",
        state: "ONLINE",
        since: "2026-11-01T00:00:00.000Z",
      }),
    });
    await new Promise<void>((resolve, reject) => {
      httpServer.listen(0, "127.0.0.1", () => resolve());
      httpServer.once("error", reject);
    });
    const port = (httpServer.address() as AddressInfo).port;
    address = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    for (const client of clients) client.close();
    await publisher?.close();
    realtimeLifecycle?.close();
    if (ioServer)
      await new Promise<void>((resolve) => ioServer.close(() => resolve()));
    await database?.close();
  });

  function makeClient(options: {
    cookie?: string;
    overlayToken?: string;
    origin?: string;
    referer?: string;
    omitOrigin?: boolean;
    transport?: "websocket" | "polling";
    upgrade?: boolean;
  }): ClientSocket {
    const client = socketClient(address, {
      path: "/socket.io",
      transports: [options.transport ?? "websocket"],
      ...(options.upgrade === undefined ? {} : { upgrade: options.upgrade }),
      reconnection: false,
      timeout: 3000,
      extraHeaders: {
        ...(!options.omitOrigin
          ? { Origin: options.origin ?? "http://127.0.0.1:5173" }
          : {}),
        ...(options.referer ? { Referer: options.referer } : {}),
        ...(options.cookie ? { Cookie: options.cookie } : {}),
      },
      ...(options.overlayToken
        ? { auth: { overlayToken: options.overlayToken } }
        : {}),
    });
    clients.push(client);
    return client;
  }

  async function waitForConnect(client: ClientSocket): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      client.once("connect", () => resolve());
      client.once("connect_error", (error) => reject(error));
      client.connect();
    });
  }

  it("rejects missing or foreign origins and unauthenticated sockets", async () => {
    const anonymous = makeClient({});
    await expect(waitForConnect(anonymous)).rejects.toThrow("unauthorized");

    const foreignOrigin = makeClient({
      cookie: hostCookie,
      origin: "http://evil.example",
    });
    await expect(waitForConnect(foreignOrigin)).rejects.toThrow(
      "origin_rejected",
    );

    const missingOrigin = socketClient(address, {
      path: "/socket.io",
      transports: ["websocket"],
      reconnection: false,
      extraHeaders: { Cookie: hostCookie },
    });
    clients.push(missingOrigin);
    await expect(waitForConnect(missingOrigin)).rejects.toThrow(
      "origin_rejected",
    );
  });

  it("accepts exact-origin browser polling when Origin is omitted and Referer is present", async () => {
    const sameOriginPolling = makeClient({
      cookie: hostCookie,
      omitOrigin: true,
      referer: "http://127.0.0.1:5173/?session=browser-polling",
      transport: "polling",
      upgrade: false,
    });
    await waitForConnect(sameOriginPolling);
    const joined = (await sameOriginPolling.emitWithAck("session:join", {
      sessionId,
    })) as { ok: boolean };
    expect(joined.ok).toBe(true);

    const foreignReferer = makeClient({
      cookie: hostCookie,
      omitOrigin: true,
      referer: "https://evil.example/",
      transport: "polling",
      upgrade: false,
    });
    await expect(waitForConnect(foreignReferer)).rejects.toThrow(
      "origin_rejected",
    );

    const mismatchedOrigin = makeClient({
      cookie: hostCookie,
      origin: "https://evil.example",
      referer: "http://127.0.0.1:5173/",
    });
    await expect(waitForConnect(mismatchedOrigin)).rejects.toThrow(
      "origin_rejected",
    );
  });

  it("limits host and overlay rooms, keeps overlay read-only, and broadcasts committed snapshots", async () => {
    const host = makeClient({ cookie: hostCookie });
    const overlay = makeClient({ overlayToken });
    await Promise.all([waitForConnect(host), waitForConnect(overlay)]);

    const hostJoin = (await host.emitWithAck("session:join", {
      sessionId,
    })) as { ok: boolean; snapshot?: RoundSnapshot };
    expect(hostJoin.ok).toBe(true);
    const connectionStatus = new Promise<Record<string, unknown>>(
      (resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("connection status delivery timed out")),
          3000,
        );
        overlay.once(
          CONNECTION_STATUS_EVENT,
          (status: Record<string, unknown>) => {
            clearTimeout(timeout);
            resolve(status);
          },
        );
      },
    );
    const overlayJoin = (await overlay.emitWithAck("session:join", {
      sessionId,
    })) as { ok: boolean; snapshot?: RoundSnapshot };
    expect(overlayJoin.ok).toBe(true);
    await expect(connectionStatus).resolves.toEqual({
      provider: "twitch",
      state: "ONLINE",
      since: "2026-11-01T00:00:00.000Z",
    });
    expect(overlayJoin.snapshot).not.toHaveProperty("solvedBy");

    const foreignHostJoin = (await host.emitWithAck("session:join", {
      sessionId: foreignSessionId,
    })) as { ok: boolean; code?: string };
    const foreignOverlayJoin = (await overlay.emitWithAck("session:join", {
      sessionId: foreignSessionId,
    })) as { ok: boolean; code?: string };
    expect(foreignHostJoin).toMatchObject({ ok: false, code: "NOT_AVAILABLE" });
    expect(foreignOverlayJoin).toMatchObject({
      ok: false,
      code: "NOT_AVAILABLE",
    });

    const denied = await overlay.emitWithAck("session:control", {
      sessionId,
      action: "pause",
    });
    expect(denied).toMatchObject({ code: "NOT_AUTHORIZED" });

    publisher = startOutboxPublisher(ioServer, rounds, {
      warn: () => undefined,
    } as never);
    const pushed = new Promise<RoundSnapshot>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("snapshot outbox delivery timed out")),
        4000,
      );
      overlay.once(SNAPSHOT_EVENT, (snapshot: RoundSnapshot) => {
        clearTimeout(timeout);
        resolve(snapshot);
      });
    });
    const pushedDelta = new Promise<Record<string, unknown>>(
      (resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("realtime delta delivery timed out")),
          4000,
        );
        overlay.once(DELTA_EVENT, (delta: Record<string, unknown>) => {
          clearTimeout(timeout);
          resolve(delta);
        });
      },
    );
    const commandPayload = {
      sessionId,
      text: "!inspect CAM",
      idempotencyKey: "socket-command-retry-0001",
    };
    const command = await host.emitWithAck("session:command", commandPayload);
    expect(command).toMatchObject({ code: "ACCEPTED_NEW" });
    const commandRetry = await host.emitWithAck(
      "session:command",
      commandPayload,
    );
    expect(commandRetry).toEqual(command);
    const changedPayloadRetry = await host.emitWithAck("session:command", {
      ...commandPayload,
      text: "!inspect SCHEDULE",
    });
    expect(changedPayloadRetry).toMatchObject({
      code: "IDEMPOTENCY_CONFLICT",
      reason: "IDEMPOTENCY_KEY_REUSED",
      revision: command.revision,
    });

    const foreignHost = makeClient({ cookie: foreignHostCookie });
    await waitForConnect(foreignHost);
    const foreignRetry = await foreignHost.emitWithAck(
      "session:command",
      commandPayload,
    );
    expect(foreignRetry).toMatchObject({ code: "NOT_AVAILABLE" });
    expect(foreignRetry).not.toEqual(command);

    host.disconnect();
    const reconnectedHost = makeClient({ cookie: hostCookie });
    await waitForConnect(reconnectedHost);
    const reconnectedJoin = (await reconnectedHost.emitWithAck("session:join", {
      sessionId,
    })) as { ok: boolean };
    expect(reconnectedJoin.ok).toBe(true);
    const reconnectRetry = await reconnectedHost.emitWithAck(
      "session:command",
      commandPayload,
    );
    expect(reconnectRetry).toEqual(command);

    const snapshot = await pushed;
    const committed = await rounds.snapshotForHost(sessionId, "1971641");
    expect(snapshot.revision).toBe(committed?.revision);
    expect(
      snapshot.clues.find((clue) => clue.id === "CAM")?.observation,
    ).toContain("R-07");
    const delta = await pushedDelta;
    expect(delta).toMatchObject({
      sessionId,
      previousRevision: overlayJoin.snapshot?.revision,
      revision: snapshot.revision,
      eventId: expect.any(String),
    });
    expect(delta.changes).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "clues" })]),
    );
    expect(delta.cues).toEqual([]);

    const resyncRequired = new Promise<Record<string, unknown>>(
      (resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("revision resync request timed out")),
          3000,
        );
        overlay.once(
          RESYNC_REQUIRED_EVENT,
          (payload: Record<string, unknown>) => {
            clearTimeout(timeout);
            resolve(payload);
          },
        );
      },
    );
    overlay.emit("session:resync", {
      sessionId,
      currentRevision: snapshot.revision - 2,
    });
    await expect(resyncRequired).resolves.toEqual({
      sessionId,
      expectedRevision: snapshot.revision - 1,
      serverRevision: snapshot.revision,
    });

    const legacyHost = makeClient({ cookie: hostCookie });
    await waitForConnect(legacyHost);
    const legacyCommandPayload = { sessionId, text: "!inspect ACCESS" };
    const legacyCommand = await legacyHost.emitWithAck(
      "session:command",
      legacyCommandPayload,
    );
    const legacyCommandRetry = await legacyHost.emitWithAck(
      "session:command",
      legacyCommandPayload,
    );
    expect(legacyCommand).toMatchObject({ code: "ACCEPTED_NEW" });
    expect(legacyCommandRetry).toMatchObject({
      code: "ACCEPTED_ALREADY_KNOWN",
    });
    expect((await rounds.snapshotForHost(sessionId, "1971641"))?.revision).toBe(
      legacyCommand.revision,
    );

    const controlPayload = {
      sessionId,
      action: "pause",
      idempotencyKey: "socket-control-retry-0001",
    };
    const control = await reconnectedHost.emitWithAck(
      "session:control",
      controlPayload,
    );
    const controlRetry = await reconnectedHost.emitWithAck(
      "session:control",
      controlPayload,
    );
    expect(control).toMatchObject({ code: "ACCEPTED_NEW" });
    expect(controlRetry).toEqual(control);
    expect((await rounds.snapshotForHost(sessionId, "1971641"))?.revision).toBe(
      control.revision,
    );

    const legacyControlPayload = { sessionId, action: "resume" as const };
    const legacyControl = await legacyHost.emitWithAck(
      "session:control",
      legacyControlPayload,
    );
    const legacyControlRetry = await legacyHost.emitWithAck(
      "session:control",
      legacyControlPayload,
    );
    expect(legacyControl).toMatchObject({ code: "ACCEPTED_NEW" });
    expect(legacyControlRetry).toMatchObject({
      code: "ACCEPTED_ALREADY_KNOWN",
    });
    expect((await rounds.snapshotForHost(sessionId, "1971641"))?.revision).toBe(
      legacyControl.revision,
    );

    const rawHostToken = hostCookie.slice("cluenite_session=".length);
    await sessions.revokeHostSession(rawHostToken);
    const afterRevocation = await reconnectedHost.emitWithAck(
      "session:control",
      {
        sessionId,
        action: "pause",
      },
    );
    expect(afterRevocation).toMatchObject({ code: "NOT_AUTHORIZED" });
  });
});
