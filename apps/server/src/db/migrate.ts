import type { Pool } from "pg";
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
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(731943, 1)");
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_migrations (
        name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    const applied = await client.query<{ name: string }>(
      "SELECT name FROM app_migrations",
    );
    const appliedNames = new Set(applied.rows.map((row) => row.name));
    for (const migration of migrations) {
      if (appliedNames.has(migration.name)) continue;
      await client.query(migration.sql);
      await client.query("INSERT INTO app_migrations (name) VALUES ($1)", [
        migration.name,
      ]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
