import { describe, it, expect } from "vitest";
import type { FastifyBaseLogger } from "fastify";
import { createDatabasePool } from "../src/db/pool.js";
import { createIsolatedDatabase } from "./testDatabase.js";
import { migrate } from "../src/db/migrate.js";
import { setTimeout as delay } from "node:timers/promises";

describe("production database resource policy", () => {
  it("handles idle pool errors without exposing diagnostic secrets or crashing", async () => {
    const entries: unknown[] = [];
    const log = { warn: (...args: unknown[]) => entries.push(args) } as Pick<
      FastifyBaseLogger,
      "warn"
    >;
    const pool = createDatabasePool("postgresql://localhost/cluenite", log);
    try {
      expect(() =>
        pool.emit("error", new Error("synthetic-private-database-detail")),
      ).not.toThrow();
      expect(entries).toEqual([
        [{ code: "DATABASE_POOL_ERROR" }, "Idle database connection failed"],
      ]);
    } finally {
      await pool.end();
    }
  });

  const withDatabase = process.env.DATABASE_URL ? it : it.skip;
  withDatabase(
    "allows bounded migration-lock contention beyond the short request lock budget",
    async () => {
      const database = await createIsolatedDatabase();
      const target = new URL(process.env.DATABASE_URL!);
      target.searchParams.set("options", String(database.pool.options.options));
      const pool = createDatabasePool(target.href, { warn: () => {} } as Pick<
        FastifyBaseLogger,
        "warn"
      >);
      const owner = await database.pool.connect();
      let failed = false;
      let migrating: Promise<void> | undefined;
      try {
        await owner.query("BEGIN");
        await owner.query("SELECT pg_advisory_xact_lock(731943,1)");
        migrating = migrate(pool).catch(() => {
          failed = true;
        });
        await delay(3250);
        expect(failed).toBe(false);
        await owner.query("ROLLBACK");
        await migrating;
        expect(
          (await pool.query("SHOW lock_timeout")).rows[0].lock_timeout,
        ).toBe("3s");
      } finally {
        await owner.query("ROLLBACK").catch(() => {});
        owner.release();
        await migrating;
        await pool.end();
        await database.close();
      }
    },
    10000,
  );
  withDatabase(
    "cancels a blocked lock at the server and remains usable after rollback",
    async () => {
      const database = await createIsolatedDatabase();
      const target = new URL(process.env.DATABASE_URL!);
      target.searchParams.set("options", String(database.pool.options.options));
      const pool = createDatabasePool(target.href, { warn: () => {} } as Pick<
        FastifyBaseLogger,
        "warn"
      >);
      const owner = await pool.connect();
      try {
        await owner.query("CREATE TABLE resource_lock_fixture (id integer)");
        await owner.query("BEGIN");
        await owner.query(
          "LOCK TABLE resource_lock_fixture IN ACCESS EXCLUSIVE MODE",
        );
        await expect(
          pool.query("SELECT * FROM resource_lock_fixture"),
        ).rejects.toMatchObject({ code: "55P03" });
        await owner.query("ROLLBACK");
        expect((await pool.query("SELECT 1 AS ok")).rows[0].ok).toBe(1);
      } finally {
        await owner.query("ROLLBACK").catch(() => {});
        owner.release();
        await pool.end();
        await database.close();
      }
    },
    10000,
  );

  withDatabase(
    "cancels slow SQL on PostgreSQL rather than only abandoning the client wait",
    async () => {
      const database = await createIsolatedDatabase();
      const target = new URL(process.env.DATABASE_URL!);
      target.searchParams.set("options", String(database.pool.options.options));
      const pool = createDatabasePool(target.href, { warn: () => {} } as Pick<
        FastifyBaseLogger,
        "warn"
      >);
      try {
        await expect(pool.query("SELECT pg_sleep(11)")).rejects.toMatchObject({
          code: "57014",
        });
        expect((await pool.query("SELECT 1 AS ok")).rows[0].ok).toBe(1);
      } finally {
        await pool.end();
        await database.close();
      }
    },
    15000,
  );
});
