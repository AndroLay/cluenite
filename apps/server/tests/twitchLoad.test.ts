import { describe, it, expect, vi } from "vitest";
import { setTimeout as delay } from "node:timers/promises";
import {
  TwitchConnectionManager,
  type EventSubEvent,
  type EventSubSocket,
} from "../src/twitch/connectionManager.js";
import type { TwitchApi } from "../src/twitch/twitchApi.js";
import type { SessionStore } from "../src/auth/sessionStore.js";
import type { PostgresRoundRepository } from "../src/db/roundRepository.js";

class Socket implements EventSubSocket {
  private listener?: (event: EventSubEvent) => void;
  addEventListener(type: string, listener: (event: EventSubEvent) => void) {
    if (type === "message") this.listener = listener;
  }
  close() {}
  send(type: string, payload: unknown, id = "message") {
    this.listener?.({
      data: JSON.stringify({
        metadata: {
          message_type: type,
          message_id: id,
          message_timestamp: new Date().toISOString(),
        },
        payload,
      }),
    });
  }
}
function fixture(ids = ["123"]) {
  const sockets: Socket[] = [];
  let validations = 0;
  const accounts = Object.fromEntries(
    ids.map((id) => [
      id,
      {
        identity: { id, login: "user" + id, displayName: "User " + id },
        accessToken: id,
        refreshToken: "refresh",
        credentialVersion: "generation",
        tokenExpiresAt: new Date(Date.now() + 3600000),
        scopes: ["user:read:chat"],
      },
    ]),
  );
  const sessions = {
    listActiveTwitchUserIds: async () => ids,
    loadTwitchAccount: async (id: string) => accounts[id],
    markTokenValidated: async () => true,
  } as unknown as SessionStore;
  const api = {
    validateToken: async (token: string) => {
      validations++;
      return {
        client_id: "fixture",
        user_id: token,
        login: "user" + token,
        expires_in: 3600,
        scopes: ["user:read:chat"],
      };
    },
    subscribeChat: async () => undefined,
  } as unknown as TwitchApi;
  const rounds = {} as PostgresRoundRepository;
  const states: string[] = [];
  const manager = new TwitchConnectionManager(
    api,
    sessions,
    rounds,
    () => {
      const s = new Socket();
      sockets.push(s);
      return s;
    },
    Date.now,
    undefined,
    undefined,
    (_id, s) => states.push(s.state),
  );
  return {
    manager,
    api,
    rounds,
    sockets,
    states,
    validations: () => validations,
  };
}

