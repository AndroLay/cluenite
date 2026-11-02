import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { SessionStore } from "../src/auth/sessionStore.js";
import {
  CoopInviteExpiredError,
  PostgresRoundRepository,
} from "../src/db/roundRepository.js";
import { createIsolatedDatabase } from "./testDatabase.js";

const describeWithDatabase = process.env.DATABASE_URL
  ? describe
  : describe.skip;

describeWithDatabase("Postgres round repository", () => {
  let database: Awaited<ReturnType<typeof createIsolatedDatabase>>;
  let pool: Pool;
  let repository: PostgresRoundRepository;

  beforeAll(async () => {
    database = await createIsolatedDatabase();
    pool = database.pool;
    repository = new PostgresRoundRepository(pool, () => 1_800_000_000_000);
  });

  afterAll(async () => {
    if (database) await database.close();
  });

  async function seedHost(): Promise<string> {
    const id = `test-${randomUUID()}`;
    await pool.query(
      `INSERT INTO twitch_accounts (
         twitch_user_id, login, display_name,
         access_token_ciphertext, access_token_iv, access_token_tag,
         refresh_token_ciphertext, refresh_token_iv, refresh_token_tag,
         token_expires_at
       ) VALUES ($1, 'host', 'Host', 'cipher', 'iv', 'tag', 'cipher', 'iv', 'tag', now() + interval '1 hour')`,
      [id],
    );
    return id;
  }

  async function createActiveSession(hostTwitchId: string) {
    const created = await repository.create({
      hostTwitchId,
      caseId: "Q01_GALLERY_SHADOW",
      idempotencyKey: randomUUID(),
    });
    await repository.control({
      sessionId: created.sessionId,
      hostTwitchId,
      action: "start",
      idempotencyKey: randomUUID(),
    });
    return created.sessionId;
  }

  async function createActiveCoop(target = repository) {
    const hostA = await seedHost();
    const hostB = await seedHost();
    const { sessionId } = await target.create({
      hostTwitchId: hostA,
      caseId: "C01_HARBOR_SIGNAL",
      idempotencyKey: randomUUID(),
    });
    const tokenHash = randomUUID();
    const invite = await target.createCoopInvitation({
      sessionId,
      inviterTwitchId: hostA,
      inviteeTwitchId: hostB,
      tokenHash,
      idempotencyKey: randomUUID(),
    });
    await target.acceptCoopInvitation({
      inviteId: invite!.inviteId,
      inviteeTwitchId: hostB,
      tokenHash,
      idempotencyKey: randomUUID(),
    });
    await target.control({
      sessionId,
      hostTwitchId: hostA,
      action: "start",
      idempotencyKey: randomUUID(),
    });
    return {
      hostA,
      hostB,
      sessionId,
      input: (team: "A" | "B", text: string) =>
        target.applyInput({
          sessionId,
          inputId: randomUUID(),
          actorTwitchId: `viewer-${team}`,
          text,
          source: "twitch",
          channelId: team === "A" ? hostA : hostB,
        }),
    };
  }

  it("pins Q01 and returns the existing session for a repeated create key", async () => {
    const hostTwitchId = await seedHost();
    const idempotencyKey = randomUUID();
    const input = {
      hostTwitchId,
      caseId: "Q01_GALLERY_SHADOW",
      idempotencyKey,
    };

    const first = await repository.create(input);
    const retry = await repository.create(input);

    expect(first.sessionId).toBe(retry.sessionId);
    expect(first.caseId).toBe("Q01_GALLERY_SHADOW");
    expect(first.paused).toBe(true);
  });

  it("stores sanitized receipts while preserving exact rejected-command retries", async () => {
    const hostTwitchId = await seedHost();
    const sessionId = await createActiveSession(hostTwitchId);
    const marker = "synthetic-private-chat-marker";
    for (const command of ["!unrelatedbot", "!inspect", "!solve"]) {
      const input = {
        sessionId,
        inputId: randomUUID(),
        actorTwitchId: "test-viewer",
        text: `${command} ${marker}`,
        source: "twitch" as const,
        channelId: hostTwitchId,
        originBroadcasterId: hostTwitchId,
      };
      const first = await repository.applyInput(input);
      const retry = await repository.applyInput(input);
      expect(retry).toEqual(first);
      expect(
        (
          await repository.applyInput({
            ...input,
            text: `${command} changed-private-text`,
          })
        ).code,
      ).toBe("IDEMPOTENCY_CONFLICT");
    }
    const receipts = await pool.query(
      "SELECT action_summary, result, request_fingerprint FROM processed_inputs WHERE session_id = $1",
      [sessionId],
    );
    expect(JSON.stringify(receipts.rows)).not.toContain(marker);
    expect(
      receipts.rows.every((row) =>
        /^[a-f0-9]{64}$/.test(row.request_fingerprint),
      ),
    ).toBe(true);
  });

  it("returns the original result for a repeated host-control idempotency key", async () => {
    const hostTwitchId = await seedHost();
    const created = await repository.create({
      hostTwitchId,
      caseId: "Q01_GALLERY_SHADOW",
      idempotencyKey: randomUUID(),
    });
    const key = randomUUID();
    const input = {
      sessionId: created.sessionId,
      hostTwitchId,
      action: "start" as const,
      idempotencyKey: key,
    };

    const first = await repository.control(input);
    const retry = await repository.control(input);

    expect(first).toEqual(retry);
    expect(first.code).toBe("ACCEPTED_NEW");
    expect(
      (await repository.snapshotForHost(created.sessionId, hostTwitchId))
        ?.revision,
    ).toBe(first.revision);
  });

  it("does not replay an unverifiable legacy command with a truncated summary", async () => {
    const hostTwitchId = await seedHost();
    const sessionId = await createActiveSession(hostTwitchId);
    const actorTwitchId = "viewer-legacy-long-command";
    const inputId = "twitch:viewer-legacy-long-command:legacy-long-event";
    const eventSubMessageId = "legacy-long-eventsub-message";
    const prefix = "!unknown ";
    const sharedPrefix = `${prefix}${"x".repeat(120 - prefix.length)}`;
    const originalText = `${sharedPrefix}a`;
    const changedText = `${sharedPrefix}b`;
    const before = await repository.snapshotForHost(sessionId, hostTwitchId);

    await pool.query(
      `INSERT INTO processed_inputs (
         input_id, eventsub_message_id, session_id, actor_twitch_id,
         action_summary, result
       ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [
        `${sessionId}:${inputId}`,
        eventSubMessageId,
        sessionId,
        actorTwitchId,
        originalText.trim().slice(0, 120),
        JSON.stringify({
          code: "ACCEPTED_NEW",
          reason: null,
          message: "legacy cached result",
          missing: [],
          revision: before?.revision ?? 0,
        }),
      ],
    );

    const retry = await repository.applyInput({
      sessionId,
      inputId,
      eventSubMessageId,
      actorTwitchId,
      text: changedText,
      source: "twitch",
      channelId: hostTwitchId,
      originBroadcasterId: hostTwitchId,
    });
    const after = await repository.snapshotForHost(sessionId, hostTwitchId);

    expect(retry).toMatchObject({
      code: "IDEMPOTENCY_CONFLICT",
      reason: "IDEMPOTENCY_KEY_REUSED",
    });
    expect(retry.message).not.toBe("legacy cached result");
    expect(after?.revision).toBe(before?.revision);
  });

  it("rejects a host control key reused for a different action", async () => {
    const hostTwitchId = await seedHost();
    const created = await repository.create({
      hostTwitchId,
      caseId: "Q01_GALLERY_SHADOW",
      idempotencyKey: randomUUID(),
    });
    const key = "control-payload-retry-0001";

    const first = await repository.control({
      sessionId: created.sessionId,
      hostTwitchId,
      action: "start",
      idempotencyKey: key,
    });
    const conflict = await repository.control({
      sessionId: created.sessionId,
      hostTwitchId,
      action: "pause",
      idempotencyKey: key,
    });

    expect(first.code).toBe("ACCEPTED_NEW");
    expect(conflict).toMatchObject({
      code: "IDEMPOTENCY_CONFLICT",
      reason: "IDEMPOTENCY_KEY_REUSED",
      revision: first.revision,
    });
    expect(
      (await repository.snapshotForHost(created.sessionId, hostTwitchId))
        ?.phase,
    ).toBe("ACTIVE");
  });

  it("does not return a cached host control result to a different actor", async () => {
    const hostTwitchId = await seedHost();
    const otherTwitchId = await seedHost();
    const created = await repository.create({
      hostTwitchId,
      caseId: "Q01_GALLERY_SHADOW",
      idempotencyKey: randomUUID(),
    });
    const key = "actor-scope-control-0001";

    const first = await repository.control({
      sessionId: created.sessionId,
      hostTwitchId,
      action: "start",
      idempotencyKey: key,
    });
    const foreign = await repository.control({
      sessionId: created.sessionId,
      hostTwitchId: otherTwitchId,
      action: "start",
      idempotencyKey: key,
    });

    expect(first.code).toBe("ACCEPTED_NEW");
    expect(foreign.code).toBe("NOT_AVAILABLE");
    expect(foreign).not.toEqual(first);
  });

  it("scopes a repeated command identifier to its authenticated actor", async () => {
    const hostTwitchId = await seedHost();
    const sessionId = await createActiveSession(hostTwitchId);
    const base = {
      sessionId,
      inputId: "shared-viewer-command-key",
      source: "twitch" as const,
      channelId: hostTwitchId,
      originBroadcasterId: hostTwitchId,
    };

    const viewerOne = await repository.applyInput({
      ...base,
      actorTwitchId: "viewer-1001",
      text: "!inspect CAM",
      eventSubMessageId: "actor-scope-event-1001",
    });
    const viewerTwo = await repository.applyInput({
      ...base,
      actorTwitchId: "viewer-2002",
      text: "!inspect SCHEDULE",
      eventSubMessageId: "actor-scope-event-2002",
    });
    const snapshot = await repository.snapshotForHost(sessionId, hostTwitchId);

    expect(viewerOne.code).toBe("ACCEPTED_NEW");
    expect(viewerTwo.code).toBe("ACCEPTED_NEW");
    expect(
      snapshot?.clues.find((clue) => clue.id === "CAM")?.observation,
    ).toContain("R-07");
    expect(
      snapshot?.clues.find((clue) => clue.id === "SCHEDULE")?.observation,
    ).toContain("R-07");
    expect(snapshot?.revision).toBe(viewerTwo.revision);
  });

  it("scopes an idempotency key to the session", async () => {
    const hostTwitchId = await seedHost();
    const createdA = await repository.create({
      hostTwitchId,
      caseId: "Q01_GALLERY_SHADOW",
      idempotencyKey: randomUUID(),
    });
    const sessionA = createdA.sessionId;
    const key = "session-scope-control-0001";
    const first = await repository.control({
      sessionId: sessionA,
      hostTwitchId,
      action: "start",
      idempotencyKey: key,
    });
    await repository.control({
      sessionId: sessionA,
      hostTwitchId,
      action: "stop",
      idempotencyKey: randomUUID(),
    });
    const createdB = await repository.create({
      hostTwitchId,
      caseId: "Q01_GALLERY_SHADOW",
      idempotencyKey: randomUUID(),
    });
    const sessionB = createdB.sessionId;
    const second = await repository.control({
      sessionId: sessionB,
      hostTwitchId,
      action: "start",
      idempotencyKey: key,
    });

    expect(first.code).toBe("ACCEPTED_NEW");
    expect(second.code).toBe("ACCEPTED_NEW");
    expect(
      (await repository.snapshotForHost(sessionA, hostTwitchId))?.phase,
    ).toBe("CANCELLED");
    expect(
      (await repository.snapshotForHost(sessionB, hostTwitchId))?.phase,
    ).toBe("ACTIVE");
  });

  it("keeps host command and control idempotency scopes separate", async () => {
    const hostTwitchId = await seedHost();
    const sessionId = await createActiveSession(hostTwitchId);
    const key = "shared-mutation-key-0001";
    const command = await repository.applyInput({
      sessionId,
      inputId: `host:${key}`,
      idempotencyKey: key,
      actorTwitchId: hostTwitchId,
      text: "!inspect CAM",
      source: "host",
    });
    const control = await repository.control({
      sessionId,
      hostTwitchId,
      action: "pause",
      idempotencyKey: key,
    });
    const snapshot = await repository.snapshotForHost(sessionId, hostTwitchId);

    expect(command.code).toBe("ACCEPTED_NEW");
    expect(control.code).toBe("ACCEPTED_NEW");
    expect(control.revision).toBe(command.revision + 1);
    expect(snapshot?.phase).toBe("PAUSED");
    expect(
      snapshot?.clues.find((clue) => clue.id === "CAM")?.observation,
    ).toContain("R-07");
  });

  it("rejects a command id reused with a different payload without advancing revision", async () => {
    const hostTwitchId = await seedHost();
    const sessionId = await createActiveSession(hostTwitchId);
    const before = await repository.snapshotForHost(sessionId, hostTwitchId);
    const key = "command-payload-retry-0001";
    const request = {
      sessionId,
      inputId: `host:${key}`,
      idempotencyKey: key,
      actorTwitchId: hostTwitchId,
      source: "host" as const,
    };

    const first = await repository.applyInput({
      ...request,
      text: "!inspect CAM",
    });
    const conflict = await repository.applyInput({
      ...request,
      text: "!inspect SCHEDULE",
    });
    const after = await repository.snapshotForHost(sessionId, hostTwitchId);

    expect(first.code).toBe("ACCEPTED_NEW");
    expect(conflict).toMatchObject({
      code: "IDEMPOTENCY_CONFLICT",
      reason: "IDEMPOTENCY_KEY_REUSED",
      revision: first.revision,
    });
    expect(after?.revision).toBe(first.revision);
    expect(after?.revision).toBe((before?.revision ?? 0) + 1);
    expect(
      after?.clues.find((clue) => clue.id === "SCHEDULE")?.observation,
    ).toBe(null);
  });

  it("serializes concurrent identical command retries into one state transition", async () => {
    const hostTwitchId = await seedHost();
    const sessionId = await createActiveSession(hostTwitchId);
    const initial = await repository.snapshotForHost(sessionId, hostTwitchId);
    const request = {
      sessionId,
      inputId: "host:concurrent-command-retry-0001",
      idempotencyKey: "concurrent-command-retry-0001",
      actorTwitchId: hostTwitchId,
      text: "!inspect CAM",
      source: "host" as const,
    };

    const results = await Promise.all(
      Array.from({ length: 6 }, () => repository.applyInput(request)),
    );
    const snapshot = await repository.snapshotForHost(sessionId, hostTwitchId);

    expect(results.every((result) => result.code === "ACCEPTED_NEW")).toBe(
      true,
    );
    expect(
      results.every((result) => result.revision === results[0]?.revision),
    ).toBe(true);
    expect(snapshot?.revision).toBe(results[0]?.revision);
    expect(snapshot?.revision).toBe((initial?.revision ?? 0) + 1);
  });

  it("records an interrupted case as partial only after meaningful investigation", async () => {
    const hostWithProgress = await seedHost();
    const active = await repository.create({
      hostTwitchId: hostWithProgress,
      caseId: "Q01_GALLERY_SHADOW",
      idempotencyKey: randomUUID(),
    });
    await repository.control({
      sessionId: active.sessionId,
      hostTwitchId: hostWithProgress,
      action: "start",
      idempotencyKey: randomUUID(),
    });
    const inspected = await repository.applyInput({
      sessionId: active.sessionId,
      inputId: `partial-inspect-${randomUUID()}`,
      actorTwitchId: "viewer-partial",
      text: "!inspect CAM",
      source: "twitch",
      originBroadcasterId: hostWithProgress,
      sourceMessageId: `partial-message-${randomUUID()}`,
    });
    const partial = await repository.control({
      sessionId: active.sessionId,
      hostTwitchId: hostWithProgress,
      action: "stop",
      idempotencyKey: randomUUID(),
    });
    const partialSnapshot = await repository.snapshotForHost(
      active.sessionId,
      hostWithProgress,
    );
    const repeatedStop = await repository.control({
      sessionId: active.sessionId,
      hostTwitchId: hostWithProgress,
      action: "stop",
      idempotencyKey: randomUUID(),
    });

    const emptyHost = await seedHost();
    const empty = await repository.create({
      hostTwitchId: emptyHost,
      caseId: "Q01_GALLERY_SHADOW",
      idempotencyKey: randomUUID(),
    });
    await repository.control({
      sessionId: empty.sessionId,
      hostTwitchId: emptyHost,
      action: "stop",
      idempotencyKey: randomUUID(),
    });
    const emptySnapshot = await repository.snapshotForHost(
      empty.sessionId,
      emptyHost,
    );

    expect(inspected.code).toBe("ACCEPTED_NEW");
    expect(partial.code).toBe("ACCEPTED_NEW");
    expect(partialSnapshot).toMatchObject({
      phase: "PARTIAL",
      paused: true,
      revealText: null,
    });
    expect(partialSnapshot?.stage).not.toBe("reveal");
    expect(repeatedStop.code).toBe("ACCEPTED_ALREADY_KNOWN");
    expect(emptySnapshot?.phase).toBe("CANCELLED");
  });

  it("does not advance the revision for a rejected action", async () => {
    const hostTwitchId = await seedHost();
    const sessionId = await createActiveSession(hostTwitchId);
    const before = await repository.snapshotForHost(sessionId, hostTwitchId);

    const result = await repository.applyInput({
      sessionId,
      inputId: `host:${randomUUID()}`,
      actorTwitchId: hostTwitchId,
      text: "!link CAM SCHEDULE",
      source: "host",
    });
    const after = await repository.snapshotForHost(sessionId, hostTwitchId);

    expect(result.code).toBe("NOT_AVAILABLE");
    expect(after?.revision).toBe(before?.revision);
  });

  it("completes the Q01 evidence path and reveals only after supported proof", async () => {
    const hostTwitchId = await seedHost();
    const sessionId = await createActiveSession(hostTwitchId);
    const initial = await repository.snapshotForHost(sessionId, hostTwitchId);
    const premature = await repository.applyInput({
      sessionId,
      inputId: `q01-early-${randomUUID()}`,
      actorTwitchId: "viewer-1",
      text: "!solve ROBOT",
      source: "twitch",
      originBroadcasterId: hostTwitchId,
      sourceMessageId: `q01-early-message-${randomUUID()}`,
    });
    const commands = [
      "!inspect CAM",
      "!inspect SCHEDULE",
      "!link CAM_R07 CAM_R07",
      "!link CAM_R07 SCHEDULE_R07",
      "!solve ROBOT",
    ];
    const results = [];
    for (const [index, text] of commands.entries()) {
      results.push(
        await repository.applyInput({
          sessionId,
          inputId: `proof-${index}-${randomUUID()}`,
          actorTwitchId: "viewer-1",
          text,
          source: "twitch",
          originBroadcasterId: hostTwitchId,
          sourceMessageId: `proof-message-${index}-${randomUUID()}`,
        }),
      );
    }
    const snapshot = await repository.snapshotForHost(sessionId, hostTwitchId);
    const phase = await pool.query<{ phase: string }>(
      "SELECT phase FROM game_sessions WHERE id = $1",
      [sessionId],
    );

    expect(premature).toMatchObject({
      code: "INVALID",
      reason: "VERDICT_UNPROVEN",
    });
    expect(premature.revision).toBe(initial?.revision);
    expect(results.map((result) => result.code)).toEqual([
      "ACCEPTED_NEW",
      "ACCEPTED_NEW",
      "INVALID",
      "ACCEPTED_NEW",
      "ACCEPTED_NEW",
    ]);
    expect(results[2]?.reason).toBe("SAME_TARGET");
    expect(results[2]?.revision).toBe(results[1]?.revision);
    expect(snapshot?.stage).toBe("reveal");
    expect(snapshot?.revealText).toContain("robot R-07");
    expect(phase.rows[0]?.phase).toBe("RESOLVED");

    const duplicateSolve = await repository.applyInput({
      sessionId,
      inputId: `q01-repeat-solve-${randomUUID()}`,
      actorTwitchId: "viewer-1",
      text: "!solve ROBOT",
      source: "twitch",
      originBroadcasterId: hostTwitchId,
      sourceMessageId: `q01-repeat-message-${randomUUID()}`,
    });
    const afterDuplicateSolve = await repository.snapshotForHost(
      sessionId,
      hostTwitchId,
    );
    expect(duplicateSolve.code).toBe("ACCEPTED_ALREADY_KNOWN");
    expect(afterDuplicateSolve?.revision).toBe(snapshot?.revision);
    expect(afterDuplicateSolve?.revealText).toBe(snapshot?.revealText);
  });

  it("applies concurrent Twitch delivery retries once and restores after repository recreation", async () => {
    const hostTwitchId = await seedHost();
    const sessionId = await createActiveSession(hostTwitchId);
    const input = {
      sessionId,
      inputId: `twitch:${hostTwitchId}:message-1`,
      eventSubMessageId: "eventsub-message-1",
      actorTwitchId: "viewer-1",
      text: "!inspect CAM",
      source: "twitch" as const,
      originBroadcasterId: hostTwitchId,
      sourceMessageId: "message-1",
    };

    const [first, retry] = await Promise.all([
      repository.applyInput(input),
      repository.applyInput(input),
    ]);
    const restoredRepository = new PostgresRoundRepository(
      pool,
      () => 1_800_000_000_000,
    );
    const snapshot = await restoredRepository.snapshotForHost(
      sessionId,
      hostTwitchId,
    );

    expect(first).toEqual(retry);
    expect(first.code).toBe("ACCEPTED_NEW");
    expect(snapshot?.revision).toBe(first.revision);
    expect(
      snapshot?.clues.find((clue) => clue.id === "CAM")?.observation,
    ).toContain("R-07");
  });

  it("fences chat from an EventSub worker whose leader epoch is stale", async () => {
    const hostTwitchId = await seedHost();
    const sessionId = await createActiveSession(hostTwitchId);
    await pool.query(
      `UPDATE eventsub_leader_state SET owner_id = 'current-worker', epoch = 2
       WHERE name = 'eventsub-ingest'`,
    );
    const stale = await repository.applyInput({
      sessionId,
      inputId: `stale-${randomUUID()}`,
      actorTwitchId: "viewer-1",
      text: "!look CAM",
      source: "twitch",
      channelId: hostTwitchId,
      leaderOwnerId: "previous-worker",
      leaderEpoch: 1,
    });
    expect(stale.code).toBe("NOT_AVAILABLE");
    expect(
      (await repository.snapshotForHost(sessionId, hostTwitchId))?.revision,
    ).toBe(2);

    const current = await repository.applyInput({
      sessionId,
      inputId: `current-${randomUUID()}`,
      actorTwitchId: "viewer-1",
      text: "!look CAM",
      source: "twitch",
      channelId: hostTwitchId,
      leaderOwnerId: "current-worker",
      leaderEpoch: 2,
    });
    expect(current.code).toBe("ACCEPTED_NEW");
  });

  it("requires two distinct consenting broadcasters before C01 starts and commits one joint proof", async () => {
    const hostA = await seedHost();
    const hostB = await seedHost();
    const created = await repository.create({
      hostTwitchId: hostA,
      caseId: "C01_HARBOR_SIGNAL",
      idempotencyKey: randomUUID(),
    });
    const waiting = await pool.query<{ phase: string }>(
      "SELECT phase FROM game_sessions WHERE id = $1",
      [created.sessionId],
    );
    expect(waiting.rows[0]?.phase).toBe("COOP_WAITING");
    expect(
      (
        await repository.control({
          sessionId: created.sessionId,
          hostTwitchId: hostA,
          action: "start",
          idempotencyKey: randomUUID(),
        })
      ).reason,
    ).toBe("TEAM_REQUIRED");

    const invite = await repository.createCoopInvitation({
      sessionId: created.sessionId,
      inviterTwitchId: hostA,
      inviteeTwitchId: hostB,
      tokenHash: "test-invite-token-hash",
      idempotencyKey: randomUUID(),
    });
    expect(invite).not.toBeNull();
    expect(
      await repository.acceptCoopInvitation({
        inviteId: invite!.inviteId,
        inviteeTwitchId: hostA,
        tokenHash: "test-invite-token-hash",
        idempotencyKey: randomUUID(),
      }),
    ).toBeNull();

    const accepted = await repository.acceptCoopInvitation({
      inviteId: invite!.inviteId,
      inviteeTwitchId: hostB,
      tokenHash: "test-invite-token-hash",
      idempotencyKey: randomUUID(),
    });
    expect(accepted?.alreadyAccepted).toBe(false);
    const repeated = await repository.acceptCoopInvitation({
      inviteId: invite!.inviteId,
      inviteeTwitchId: hostB,
      tokenHash: "test-invite-token-hash",
      idempotencyKey: randomUUID(),
    });
    expect(repeated?.alreadyAccepted).toBe(true);

    await repository.control({
      sessionId: created.sessionId,
      hostTwitchId: hostA,
      action: "start",
      idempotencyKey: randomUUID(),
    });
    const inputs = [
      { channelId: hostA, actorTwitchId: "viewer-a", text: "!scan P4" },
      { channelId: hostA, actorTwitchId: "viewer-a", text: "!share SCAN_P4" },
      { channelId: hostB, actorTwitchId: "viewer-b", text: "!verify B17" },
      {
        channelId: hostB,
        actorTwitchId: "viewer-b",
        text: "!share MANUAL_B17_212",
      },
      { channelId: hostA, actorTwitchId: "viewer-a", text: "!solve B17" },
    ];
    for (const [index, input] of inputs.entries()) {
      const result = await repository.applyInput({
        sessionId: created.sessionId,
        inputId: `coop-${index}-${randomUUID()}`,
        actorTwitchId: input.actorTwitchId,
        text: input.text,
        source: "twitch",
        channelId: input.channelId,
        originBroadcasterId: input.channelId,
        sourceMessageId: `coop-message-${index}-${randomUUID()}`,
      });
      expect(result.code).toBe("ACCEPTED_NEW");
    }
    const teamA = await repository.snapshotForParticipant(
      created.sessionId,
      hostA,
    );
    const teamB = await repository.snapshotForParticipant(
      created.sessionId,
      hostB,
    );
    expect(teamA?.stage).toBe("reveal");
    expect(teamB?.stage).toBe("reveal");
    expect(teamA?.team).toBe("A");
    expect(teamB?.team).toBe("B");
    expect(teamA?.clues.map((clue) => clue.id)).toEqual(["COAST"]);
    expect(teamB?.clues.map((clue) => clue.id)).toEqual(["RADAR", "MANUAL"]);
  });

  it("preserves local progress but freezes joint proof until the revoked partner reauthorizes and rejoins", async () => {
    const coop = await createActiveCoop();
    const sessions = new SessionStore(
      pool,
      Buffer.alloc(32, 1),
      Buffer.alloc(32, 2),
      Buffer.alloc(32, 3),
    );
    await coop.input("B", "!verify B17");
    await coop.input("B", "!share MANUAL_B17_212");
    expect(await sessions.markTwitchRevoked(coop.hostB)).toBe(true);
    expect((await coop.input("A", "!scan P4")).code).toBe("ACCEPTED_NEW");
    const before = await repository.snapshotForParticipant(
      coop.sessionId,
      coop.hostA,
    );
    expect(await coop.input("A", "!share SCAN_P4")).toMatchObject({
      code: "NOT_AVAILABLE",
      reason: "TEAM_REQUIRED",
      revision: before!.revision,
    });
    expect((await coop.input("A", "!solve B17")).code).not.toBe("ACCEPTED_NEW");
    const waiting = await repository.snapshotForParticipant(
      coop.sessionId,
      coop.hostA,
    );
    expect(waiting!.phase).toBe("ACTIVE");
    expect(waiting!.evidence.map((item) => item.id)).toContain("SCAN_P4");
    expect(waiting!.evidence.map((item) => item.id)).not.toContain(
      "JOINT_PROOF_B17",
    );

    await sessions.saveTwitchAccount(
      { id: coop.hostB, login: "returned", displayName: "Returned partner" },
      {
        accessToken: "fixture-access",
        refreshToken: "fixture-refresh",
        scopes: ["user:read:chat"],
        expiresIn: 3600,
      },
    );
    expect((await coop.input("A", "!share SCAN_P4")).code).toBe(
      "NOT_AVAILABLE",
    );
    expect(
      await repository.rejoinCoopSession({
        sessionId: coop.sessionId,
        broadcasterId: coop.hostB,
      }),
    ).toMatchObject({ alreadyRejoined: false });
    expect((await coop.input("A", "!share SCAN_P4")).code).toBe("ACCEPTED_NEW");
    expect((await coop.input("A", "!solve B17")).code).toBe("ACCEPTED_NEW");
    expect(
      (await repository.snapshotForParticipant(coop.sessionId, coop.hostB))!
        .stage,
    ).toBe("reveal");
  });

  it("freezes joint proof and proven verdicts during either provider outage without pausing local work", async () => {
    const disconnected = new Set<string>();
    const liveRepository = new PostgresRoundRepository(
      pool,
      () => 1_800_000_000_000,
      (userId) => !disconnected.has(userId),
    );
    const coop = await createActiveCoop(liveRepository);
    await coop.input("B", "!verify B17");
    await coop.input("B", "!share MANUAL_B17_212");
    disconnected.add(coop.hostB);
    expect((await coop.input("A", "!scan P4")).code).toBe("ACCEPTED_NEW");
    expect(await coop.input("A", "!share SCAN_P4")).toMatchObject({
      code: "NOT_AVAILABLE",
      reason: "TEAM_REQUIRED",
    });
    disconnected.clear();
    expect((await coop.input("A", "!share SCAN_P4")).code).toBe("ACCEPTED_NEW");
    disconnected.add(coop.hostA);
    const before = await liveRepository.snapshotForParticipant(
      coop.sessionId,
      coop.hostB,
    );
    expect(await coop.input("B", "!solve B17")).toMatchObject({
      code: "NOT_AVAILABLE",
      reason: "TEAM_REQUIRED",
      revision: before!.revision,
    });
    expect((await coop.input("B", "!look RADAR")).code).toBe("ACCEPTED_NEW");
    disconnected.clear();
    expect((await coop.input("B", "!solve B17")).code).toBe("ACCEPTED_NEW");
  });

  it("persists expiration when the first acceptance attempt arrives after the deadline", async () => {
    const hostA = await seedHost();
    const hostB = await seedHost();
    const created = await repository.create({
      hostTwitchId: hostA,
      caseId: "C01_HARBOR_SIGNAL",
      idempotencyKey: randomUUID(),
    });
    const invite = await repository.createCoopInvitation({
      sessionId: created.sessionId,
      inviterTwitchId: hostA,
      inviteeTwitchId: hostB,
      tokenHash: "expired-invite-token-hash",
      idempotencyKey: randomUUID(),
    });
    await pool.query(
      "UPDATE coop_invites SET expires_at = now() - interval '1 second' WHERE id = $1",
      [invite!.inviteId],
    );

    await expect(
      repository.acceptCoopInvitation({
        inviteId: invite!.inviteId,
        inviteeTwitchId: hostB,
        tokenHash: "expired-invite-token-hash",
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(CoopInviteExpiredError);
    const status = await pool.query<{ status: string }>(
      "SELECT status FROM coop_invites WHERE id = $1",
      [invite!.inviteId],
    );
    expect(status.rows[0]?.status).toBe("EXPIRED");
    await repository.control({
      sessionId: created.sessionId,
      hostTwitchId: hostA,
      action: "stop",
      idempotencyKey: randomUUID(),
    });
  });
});
