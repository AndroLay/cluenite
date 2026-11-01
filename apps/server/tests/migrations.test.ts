import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "../src/db/migrate.js";
import { createIsolatedDatabase } from "./testDatabase.js";

const databaseUrl = process.env.DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

describeWithDatabase("PostgreSQL migrations", () => {
  let database: Awaited<ReturnType<typeof createIsolatedDatabase>>;

  beforeAll(async () => {
    database = await createIsolatedDatabase();
  });

  afterAll(async () => {
    if (database) await database.close();
  });

  it("applies ordered backend migrations exactly once in an isolated namespace", async () => {
    await migrate(database.pool);
    await migrate(database.pool);

    const result = await database.pool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM app_migrations",
    );
    const tables = await database.pool.query<{
      sessions: string | null;
      outbox: string | null;
      channels: string | null;
      invites: string | null;
    }>(
      `SELECT to_regclass('game_sessions') AS sessions, to_regclass('outbox') AS outbox,
              to_regclass('session_channels') AS channels, to_regclass('coop_invites') AS invites`,
    );
    const inviteColumns = await database.pool.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = 'coop_invites'`,
    );
    const processedInputColumns = await database.pool.query<{
      column_name: string;
    }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = 'processed_inputs'`,
    );
    const phaseConstraint = await database.pool.query<{ definition: string }>(
      `SELECT pg_get_constraintdef(c.oid) AS definition
       FROM pg_constraint c
       JOIN pg_class t ON t.oid = c.conrelid
       JOIN pg_namespace n ON n.oid = t.relnamespace
       WHERE n.nspname = current_schema() AND t.relname = 'game_sessions'
         AND c.conname = 'game_sessions_phase_check'`,
    );
    expect(result.rows[0]?.count).toBe("5");
    expect(tables.rows[0]?.sessions).toBe("game_sessions");
    expect(tables.rows[0]?.outbox).toBe("outbox");
    expect(tables.rows[0]?.channels).toBe("session_channels");
    expect(tables.rows[0]?.invites).toBe("coop_invites");
    expect(inviteColumns.rows.map(({ column_name }) => column_name)).toContain(
      "decline_idempotency_key",
    );
    expect(
      processedInputColumns.rows.map(({ column_name }) => column_name),
    ).toContain("request_fingerprint");
    expect(phaseConstraint.rows[0]?.definition).toContain("PARTIAL");
  });
});
