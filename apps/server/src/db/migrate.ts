import type { Pool, QueryConfig, QueryResultRow } from "pg";
import { migration0001Backend } from "./migrations/0001_backend.js";
import { migration0002BackendCompletion } from "./migrations/0002_backend_completion.js";
import { migration0003CoopInviteDecline } from "./migrations/0003_coop_invite_decline.js";
import { migration0004PartialPhase } from "./migrations/0004_partial_phase.js";
import { migration0005ProcessedInputFingerprint } from "./migrations/0005_processed_input_fingerprint.js";

const migrations = [
  migration0001Backend,
  migration0002BackendCompletion,
  migration0003CoopInviteDecline,
  migration0004PartialPhase,
  migration0005ProcessedInputFingerprint,
] as const;

export async function migrate(pool: Pool): Promise<void> {
  const client = await pool.connect();
  // Startup DDL needs a separate, bounded budget from interactive request SQL.
  const query = <Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ) => {
    // The installed pg runtime accepts this per-query option; its QueryConfig type omits it.
    const config: QueryConfig & { query_timeout: number } = {
      text,
      ...(values ? { values } : {}),
      query_timeout: 65_000,
    };
    return client.query<Row>(config);
  };
  try {
    await query("BEGIN");
    await query("SET LOCAL lock_timeout = '30s'");
    await query("SET LOCAL statement_timeout = '60s'");
    await query("SET LOCAL idle_in_transaction_session_timeout = '60s'");
    await query("SELECT pg_advisory_xact_lock(731943, 1)");
    await query(`
      CREATE TABLE IF NOT EXISTS app_migrations (
        name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    const applied = await query<{ name: string }>(
      "SELECT name FROM app_migrations",
    );
    const appliedNames = new Set(applied.rows.map((row) => row.name));
    for (const migration of migrations) {
      if (appliedNames.has(migration.name)) continue;
      await query(migration.sql);
      await query("INSERT INTO app_migrations (name) VALUES ($1)", [
        migration.name,
      ]);
    }
    await query("COMMIT");
  } catch (error) {
    await query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
