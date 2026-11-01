import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresRoundRepository } from "../src/db/roundRepository.js";
import { maintainData } from "../src/ops/retention.js";
import { createIsolatedDatabase } from "./testDatabase.js";

describe("bounded data retention", () => {
  let database: Awaited<ReturnType<typeof createIsolatedDatabase>>;
  let rounds: PostgresRoundRepository;
  beforeAll(async () => {
    database = await createIsolatedDatabase();
    rounds = new PostgresRoundRepository(database.pool);
  });
  afterAll(async () => {
    await database?.close();
  });
  async function seed(phase: string, ageDays: number, pending = false) {
    const host = randomUUID();
    await database.pool.query(
      `INSERT INTO twitch_accounts (twitch_user_id, login, display_name,
      access_token_ciphertext, access_token_iv, access_token_tag, refresh_token_ciphertext, refresh_token_iv, refresh_token_tag, token_expires_at)
      VALUES ($1, 'test', 'Test', '', '', '', '', '', '', now() - interval '40 days')`,
      [host],
    );
    const created = await rounds.create({
      hostTwitchId: host,
      caseId: "Q01_GALLERY_SHADOW",
      idempotencyKey: randomUUID(),
    });
    await rounds.control({
      sessionId: created.sessionId,
      hostTwitchId: host,
      action: "start",
      idempotencyKey: randomUUID(),
    });
    await rounds.applyInput({
      sessionId: created.sessionId,
      inputId: randomUUID(),
      actorTwitchId: "viewer-test",
      text: "!inspect CAM",
      source: "twitch",
      channelId: host,
      originBroadcasterId: host,
      sourceMessageId: randomUUID(),
    });
    await database.pool.query(
      "UPDATE game_sessions SET phase = $2, updated_at = now() - ($3 * interval '1 day') WHERE id = $1",
      [created.sessionId, phase, ageDays],
    );
    if (!pending)
      await database.pool.query(
        "UPDATE outbox SET published_at = now() WHERE session_id = $1",
        [created.sessionId],
      );
    return { host, id: created.sessionId };
  }

  it("previews without mutation, cascades retired history, protects open/recent/pending sessions and co-op participants", async () => {
    const retired = await seed("CANCELLED", 31);
    const active = await seed("ACTIVE", 100);
    const recent = await seed("RESOLVED", 29);
    const pending = await seed("CANCELLED", 31, true);
    const partner = randomUUID();
    await database.pool.query(
      `INSERT INTO twitch_accounts SELECT $1, login, display_name,
      access_token_ciphertext, access_token_iv, access_token_tag, refresh_token_ciphertext, refresh_token_iv, refresh_token_tag,
      scopes, token_expires_at, revoked_at, last_validated_at, created_at, updated_at FROM twitch_accounts WHERE twitch_user_id = $2`,
      [partner, active.host],
    );
    await database.pool.query(
      "INSERT INTO session_channels (session_id, broadcaster_id, team_role) VALUES ($1, $2, 'B')",
      [active.id, partner],
    );
    await database.pool.query(
      "UPDATE twitch_accounts SET revoked_at = now() - interval '40 days' WHERE twitch_user_id = $1",
      [partner],
    );
    await database.pool.query(
      `INSERT INTO user_sessions (token_hash, csrf_hash, twitch_user_id, expires_at)
      VALUES ('expired-test-session', 'csrf', $1, now() - interval '2 days')`,
      [retired.host],
    );

    const preview = await maintainData(database.pool, { apply: false });
    expect(preview).toMatchObject({
      applied: false,
      sessions: 1,
      userSessions: 1,
      accounts: 1,
    });
    expect(
      (
        await database.pool.query("SELECT 1 FROM game_sessions WHERE id = $1", [
          retired.id,
        ])
      ).rowCount,
    ).toBe(1);
    const applied = await maintainData(database.pool, { apply: true });
    expect(applied).toMatchObject({
      applied: true,
      sessions: 1,
      userSessions: 1,
      accounts: 1,
    });
    for (const table of [
      "processed_inputs",
      "session_events",
      "outbox",
      "contributions",
      "session_channels",
      "overlay_credentials",
    ]) {
      expect(
        (
          await database.pool.query(
            `SELECT 1 FROM ${table} WHERE session_id = $1`,
            [retired.id],
          )
        ).rowCount,
        table,
      ).toBe(0);
    }
    for (const item of [active, recent, pending])
      expect(
        (
          await database.pool.query(
            "SELECT 1 FROM game_sessions WHERE id = $1",
            [item.id],
          )
        ).rowCount,
      ).toBe(1);
    expect(
      (
        await database.pool.query(
          "SELECT 1 FROM twitch_accounts WHERE twitch_user_id = $1",
          [partner],
        )
      ).rowCount,
    ).toBe(1);
    expect(await maintainData(database.pool, { apply: true })).toMatchObject({
      sessions: 0,
      userSessions: 0,
      accounts: 0,
    });
  });

  it("allows explicit erasure only for a revoked, unreferenced account", async () => {
    const x = await seed("CANCELLED", 0);
    await database.pool.query(
      "UPDATE twitch_accounts SET revoked_at = now() WHERE twitch_user_id = $1",
      [x.host],
    );
    await expect(
      maintainData(database.pool, { apply: true, eraseAccount: x.host }),
    ).rejects.toThrow("retained session");
    await database.pool.query("DELETE FROM game_sessions WHERE id = $1", [
      x.id,
    ]);
    expect(
      await maintainData(database.pool, { apply: false, eraseAccount: x.host }),
    ).toMatchObject({ accounts: 1, applied: false });
    expect(
      await maintainData(database.pool, { apply: true, eraseAccount: x.host }),
    ).toMatchObject({ accounts: 1 });
    expect(
      await maintainData(database.pool, { apply: true, eraseAccount: x.host }),
    ).toMatchObject({ accounts: 0 });
  });

  it("bounds each batch and expires partial results without touching current proof", async () => {
    const x = await seed("PARTIAL", 31);
    await database.pool.query(
      `INSERT INTO game_sessions
      SELECT gen_random_uuid(), host_twitch_id, case_id, case_version, case_content_hash, phase, source, revision, state,
      'batch-' || n, created_at, updated_at FROM game_sessions CROSS JOIN generate_series(1, 101) n WHERE id = $1`,
      [x.id],
    );
    expect(await maintainData(database.pool, { apply: false })).toMatchObject({
      sessions: 100,
    });
    expect(await maintainData(database.pool, { apply: true })).toMatchObject({
      sessions: 100,
    });
    expect(await maintainData(database.pool, { apply: true })).toMatchObject({
      sessions: 2,
    });
  });

  it("refuses account erasure while a rejected receipt retains the viewer's identifier", async () => {
    const host = await seed("ACTIVE", 0);
    const viewer = "99882211";
    await database.pool.query(
      `INSERT INTO twitch_accounts SELECT $1, login, display_name,
      access_token_ciphertext, access_token_iv, access_token_tag, refresh_token_ciphertext, refresh_token_iv, refresh_token_tag,
      scopes, token_expires_at, now(), last_validated_at, created_at, updated_at FROM twitch_accounts WHERE twitch_user_id = $2`,
      [viewer, host.host],
    );
    await rounds.applyInput({
      sessionId: host.id,
      inputId: randomUUID(),
      actorTwitchId: viewer,
      text: "!invalid command",
      source: "twitch",
      channelId: host.host,
    });
    expect(
      (
        await database.pool.query(
          "SELECT 1 FROM contributions WHERE actor_twitch_id = $1",
          [viewer],
        )
      ).rowCount,
    ).toBe(0);
    await expect(
      maintainData(database.pool, { apply: true, eraseAccount: viewer }),
    ).rejects.toThrow("retained session");
    expect(
      (
        await database.pool.query(
          "SELECT 1 FROM twitch_accounts WHERE twitch_user_id = $1",
          [viewer],
        )
      ).rowCount,
    ).toBe(1);
  });
});
