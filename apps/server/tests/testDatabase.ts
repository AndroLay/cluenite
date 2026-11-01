import { randomUUID } from "node:crypto";
import { config as loadDotEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { Pool } from "pg";
import { migrate } from "../src/db/migrate.js";

loadDotEnv({
  path: resolve(fileURLToPath(new URL("../../../.env", import.meta.url))),
});

export async function createIsolatedDatabase(): Promise<{
  pool: Pool;
  close: () => Promise<void>;
}> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString)
    throw new Error(
      "DATABASE_URL is required for PostgreSQL integration tests.",
    );
  const target = new URL(connectionString);
  if (
    !["127.0.0.1", "localhost", "[::1]"].includes(target.hostname) ||
    target.pathname !== "/cluenite"
  ) {
    throw new Error(
      "PostgreSQL integration tests only run against the local cluenite development database.",
    );
  }

  const schemaName = `cluenite_test_${randomUUID().replaceAll("-", "")}`;
  if (!/^cluenite_test_[a-f0-9]{32}$/.test(schemaName))
    throw new Error("Unsafe test schema name.");
  const admin = new Pool({ connectionString });
  let pool: Pool | null = null;
  try {
    await admin.query(`CREATE SCHEMA "${schemaName}"`);
    pool = new Pool({
      connectionString,
      options: `-c search_path=${schemaName}`,
    });
    await migrate(pool);
  } catch (error) {
    if (pool) await pool.end();
    await admin
      .query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`)
      .catch(() => undefined);
    await admin.end();
    throw error;
  }

  return {
    pool,
    async close() {
      await pool?.end();
      await admin.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
      await admin.end();
    },
  };
}
