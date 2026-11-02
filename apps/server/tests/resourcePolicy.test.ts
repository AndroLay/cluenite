import { createServer } from "node:http";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { Server, type Socket } from "socket.io";
import { io as client } from "../../web/node_modules/socket.io-client";
import { describe, it, expect, vi } from "vitest";
import { attachRealtime, startOutboxPublisher } from "../src/realtime.js";
import { parseServerConfig } from "../src/config.js";
import type { SessionStore } from "../src/auth/sessionStore.js";
import type { PostgresRoundRepository } from "../src/db/roundRepository.js";
import type { FastifyBaseLogger } from "fastify";

describe("bounded realtime resource work", () => {
  it("ignores malformed acknowledgement arguments without throwing from an event listener", async () => {
    let authenticate!: (socket: Socket, next: (error?: Error) => void) => void;
    let connected!: (socket: Socket) => void;
    const handlers = new Map<string, (...args: unknown[]) => void>();
    const io = {
      use: (fn: typeof authenticate) => {
        authenticate = fn;
      },
      on: (_event: string, fn: typeof connected) => {
        connected = fn;
      },
      sockets: { sockets: new Map<string, Socket>() },
    } as unknown as Server;
    const socket = {
      id: "fixture",
      data: {},
      handshake: {
        headers: {
          origin: "http://localhost:5173",
          cookie: "cluenite_session=fixture",
        },
        auth: {},
      },
      join: async () => {},
      on: (event: string, fn: (...args: unknown[]) => void) => {
        handlers.set(event, fn);
      },
      disconnect: () => {},
    } as unknown as Socket;
    const sessions = {
      resolveHostSession: async () => ({
        twitchUserId: "123",
        sessionTokenHash: "fixture",
      }),
    } as unknown as SessionStore;
    const lifecycle = attachRealtime(io, {
      config: parseServerConfig({
        DATABASE_URL: "postgresql://localhost/cluenite",
        PUBLIC_ORIGIN: "http://localhost:5173",
      }),
      sessions,
      rounds: {} as PostgresRoundRepository,
    });
    try {
      await new Promise<void>((resolve, reject) =>
        authenticate(socket, (error) => (error ? reject(error) : resolve())),
      );
      connected(socket);
      for (const event of ["session:command", "session:control"])
        expect(() =>
          handlers.get(event)?.({}, "not-an-acknowledgement"),
        ).not.toThrow();
      let response: unknown;
      handlers.get("session:command")?.({}, (value: unknown) => {
        response = value;
      });
      expect(response).toMatchObject({ code: "CONTENT_ERROR" });
    } finally {
      lifecycle.close();
    }
  });
  it("checks another revoked credential while an earlier credential is stalled", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const http = createServer();
    const io = new Server(http);
    let release!: () => void;
    const held = new Promise<void>((r) => {
      release = r;
    });
    let slowChecks = 0;
    const sessions = {
      resolveHostSession: async (token: string) => ({
        twitchUserId: token,
        sessionTokenHash: token,
      }),
      isHostSessionActive: async (_hash: string, userId: string) => {
        if (userId === "slow") {
          slowChecks++;
          await held;
          return true;
        }
        return false;
      },
    } as unknown as SessionStore;
    const lifecycle = attachRealtime(io, {
      config: parseServerConfig({
        DATABASE_URL: "postgresql://localhost/cluenite",
        PUBLIC_ORIGIN: "http://localhost:5173",
      }),
      sessions,
      rounds: {} as PostgresRoundRepository,
    });
    http.listen(0, "127.0.0.1");
    await once(http, "listening");
    const port = (http.address() as { port: number }).port;
    const open = (token: string) =>
      client("http://127.0.0.1:" + port, {
        transports: ["websocket"],
        reconnection: false,
        extraHeaders: {
          Origin: "http://localhost:5173",
          Cookie: "cluenite_session=" + token,
        },
      });
    const slow = open("slow"),
      duplicate = open("slow"),
      revoked = open("revoked");
    try {
      await Promise.all([
        once(slow, "connect"),
        once(duplicate, "connect"),
        once(revoked, "connect"),
      ]);
      await vi.advanceTimersByTimeAsync(30000);
      await delay(20);
      expect(revoked.connected).toBe(false);
      expect(slowChecks).toBe(1);
    } finally {
      lifecycle.close();
      release();
      slow.close();
      duplicate.close();
      revoked.close();
      await new Promise<void>((r) => io.close(() => r()));
      vi.useRealTimers();
    }
  });
  it("rejects a join flood before repeated authorization/database work", async () => {
    const http = createServer();
    const io = new Server(http);
    let checks = 0;
    let release!: () => void;
    const held = new Promise<void>((r) => {
      release = r;
    });
    const sessions = {
      resolveHostSession: async () => ({
        twitchUserId: "123",
        sessionTokenHash: "fixture",
      }),
      isHostSessionActive: async () => {
        checks++;
        await held;
        return true;
      },
    } as unknown as SessionStore;
    const rounds = {
      snapshotForParticipant: async () => null,
    } as unknown as PostgresRoundRepository;
    const lifecycle = attachRealtime(io, {
      config: parseServerConfig({
        DATABASE_URL: "postgresql://localhost/cluenite",
        PUBLIC_ORIGIN: "http://localhost:5173",
      }),
      sessions,
      rounds,
    });
    http.listen(0, "127.0.0.1");
    await once(http, "listening");
    const port = (http.address() as { port: number }).port;
    const socket = client("http://127.0.0.1:" + port, {
      transports: ["websocket"],
      reconnection: false,
      extraHeaders: {
        Origin: "http://localhost:5173",
        Cookie: "cluenite_session=fixture",
      },
    });
    const replies: Promise<{ code?: string; ok?: boolean }>[] = [];
    try {
      await once(socket, "connect");
      for (let i = 0; i < 30; i++)
        replies.push(
          socket
            .timeout(2000)
            .emitWithAck("session:join", {
              sessionId: "bf66e0bb-a767-42fe-86cf-f0cb06d3e012",
            })
            .catch(() => ({ code: "DISCONNECTED" })),
        );
      await delay(30);
      expect(checks).toBeLessThanOrEqual(3);
      release();
      const results = await Promise.all(replies);
      expect(
        results.filter((x) => x.code === "RATE_LIMITED").length,
      ).toBeGreaterThanOrEqual(27);
    } finally {
      release();
      await Promise.all(replies);
      socket.close();
      lifecycle.close();
      await new Promise<void>((r) => io.close(() => r()));
    }
  });

  it("backs off empty outbox polls and still discovers new work within one second", async () => {
    vi.useFakeTimers();
    let polls = 0,
      published = 0;
    let pending = false;
    const message = {
      id: 1,
      eventId: "event",
      sessionId: "session",
      revision: 1,
      snapshotA: { revision: 1 },
      snapshotB: { revision: 1 },
      previousSnapshotA: null,
      previousSnapshotB: null,
    };
    const rounds = {
      claimOutboxBatch: async () => {
        polls++;
        return pending ? [message] : [];
      },
      markOutboxPublished: async () => {
        published++;
        pending = false;
      },
      deferOutbox: async () => {},
    } as unknown as PostgresRoundRepository;
    const io = { to: () => ({ emit: () => {} }) } as unknown as Server;
    const log = { warn: () => {} } as unknown as FastifyBaseLogger;
    const publisher = startOutboxPublisher(io, rounds, log);
    try {
      await vi.advanceTimersByTimeAsync(60000);
      expect(polls).toBeLessThanOrEqual(65);
      pending = true;
      await vi.advanceTimersByTimeAsync(1000);
      expect(published).toBe(1);
    } finally {
      await publisher.close();
      vi.useRealTimers();
    }
  });
});
