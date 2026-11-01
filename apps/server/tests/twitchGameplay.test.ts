import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import type {
  DecryptedTwitchAccount,
  SessionStore,
} from "../src/auth/sessionStore.js";
import { PostgresRoundRepository } from "../src/db/roundRepository.js";
import {
  TwitchConnectionManager,
  type EventSubEvent,
  type EventSubSocket,
} from "../src/twitch/connectionManager.js";
import type { TwitchApi } from "../src/twitch/twitchApi.js";
import { createIsolatedDatabase } from "./testDatabase.js";

const describeWithDatabase = process.env.DATABASE_URL
  ? describe
  : describe.skip;

class FixtureEventSubSocket implements EventSubSocket {
  private readonly handlers = new Map<
    string,
    ((event: EventSubEvent) => void)[]
  >();

  addEventListener(
    type: "open" | "message" | "close" | "error",
    listener: (event: EventSubEvent) => void,
  ): void {
    this.handlers.set(type, [...(this.handlers.get(type) ?? []), listener]);
  }

  close(code?: number): void {
    for (const handler of this.handlers.get("close") ?? []) handler({ code });
  }

  send(message: unknown): void {
    const event = { data: JSON.stringify(message) };
    for (const handler of this.handlers.get("message") ?? []) handler(event);
  }
}

function eventSubMessage(
  messageId: string,
  messageType: string,
  payload: Record<string, unknown>,
) {
  return {
    metadata: {
      message_id: messageId,
      message_type: messageType,
      message_timestamp: "2026-11-01T09:00:00.000Z",
    },
    payload,
  };
}

describeWithDatabase("Twitch-to-Q01 local gameplay path", () => {
  let database: Awaited<ReturnType<typeof createIsolatedDatabase>>;
  let pool: Pool;
  let rounds: PostgresRoundRepository;

  beforeAll(async () => {
    database = await createIsolatedDatabase();
    pool = database.pool;
    rounds = new PostgresRoundRepository(pool, () => 1_800_000_000_000);
  });

  afterAll(async () => {
    if (database) await database.close();
  });

  it("normalizes EventSub chat and persists Q01 through reveal", async () => {
    const hostId = "1971641";
    await pool.query(
      `INSERT INTO twitch_accounts (
         twitch_user_id, login, display_name,
         access_token_ciphertext, access_token_iv, access_token_tag,
         refresh_token_ciphertext, refresh_token_iv, refresh_token_tag,
         token_expires_at
       ) VALUES ($1, 'host', 'Host', 'cipher', 'iv', 'tag', 'cipher', 'iv', 'tag', now() + interval '1 hour')`,
      [hostId],
    );
    const created = await rounds.create({
      hostTwitchId: hostId,
      caseId: "Q01_GALLERY_SHADOW",
      idempotencyKey: randomUUID(),
    });
    await rounds.control({
      sessionId: created.sessionId,
      hostTwitchId: hostId,
      action: "start",
      idempotencyKey: randomUUID(),
    });

    const now = 1_800_000_000_000;
    const account: DecryptedTwitchAccount = {
      credentialVersion: "test-version",
      identity: { id: hostId, login: "host", displayName: "Host" },
      accessToken: "fixture-access-token",
      refreshToken: "fixture-refresh-token",
      scopes: ["user:read:chat"],
      tokenExpiresAt: new Date(now + 60 * 60_000),
    };
    const sessions = {
      loadTwitchAccount: vi.fn(async () => account),
      markTokenValidated: vi.fn(async () => true),
    } as unknown as SessionStore;
    const api = {
      validateToken: vi.fn(async () => ({
        client_id: "fixture-client",
        user_id: hostId,
        login: "host",
        scopes: ["user:read:chat"],
        expires_in: 3600,
      })),
      subscribeChat: vi.fn(async () => undefined),
    } as unknown as TwitchApi;
    const socket = new FixtureEventSubSocket();
    const manager = new TwitchConnectionManager(
      api,
      sessions,
      rounds,
      () => socket,
      () => now,
    );

    try {
      await manager.startUser(hostId);
      socket.send(
        eventSubMessage("welcome-1", "session_welcome", {
          session: { id: "fixture-session", keepalive_timeout_seconds: 60 },
        }),
      );
      await vi.waitFor(() =>
        expect(api.subscribeChat).toHaveBeenCalledWith(
          "fixture-access-token",
          hostId,
          "fixture-session",
        ),
      );

      const commands = [
        { text: "!inspect CAM", actor: "4145994" },
        { text: "!inspect SCHEDULE", actor: "4145995" },
        { text: "!link CAM_R07 SCHEDULE_R07", actor: "4145994" },
        { text: "!solve ROBOT", actor: "4145995" },
      ];
      for (const [index, command] of commands.entries()) {
        const before = await rounds.snapshotForHost(created.sessionId, hostId);
        socket.send(
          eventSubMessage(`event-${index}`, "notification", {
            subscription: {
              type: "channel.chat.message",
              version: "1",
            },
            event: {
              broadcaster_user_id: hostId,
              chatter_user_id: command.actor,
              message_id: `chat-${index}`,
              message: { text: command.text },
            },
          }),
        );
        await vi.waitFor(async () => {
          const after = await rounds.snapshotForHost(created.sessionId, hostId);
          expect(after?.revision).toBe((before?.revision ?? 0) + 1);
        });
      }

      const snapshot = await rounds.snapshotForHost(created.sessionId, hostId);
      expect(snapshot).toMatchObject({
        phase: "RESOLVED",
        stage: "reveal",
        chosenVerdictId: "ROBOT",
      });
      expect(snapshot?.revealText).toContain("robot R-07");
      expect(
        snapshot?.clues.find((clue) => clue.id === "CAM")?.observation,
      ).toContain("R-07");
      expect(
        snapshot?.clues.find((clue) => clue.id === "SCHEDULE")?.observation,
      ).toContain("21:09 to 21:13");
    } finally {
      await manager.shutdown();
    }
  });
});
