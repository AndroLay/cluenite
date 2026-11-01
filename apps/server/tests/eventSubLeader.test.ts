import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { EventSubLeader } from "../src/ops/eventSubLeader.js";
import { createIsolatedDatabase } from "./testDatabase.js";

const describeWithDatabase = process.env.DATABASE_URL
  ? describe
  : describe.skip;

describeWithDatabase("EventSub leader fencing", () => {
  let database: Awaited<ReturnType<typeof createIsolatedDatabase>>;
  let pool: Pool;

  beforeAll(async () => {
    database = await createIsolatedDatabase();
    pool = database.pool;
  });

  afterAll(async () => {
    if (database) await database.close();
  });

  it("elects one worker and advances the fencing epoch when ownership changes", async () => {
    let firstLost = 0;
    let secondAcquired = 0;
    const first = new EventSubLeader(
      pool,
      {
        onAcquired: () => undefined,
        onLost: () => {
          firstLost += 1;
        },
      },
      Date.now,
      60_000,
    );
    const second = new EventSubLeader(
      pool,
      {
        onAcquired: () => {
          secondAcquired += 1;
        },
        onLost: () => undefined,
      },
      Date.now,
      60_000,
    );

    await first.start();
    const firstIdentity = first.identity();
    expect(firstIdentity).not.toBeNull();
    await second.start();
    expect(second.identity()).toBeNull();

    await first.close();
    expect(firstLost).toBe(1);
    await second.checkNow();
    const secondIdentity = second.identity();
    expect(secondIdentity).not.toBeNull();
    expect(secondIdentity!.epoch).toBeGreaterThan(firstIdentity!.epoch);
    expect(secondAcquired).toBe(1);

    await second.close();
  });
});
