import type { Pool } from "pg";

export interface MaintenanceOptions {
  readonly apply: boolean;
  readonly eraseAccount?: string;
}

/** A bounded transaction; previews execute SELECT statements only. */
export async function maintainData(pool: Pool, options: MaintenanceOptions) {
  if (
    options.eraseAccount !== undefined &&
    !/^[A-Za-z0-9-]{1,128}$/.test(options.eraseAccount)
  )
    throw new Error("Account identifier is invalid.");
  const client = await pool.connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
    await client.query("SET LOCAL statement_timeout = '30s'");
    await client.query("SET LOCAL lock_timeout = '5s'");
    // Never remove live proof, retry receipts, or an undelivered event.
    const sessions = options.eraseAccount
      ? { rows: [] as { id: string }[] }
      : await client.query<{ id: string }>(
          `SELECT s.id FROM game_sessions s
       WHERE s.phase IN ('RESOLVED', 'CANCELLED', 'PARTIAL') AND s.updated_at < now() - interval '30 days'
         AND NOT EXISTS (SELECT 1 FROM outbox o WHERE o.session_id = s.id AND o.published_at IS NULL)
       ORDER BY s.updated_at, s.id LIMIT 100 FOR UPDATE OF s SKIP LOCKED`,
        );
    const sessionIds = sessions.rows.map((row) => row.id);
    const userSessions = options.eraseAccount
      ? { rows: [] as { token_hash: string }[] }
      : await client.query<{ token_hash: string }>(
          `SELECT token_hash FROM user_sessions
       WHERE expires_at < now() - interval '1 day' OR revoked_at < now() - interval '1 day'
       ORDER BY expires_at, token_hash LIMIT 1000 FOR UPDATE SKIP LOCKED`,
        );
    const tokenHashes = userSessions.rows.map((row) => row.token_hash);
    // Virtually exclude this batch for preview counts; foreign keys enforce the same rule on apply.
    const accounts = await client.query<{ twitch_user_id: string }>(
      `SELECT a.twitch_user_id FROM twitch_accounts a WHERE
       CASE WHEN $3::text IS NOT NULL THEN a.twitch_user_id = $3 AND a.revoked_at IS NOT NULL
       ELSE (a.revoked_at < now() - interval '30 days' OR a.token_expires_at < now() - interval '30 days') END
       AND NOT EXISTS (SELECT 1 FROM game_sessions s WHERE s.host_twitch_id = a.twitch_user_id AND NOT (s.id = ANY($1::uuid[])))
       AND NOT EXISTS (SELECT 1 FROM session_channels sc WHERE sc.broadcaster_id = a.twitch_user_id AND NOT (sc.session_id = ANY($1::uuid[])))
       AND NOT EXISTS (SELECT 1 FROM coop_invites i WHERE (i.inviter_twitch_id = a.twitch_user_id OR i.invitee_twitch_id = a.twitch_user_id) AND NOT (i.session_id = ANY($1::uuid[])))
       AND NOT EXISTS (SELECT 1 FROM contributions c WHERE (c.actor_twitch_id = a.twitch_user_id OR c.origin_broadcaster_id = a.twitch_user_id) AND NOT (c.session_id = ANY($1::uuid[])))
       AND NOT EXISTS (SELECT 1 FROM processed_inputs p WHERE p.actor_twitch_id = a.twitch_user_id AND NOT (p.session_id = ANY($1::uuid[])))
       AND NOT EXISTS (SELECT 1 FROM session_events e WHERE e.actor_twitch_id = a.twitch_user_id AND NOT (e.session_id = ANY($1::uuid[])))
       AND ($3::text IS NOT NULL OR NOT EXISTS (SELECT 1 FROM user_sessions u WHERE u.twitch_user_id = a.twitch_user_id AND NOT (u.token_hash = ANY($2::text[]))))
       ORDER BY a.twitch_user_id LIMIT 100 FOR UPDATE OF a SKIP LOCKED`,
      [sessionIds, tokenHashes, options.eraseAccount ?? null],
    );
    if (options.eraseAccount && accounts.rows.length === 0) {
      const exists = await client.query(
        "SELECT 1 FROM twitch_accounts WHERE twitch_user_id = $1",
        [options.eraseAccount],
      );
      if (exists.rowCount)
        throw new Error(
          "Account erasure requires revocation and no retained session, contribution, invitation, or co-op participant references.",
        );
    }
    const blocked = await client.query<{ count: string }>(
      `SELECT count(*) FROM game_sessions s WHERE s.phase IN ('RESOLVED', 'CANCELLED', 'PARTIAL')
       AND s.updated_at < now() - interval '30 days'
       AND EXISTS (SELECT 1 FROM outbox o WHERE o.session_id = s.id AND o.published_at IS NULL)`,
    );
    if (options.apply) {
      await client.query(
        "DELETE FROM game_sessions WHERE id = ANY($1::uuid[])",
        [sessionIds],
      );
      await client.query(
        "DELETE FROM user_sessions WHERE token_hash = ANY($1::text[])",
        [tokenHashes],
      );
      await client.query(
        "DELETE FROM twitch_accounts WHERE twitch_user_id = ANY($1::text[])",
        [accounts.rows.map((row) => row.twitch_user_id)],
      );
    }
    await client.query(options.apply ? "COMMIT" : "ROLLBACK");
    return {
      applied: options.apply,
      sessions: sessionIds.length,
      userSessions: tokenHashes.length,
      accounts: accounts.rows.length,
      blockedPendingSessions: Number(blocked.rows[0]?.count ?? 0),
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
