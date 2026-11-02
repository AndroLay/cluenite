import { describe, expect, it, vi } from "vitest";
import type {
  DecryptedTwitchAccount,
  SessionStore,
} from "../../apps/server/src/auth/sessionStore.js";
import type { PostgresRoundRepository } from "../../apps/server/src/db/roundRepository.js";
import {
  TwitchConnectionManager,
  type EventSubEvent,
  type EventSubSocket,
} from "../../apps/server/src/twitch/connectionManager.js";
import type { TwitchApi } from "../../apps/server/src/twitch/twitchApi.js";

class FakeSocket implements EventSubSocket {
  private readonly handlers = new Map<
    string,
    ((event: EventSubEvent) => void)[]
  >();
  readonly closes: Array<{ code?: number; reason?: string }> = [];

  addEventListener(
    type: "open" | "message" | "close" | "error",
    listener: (event: EventSubEvent) => void,
  ): void {
    this.handlers.set(type, [...(this.handlers.get(type) ?? []), listener]);
  }

  close(code?: number, reason?: string): void {
    this.closes.push({ code, reason });
    this.emit("close", { code });
  }

  send(value: unknown): void {
    this.emit("message", { data: JSON.stringify(value) });
  }

  private emit(type: string, event: EventSubEvent): void {
    for (const handler of this.handlers.get(type) ?? []) handler(event);
  }
}

async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 12; i++) await Promise.resolve();
}

function eventSubMessage(
  type: string,
  payload: Record<string, unknown>,
  id = "event-1",
) {
  return {
    metadata: {
      message_id: id,
      message_type: type,
      message_timestamp: "2026-11-01T09:00:00.000Z",
    },
    payload,
  };
}

