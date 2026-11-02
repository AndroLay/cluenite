import { Pool } from "pg";
import type { FastifyBaseLogger } from "fastify";

export function createDatabasePool(
  connectionString: string,
  logger: Pick<FastifyBaseLogger, "warn">,
): Pool {
  const pool = new Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    query_timeout: 15_000,
    statement_timeout: 10_000,
    lock_timeout: 3_000,
    idle_in_transaction_session_timeout: 10_000,
  });
  // pg emits idle-connection failures outside request promises. Always handle them.
  pool.on("error", () =>
    logger.warn(
      { code: "DATABASE_POOL_ERROR" },
      "Idle database connection failed",
    ),
  );
  return pool;
}