describe("Twitch overload and recovery admission", () => {
  it("recovers a channel rejected by the global budget even if it had no admitted work", async () => {
    const ids = ["123", "124", "125", "126", "127"];
    const x = fixture(ids);
    let release!: () => void;
    const held = new Promise<void>((r) => {
      release = r;
    });
    let applied = 0;
    x.rounds.findActiveSessionForBroadcaster = async () => {
      await held;
      return { sessionId: "session", teamRole: "A" };
    };
    x.rounds.applyInput = async () => {
      applied++;
      return {
        code: "ACCEPTED_NEW",
        reason: null,
        revision: 1,
        missing: [],
        message: "Accepted",
      };
    };
    try {
      await x.manager.startAll();
      for (const socket of x.sockets)
        socket.send("session_welcome", {
          session: { id: "fixture", keepalive_timeout_seconds: 60 },
        });
      await vi.waitFor(() =>
        expect(
          ids.every((id) => x.manager.statusForUser(id) === "connected"),
        ).toBe(true),
      );
      let next = 0;
      for (let channel = 0; channel < 5; channel++)
        for (let j = 0; j < (channel === 4 ? 1 : 4); j++) {
          const i = next++;
          x.sockets[channel].send(
            "notification",
            {
              subscription: { type: "channel.chat.message", version: "1" },
              event: {
                broadcaster_user_id: ids[channel],
                chatter_user_id: String(2000 + i),
                message_id: "global-" + i,
                message: { text: "!look CAM" },
              },
            },
            "event-global-" + i,
          );
        }
      await delay(30);
      expect(x.manager.diagnosticsForUser("127")).toMatchObject({
        chat: { inFlight: 0, rejected: 1, overloaded: true },
      });
      release();
      await vi.waitFor(() => expect(applied).toBe(16));
      await vi.waitFor(
        () => expect(x.manager.statusForUser("127")).toBe("connected"),
        { timeout: 1500 },
      );
    } finally {
      release();
      await x.manager.shutdown();
    }
  });
  it("preserves a scheduled reconnect during periodic reconciliation", async () => {
    const x = fixture();
    let attempts = 0;
    x.api.validateToken = async () => {
      attempts++;
      throw new Error("Provider unavailable");
    };
    try {
      await x.manager.startUser("123");
      await x.manager.startAll();
      await x.manager.startAll();
      expect(attempts).toBe(1);
      expect(x.manager.statusForUser("123")).toBe("reconnecting");
    } finally {
      await x.manager.shutdown();
    }
  });
  it("bounds startup provider work instead of validating every account concurrently", async () => {
    const x = fixture(Array.from({ length: 20 }, (_, i) => String(100 + i)));
    let active = 0,
      peak = 0;
    let release!: () => void;
    const held = new Promise<void>((r) => {
      release = r;
    });
    const original = x.api.validateToken.bind(x.api);
    x.api.validateToken = async (token: string) => {
      active++;
      peak = Math.max(peak, active);
      try {
        await held;
        return await original(token);
      } finally {
        active--;
      }
    };
    const started = x.manager.startAll();
    try {
      await delay(20);
      expect(peak).toBeLessThanOrEqual(4);
      release();
      await started;
      expect(x.sockets).toHaveLength(20);
    } finally {
      release();
      await started;
      await x.manager.shutdown();
    }
  });
  it("bounds chat database work and exposes rejected overload rather than pretending delivery succeeded", async () => {
    const x = fixture();
    let lookups = 0,
      peak = 0,
      active = 0;
    let release!: () => void;
    const held = new Promise<void>((r) => {
      release = r;
    });
    const applied: string[] = [];
    x.rounds.findActiveSessionForBroadcaster = async () => {
      lookups++;
      active++;
      peak = Math.max(peak, active);
      try {
        await held;
        return { sessionId: "session", teamRole: "A" };
      } finally {
        active--;
      }
    };
    x.rounds.applyInput = async (input) => {
      applied.push(input.inputId);
      return {
        code: "ACCEPTED_NEW",
        reason: null,
        revision: 1,
        missing: [],
        message: "Accepted",
      };
    };
    try {
      await x.manager.startUser("123");
      x.sockets[0].send("session_welcome", {
        session: { id: "fixture", keepalive_timeout_seconds: 60 },
      });
      await vi.waitFor(() =>
        expect(x.manager.statusForUser("123")).toBe("connected"),
      );
      for (let i = 0; i < 100; i++)
        x.sockets[0].send(
          "notification",
          {
            subscription: { type: "channel.chat.message", version: "1" },
            event: {
              broadcaster_user_id: "123",
              chatter_user_id: String(1000 + i),
              message_id: "chat-" + i,
              message: { text: "!look CAM" },
            },
          },
          "event-" + i,
        );
      await delay(30);
      expect(peak).toBeLessThanOrEqual(4);
      expect(lookups).toBe(4);
      expect(x.manager.diagnosticsForUser("123")).toMatchObject({
        status: "error",
        chat: { inFlight: 4, rejected: 96, overloaded: true },
      });
      release();
      await vi.waitFor(() => expect(applied).toHaveLength(4));
      await vi.waitFor(() =>
        expect(x.manager.statusForUser("123")).toBe("connected"),
      );
      expect(x.manager.diagnosticsForUser("123")).toMatchObject({
        chat: { inFlight: 0, rejected: 96, overloaded: false },
      });
      expect(x.states).toContain("OFFLINE");
    } finally {
      release();
      await x.manager.shutdown();
    }
  });
});
