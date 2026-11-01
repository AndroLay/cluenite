import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { EventSubLeaderIdentity } from "../twitch/connectionManager.js";

const ADVISORY_LOCK_CLASS = 731_943;
const ADVISORY_LOCK_OBJECT = 2;
const LEADER_NAME = "eventsub-ingest";

export interface EventSubLeaderCallbacks {
  readonly onAcquired: (
    identity: EventSubLeaderIdentity,
  ) => void | Promise<void>;
  readonly onLost: () => void | Promise<void>;
  readonly reconcile?: () => void | Promise<void>;
}

// Holds a PostgreSQL session advisory lock as the election primitive. Every
// admitted chat transaction also checks the persisted epoch under a row lock,
// fencing out a worker that continues after its database connection is lost.
export class EventSubLeader {
  private readonly ownerId = randomUUID();
  private client: PoolClient | null = null;
  private leader: EventSubLeaderIdentity | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;
  private running = false;
  private lastReconcileAt = 0;

  constructor(
    private readonly pool: Pool,
    private readonly callbacks: EventSubLeaderCallbacks,
    private readonly now: () => number = Date.now,
    private readonly pollMs = 5_000,
    private readonly reconcileMs = 15_000,
  ) {}

  identity(): EventSubLeaderIdentity | null {
    return this.leader;
  }

  isLeader(): boolean {
    return this.leader !== null;
  }

  async start(): Promise<void> {
    if (this.closed) throw new Error("EventSub leader is closed.");
    await this.checkNow();
  }

  async checkNow(): Promise<void> {
    if (this.closed || this.running) return;
    this.running = true;
    try {
      if (this.client && this.leader) {
        await this.heartbeat();
        if (
          this.leader &&
          this.callbacks.reconcile &&
          this.now() - this.lastReconcileAt >= this.reconcileMs
        ) {
          this.lastReconcileAt = this.now();
          await this.callbacks.reconcile();
        }
      } else {
        await this.tryAcquire();
      }
    } finally {
      this.running = false;
      this.schedule();
    }
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    await this.release(true);
  }

  private async heartbeat(): Promise<void> {
    const client = this.client;
    const leader = this.leader;
    if (!client || !leader) return;
    try {
      const result = await client.query(
        `UPDATE eventsub_leader_state SET updated_at = now()
         WHERE name = $1 AND owner_id = $2 AND epoch = $3`,
        [LEADER_NAME, leader.ownerId, leader.epoch],
      );
      if (result.rowCount !== 1)
        throw new Error("EventSub leader epoch changed.");
    } catch {
      await this.release(false);
    }
  }

  private async tryAcquire(): Promise<void> {
    let client: PoolClient;
    try {
      client = await this.pool.connect();
    } catch {
      return;
    }
    try {
      const lock = await client.query<{ locked: boolean }>(
        "SELECT pg_try_advisory_lock($1, $2) AS locked",
        [ADVISORY_LOCK_CLASS, ADVISORY_LOCK_OBJECT],
      );
      if (!lock.rows[0]?.locked) {
        client.release();
        return;
      }
      await client.query("BEGIN");
      const elected = await client.query<{ epoch: string | number }>(
        `UPDATE eventsub_leader_state
         SET epoch = epoch + 1, owner_id = $2, acquired_at = now(), updated_at = now()
         WHERE name = $1 RETURNING epoch`,
        [LEADER_NAME, this.ownerId],
      );
      if (!elected.rows[0])
        throw new Error("EventSub leader state is missing.");
      await client.query("COMMIT");
      this.client = client;
      this.leader = {
        ownerId: this.ownerId,
        epoch: Number(elected.rows[0].epoch),
      };
      this.lastReconcileAt = this.now();
      await this.callbacks.onAcquired(this.leader);
    } catch {
      await client.query("ROLLBACK").catch(() => undefined);
      if (this.client === client) await this.release(false);
      else {
        await client
          .query("SELECT pg_advisory_unlock($1, $2)", [
            ADVISORY_LOCK_CLASS,
            ADVISORY_LOCK_OBJECT,
          ])
          .catch(() => undefined);
        client.release();
      }
    }
  }

  private async release(connected: boolean): Promise<void> {
    const client = this.client;
    const hadLeader = this.leader !== null;
    this.client = null;
    this.leader = null;
    if (hadLeader)
      await Promise.resolve(this.callbacks.onLost()).catch(() => undefined);
    if (!client) return;
    if (connected) {
      await client
        .query(
          `UPDATE eventsub_leader_state SET owner_id = NULL, updated_at = now()
         WHERE name = $1 AND owner_id = $2`,
          [LEADER_NAME, this.ownerId],
        )
        .catch(() => undefined);
      await client
        .query("SELECT pg_advisory_unlock($1, $2)", [
          ADVISORY_LOCK_CLASS,
          ADVISORY_LOCK_OBJECT,
        ])
        .catch(() => undefined);
    }
    client.release(!connected);
  }

  private schedule(): void {
    if (this.closed || this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.checkNow();
    }, this.pollMs);
    this.timer.unref?.();
  }
}