describe("Twitch EventSub connection lifecycle", () => {
  it("migrates consecutive planned reconnects without resubscribing, then recovers from an unexpected loss", async () => {
    const account: DecryptedTwitchAccount = {
      credentialVersion: "test-version",
      identity: {
        id: "1971641",
        login: "cluenitehost",
        displayName: "Cluenite Host",
      },
      accessToken: "access-token",
      refreshToken: "refresh-token",
      scopes: ["user:read:chat"],
      tokenExpiresAt: new Date(Date.now() + 60 * 60_000),
    };
    const sessions = {
      loadTwitchAccount: vi.fn(async () => account),
      markTokenValidated: vi.fn(async () => true),
      saveTwitchAccount: vi.fn(async () => undefined),
      markTwitchRevoked: vi.fn(async () => true),
      listActiveTwitchUserIds: vi.fn(async () => []),
      hasActiveHostSession: vi.fn(async () => true),
    } as unknown as SessionStore;
    const rounds = {
      findActiveSessionForBroadcaster: vi.fn(async () => ({
        sessionId: "session-1",
        teamRole: "A" as const,
      })),
      applyInput: vi.fn(async () => ({
        code: "ACCEPTED_NEW",
        reason: null,
        message: "ok",
        missing: [],
        revision: 2,
      })),
    } as unknown as PostgresRoundRepository;
    const api = {
      validateToken: vi.fn(async () => ({
        client_id: "client-id",
        user_id: "1971641",
        login: "cluenitehost",
        scopes: ["user:read:chat"],
        expires_in: 3600,
      })),
      subscribeChat: vi.fn(async () => undefined),
      refreshToken: vi.fn(),
    } as unknown as TwitchApi;
    const onAccountRevoked = vi.fn();
    const onStatusChange = vi.fn();
    const sockets: FakeSocket[] = [];
    const urls: string[] = [];
    const manager = new TwitchConnectionManager(
      api,
      sessions,
      rounds,
      (url) => {
        urls.push(url);
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket;
      },
      Date.now,
      onAccountRevoked,
      undefined,
      onStatusChange,
    );

    await manager.startUser("1971641");
    expect(urls[0]).toBe("wss://eventsub.wss.twitch.tv/ws");
    sockets[0]!.send(
      eventSubMessage("session_welcome", {
        session: { id: "eventsub-session-1", keepalive_timeout_seconds: 60 },
      }),
    );
    await flushMicrotasks();
    expect(api.subscribeChat).toHaveBeenCalledWith(
      "access-token",
      "1971641",
      "eventsub-session-1",
    );
    expect(manager.statusForUser("1971641")).toBe("connected");
    expect(manager.connectionStatusForUser("1971641")).toMatchObject({
      provider: "twitch",
      state: "ONLINE",
      since: expect.any(String),
    });
    expect(onStatusChange).toHaveBeenLastCalledWith(
      "1971641",
      expect.objectContaining({ provider: "twitch", state: "ONLINE" }),
    );
    expect(manager.diagnosticsForUser("1971641")).toMatchObject({
      status: "connected",
      activeSubscriptions: 1,
      lastNotificationAt: null,
    });

    sockets[0]!.send(
      eventSubMessage("notification", {
        subscription: { type: "channel.chat.message", version: "1" },
        event: {
          broadcaster_user_id: "1971641",
          chatter_user_id: "4145994",
          message_id: "chat-1",
          source_broadcaster_user_id: "1971641",
          source_message_id: "source-1",
          message: { text: "!inspect CAM" },
        },
      }),
    );
    await flushMicrotasks();
    expect(manager.diagnosticsForUser("1971641").lastNotificationAt).toEqual(
      expect.any(String),
    );
    expect(rounds.applyInput).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "session-1",
        inputId: "twitch:1971641:source-1",
        eventSubMessageId: "event-1",
        actorTwitchId: "4145994",
        text: "!inspect CAM",
        source: "twitch",
      }),
    );

    sockets[0]!.send(
      eventSubMessage("session_reconnect", {
        session: {
          reconnect_url: "wss://eventsub.wss.twitch.tv/ws?session_id=handoff",
        },
      }),
    );
    await flushMicrotasks();
    expect(urls[1]).toContain("session_id=handoff");
    sockets[1]!.send(
      eventSubMessage("session_welcome", {
        session: { id: "eventsub-session-2", keepalive_timeout_seconds: 60 },
      }),
    );
    await flushMicrotasks();
    expect(manager.statusForUser("1971641")).toBe("connected");
    expect(manager.diagnosticsForUser("1971641")).toMatchObject({
      status: "connected",
      activeSubscriptions: 1,
      lastNotificationAt: expect.any(String),
    });
    expect(
      sockets[0]!.closes.some(({ reason }) => reason === "connection migrated"),
    ).toBe(true);
    expect(api.subscribeChat).toHaveBeenCalledTimes(1);

    sockets[1]!.send(
      eventSubMessage("session_reconnect", {
        session: {
          reconnect_url:
            "wss://eventsub.wss.twitch.tv/ws?session_id=second-handoff",
        },
      }),
    );
    await flushMicrotasks();
    expect(urls[2]).toBe(
      "wss://eventsub.wss.twitch.tv/ws?session_id=second-handoff",
    );
    expect(sockets[1]!.closes).toHaveLength(0);
    sockets[2]!.send(
      eventSubMessage("session_welcome", {
        session: { id: "eventsub-session-3", keepalive_timeout_seconds: 60 },
      }),
    );
    await flushMicrotasks();
    expect(sockets[1]!.closes).toContainEqual({
      code: 1000,
      reason: "connection migrated",
    });
    expect(manager.diagnosticsForUser("1971641")).toMatchObject({
      status: "connected",
      activeSubscriptions: 1,
      lastNotificationAt: expect.any(String),
    });
    expect(api.subscribeChat).toHaveBeenCalledTimes(1);

    sockets[2]!.close(1006, "network loss");
    expect(manager.diagnosticsForUser("1971641").activeSubscriptions).toBe(0);
    await vi.waitFor(() => expect(sockets).toHaveLength(4), {
      timeout: 3000,
      interval: 25,
    });
    sockets[3]!.send(
      eventSubMessage("session_welcome", {
        session: { id: "eventsub-session-4", keepalive_timeout_seconds: 60 },
      }),
    );
    await flushMicrotasks();
    expect(api.subscribeChat).toHaveBeenCalledTimes(2);
    expect(manager.statusForUser("1971641")).toBe("connected");
    expect(manager.diagnosticsForUser("1971641")).toMatchObject({
      status: "connected",
      activeSubscriptions: 1,
      lastNotificationAt: expect.any(String),
    });

    sockets[3]!.send(
      eventSubMessage(
        "revocation",
        {
          subscription: { status: "authorization_revoked" },
        },
        "revocation-1",
      ),
    );
    await flushMicrotasks();
    expect(sessions.markTwitchRevoked).toHaveBeenCalledWith(
      "1971641",
      "test-version",
    );
    expect(onAccountRevoked).toHaveBeenCalledWith("1971641");
    expect(manager.statusForUser("1971641")).toBe("revoked");
    expect(manager.diagnosticsForUser("1971641").activeSubscriptions).toBe(0);

    await manager.shutdown();
  });

  it("closes and retries a socket when Twitch keepalives stop arriving", async () => {
    vi.useFakeTimers();
    const account: DecryptedTwitchAccount = {
      credentialVersion: "test-version",
      identity: {
        id: "1971641",
        login: "cluenitehost",
        displayName: "Cluenite Host",
      },
      accessToken: "access-token",
      refreshToken: "refresh-token",
      scopes: ["user:read:chat"],
      tokenExpiresAt: new Date(Date.now() + 60 * 60_000),
    };
    const sessions = {
      loadTwitchAccount: vi.fn(async () => account),
      markTokenValidated: vi.fn(async () => true),
      saveTwitchAccount: vi.fn(async () => undefined),
      markTwitchRevoked: vi.fn(async () => true),
    } as unknown as SessionStore;
    const api = {
      validateToken: vi.fn(async () => ({
        client_id: "client-id",
        user_id: "1971641",
        login: "cluenitehost",
        scopes: ["user:read:chat"],
        expires_in: 3600,
      })),
      subscribeChat: vi.fn(async () => undefined),
    } as unknown as TwitchApi;
    const sockets: FakeSocket[] = [];
    const manager = new TwitchConnectionManager(
      api,
      sessions,
      {} as PostgresRoundRepository,
      () => {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket;
      },
    );

    try {
      await manager.startUser("1971641");
      sockets[0]!.send(
        eventSubMessage("session_welcome", {
          session: { id: "short-keepalive", keepalive_timeout_seconds: 10 },
        }),
      );
      await flushMicrotasks();
      await vi.advanceTimersByTimeAsync(11_001);
      expect(
        sockets[0]!.closes.some(({ reason }) => reason === "keepalive timeout"),
      ).toBe(true);
      expect(manager.statusForUser("1971641")).toBe("reconnecting");
    } finally {
      await manager.shutdown();
      vi.useRealTimers();
    }
  });
});
