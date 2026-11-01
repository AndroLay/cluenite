import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { SessionStore } from "../src/auth/sessionStore.js";
import {
  TwitchConnectionManager,
  type EventSubEvent,
  type EventSubSocket,
} from "../src/twitch/connectionManager.js";
import {
  TwitchAuthorizationExpiredError,
  type TwitchApi,
} from "../src/twitch/twitchApi.js";
import type { PostgresRoundRepository } from "../src/db/roundRepository.js";
import { createIsolatedDatabase } from "./testDatabase.js";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

class Socket implements EventSubSocket {
  private message?: (event: EventSubEvent) => void;
  addEventListener(type: string, listener: (event: EventSubEvent) => void) {
    if (type === "message") this.message = listener;
  }
  close() {}
  welcome() {
    this.message?.({
      data: JSON.stringify({
        metadata: {
          message_id: "welcome",
          message_type: "session_welcome",
          message_timestamp: new Date().toISOString(),
        },
        payload: {
          session: { id: "provider-session", keepalive_timeout_seconds: 60 },
        },
      }),
    });
  }
}

describe("credential generation and worker lifetime", () => {
  let database: Awaited<ReturnType<typeof createIsolatedDatabase>>;
  let sessions: SessionStore;
  let nextId = 99100;
  beforeAll(async () => {
    database = await createIsolatedDatabase();
    sessions = new SessionStore(
      database.pool,
      Buffer.alloc(32, 1),
      Buffer.alloc(32, 2),
      Buffer.alloc(32, 3),
    );
  });
  afterAll(async () => {
    await database?.close();
  });

  async function setup() {
    const id = String(nextId++);
    const identity = { id, login: `host${id}`, displayName: "Test host" };
    const tokenSet = {
      accessToken: "old-access",
      refreshToken: "old-refresh",
      expiresIn: 3600,
      scopes: ["user:read:chat"],
    };
    await sessions.saveTwitchAccount(identity, tokenSet);
    const validated = {
      client_id: "test",
      user_id: id,
      login: identity.login,
      expires_in: 3600,
      scopes: ["user:read:chat"],
    };
    const api = {
      validateToken: vi.fn(async () => validated),
      refreshToken: vi.fn(async () => ({
        ...tokenSet,
        accessToken: "rotated-access",
        refreshToken: "rotated-refresh",
      })),
      subscribeChat: vi.fn(async () => undefined),
    };
    const sockets: Socket[] = [];
    const manager = new TwitchConnectionManager(
      api as unknown as TwitchApi,
      sessions,
      {} as PostgresRoundRepository,
      () => {
        const socket = new Socket();
        sockets.push(socket);
        return socket;
      },
    );
    return { id, identity, tokenSet, validated, api, sockets, manager };
  }

  it("does not open a socket after validation finishes following stop", async () => {
    const x = await setup();
    const check = deferred<typeof x.validated>();
    x.api.validateToken.mockImplementationOnce(() => check.promise);
    const started = x.manager.startUser(x.id);
    await vi.waitFor(() => expect(x.api.validateToken).toHaveBeenCalledOnce());
    await x.manager.stopUser(x.id);
    check.resolve(x.validated);
    try {
      await started;
      expect(x.sockets).toHaveLength(0);
      expect(x.manager.statusForUser(x.id)).toBe("disconnected");
    } finally {
      await x.manager.shutdown();
    }
  });

  it("keeps a new worker running when superseded validation finishes", async () => {
    const x = await setup();
    const check = deferred<typeof x.validated>();
    x.api.validateToken.mockImplementationOnce(() => check.promise);
    const first = x.manager.startUser(x.id);
    await vi.waitFor(() => expect(x.api.validateToken).toHaveBeenCalledOnce());
    await x.manager.stopUser(x.id);
    await sessions.saveTwitchAccount(x.identity, {
      ...x.tokenSet,
      accessToken: "new-authorization",
    });
    await x.manager.startUser(x.id);
    check.resolve({ ...x.validated, user_id: "wrong-old-identity" });
    try {
      await first;
      expect(x.sockets).toHaveLength(1);
      expect((await sessions.loadTwitchAccount(x.id))?.accessToken).toBe(
        "new-authorization",
      );
      expect(x.manager.statusForUser(x.id)).toBe("connecting");
    } finally {
      await x.manager.shutdown();
    }
  });

  it("rotates the current generation successfully and rejects a second update using its old version", async () => {
    const x = await setup();
    const old = await sessions.loadTwitchAccount(x.id);
    x.api.validateToken.mockResolvedValueOnce({
      ...x.validated,
      expires_in: 1,
    });
    try {
      await x.manager.startUser(x.id);
      expect(x.sockets).toHaveLength(1);
      expect((await sessions.loadTwitchAccount(x.id))?.accessToken).toBe(
        "rotated-access",
      );
      expect(
        await sessions.saveRefreshedTwitchAccount(old!, x.tokenSet),
      ).toBeNull();
      expect(
        await sessions.markTwitchRevoked(x.id, old!.credentialVersion),
      ).toBe(false);
      expect((await sessions.loadTwitchAccount(x.id))?.accessToken).toBe(
        "rotated-access",
      );
    } finally {
      await x.manager.shutdown();
    }
  });

  it.each(["disconnect", "reauthorize"] as const)(
    "does not overwrite %s while an old refresh is pending",
    async (action) => {
      const x = await setup();
      x.api.validateToken.mockResolvedValueOnce({
        ...x.validated,
        expires_in: 1,
      });
      const refresh =
        deferred<
          ReturnType<typeof x.api.refreshToken> extends Promise<infer T>
            ? T
            : never
        >();
      x.api.refreshToken.mockImplementationOnce(() => refresh.promise);
      const started = x.manager.startUser(x.id);
      await vi.waitFor(() => expect(x.api.refreshToken).toHaveBeenCalledOnce());
      if (action === "disconnect") await sessions.markTwitchRevoked(x.id);
      else
        await sessions.saveTwitchAccount(x.identity, {
          ...x.tokenSet,
          accessToken: "new-authorization",
          refreshToken: "new-refresh",
        });
      refresh.resolve({
        ...x.tokenSet,
        accessToken: "late-access",
        refreshToken: "late-refresh",
      });
      try {
        await started;
        const current = await sessions.loadTwitchAccount(x.id);
        if (action === "disconnect") expect(current).toBeNull();
        else expect(current?.accessToken).toBe("new-authorization");
        expect(x.sockets).toHaveLength(0);
      } finally {
        await x.manager.shutdown();
      }
    },
  );

  it("does not revoke a new authorization when an old refresh fails", async () => {
    const x = await setup();
    x.api.validateToken.mockResolvedValueOnce({
      ...x.validated,
      expires_in: 1,
    });
    const refresh = deferred<Awaited<ReturnType<typeof x.api.refreshToken>>>();
    x.api.refreshToken.mockImplementationOnce(() => refresh.promise);
    const started = x.manager.startUser(x.id);
    await vi.waitFor(() => expect(x.api.refreshToken).toHaveBeenCalledOnce());
    await sessions.saveTwitchAccount(x.identity, {
      ...x.tokenSet,
      accessToken: "new-authorization",
    });
    refresh.reject(new TwitchAuthorizationExpiredError());
    try {
      await started;
      expect((await sessions.loadTwitchAccount(x.id))?.accessToken).toBe(
        "new-authorization",
      );
      expect(x.manager.statusForUser(x.id)).not.toBe("revoked");
    } finally {
      await x.manager.shutdown();
    }
  });

  it("does not mark a stopped worker connected after subscription finishes", async () => {
    const x = await setup();
    const subscribed = deferred<void>();
    x.api.subscribeChat.mockImplementationOnce(() => subscribed.promise);
    await x.manager.startUser(x.id);
    x.sockets[0]!.welcome();
    await vi.waitFor(() => expect(x.api.subscribeChat).toHaveBeenCalledOnce());
    await x.manager.stopUser(x.id);
    subscribed.resolve();
    for (let i = 0; i < 12; i++) await Promise.resolve();
    try {
      expect(x.manager.statusForUser(x.id)).toBe("disconnected");
      expect(x.manager.diagnosticsForUser(x.id).activeSubscriptions).toBe(0);
    } finally {
      await x.manager.shutdown();
    }
  });
});
