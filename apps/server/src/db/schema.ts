import {
  bigint,
  bigserial,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { CommandResult, RoundSnapshot } from "@cluenite/contracts";

const timestamptz = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "date" });

export const twitchAccounts = pgTable("twitch_accounts", {
  twitchUserId: text("twitch_user_id").primaryKey(),
  login: text("login").notNull(),
  displayName: text("display_name").notNull(),
  accessTokenCiphertext: text("access_token_ciphertext").notNull(),
  accessTokenIv: text("access_token_iv").notNull(),
  accessTokenTag: text("access_token_tag").notNull(),
  refreshTokenCiphertext: text("refresh_token_ciphertext").notNull(),
  refreshTokenIv: text("refresh_token_iv").notNull(),
  refreshTokenTag: text("refresh_token_tag").notNull(),
  scopes: text("scopes").array().notNull(),
  tokenExpiresAt: timestamptz("token_expires_at").notNull(),
  revokedAt: timestamptz("revoked_at"),
  lastValidatedAt: timestamptz("last_validated_at"),
  createdAt: timestamptz("created_at").notNull(),
  updatedAt: timestamptz("updated_at").notNull(),
});

export const userSessions = pgTable("user_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  csrfHash: text("csrf_hash").notNull(),
  twitchUserId: text("twitch_user_id")
    .notNull()
    .references(() => twitchAccounts.twitchUserId, { onDelete: "cascade" }),
  expiresAt: timestamptz("expires_at").notNull(),
  createdAt: timestamptz("created_at").notNull(),
  lastSeenAt: timestamptz("last_seen_at").notNull(),
  revokedAt: timestamptz("revoked_at"),
});

export const cases = pgTable(
  "cases",
  {
    caseId: text("case_id").notNull(),
    version: integer("version").notNull(),
    contentHash: text("content_hash").notNull(),
    publicMetadata: jsonb("public_metadata").notNull(),
    createdAt: timestamptz("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("cases_id_version_unique").on(table.caseId, table.version),
  ],
);

export const gameSessions = pgTable(
  "game_sessions",
  {
    id: uuid("id").primaryKey(),
    hostTwitchId: text("host_twitch_id")
      .notNull()
      .references(() => twitchAccounts.twitchUserId),
    caseId: text("case_id").notNull(),
    caseVersion: integer("case_version").notNull(),
    caseContentHash: text("case_content_hash").notNull(),
    phase: text("phase").notNull(),
    source: text("source").notNull(),
    revision: bigint("revision", { mode: "number" }).notNull(),
    state: jsonb("state").notNull(),
    createIdempotencyKey: text("create_idempotency_key").notNull(),
    createdAt: timestamptz("created_at").notNull(),
    updatedAt: timestamptz("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("game_sessions_host_create_key_unique").on(
      table.hostTwitchId,
      table.createIdempotencyKey,
    ),
    uniqueIndex("game_sessions_one_open_per_host_idx")
      .on(table.hostTwitchId)
      .where(sql`phase IN ('COOP_WAITING', 'READY', 'ACTIVE', 'PAUSED')`),
    index("game_sessions_host_updated_idx").on(
      table.hostTwitchId,
      table.updatedAt,
    ),
  ],
);

export const sessionChannels = pgTable(
  "session_channels",
  {
    sessionId: uuid("session_id")
      .notNull()
      .references(() => gameSessions.id, { onDelete: "cascade" }),
    broadcasterId: text("broadcaster_id")
      .notNull()
      .references(() => twitchAccounts.twitchUserId),
    teamRole: text("team_role").notNull(),
    consentedAt: timestamptz("consented_at").notNull().defaultNow(),
    revokedAt: timestamptz("revoked_at"),
  },
  (table) => [
    uniqueIndex("session_channels_session_team_unique").on(
      table.sessionId,
      table.teamRole,
    ),
    uniqueIndex("session_channels_session_broadcaster_unique").on(
      table.sessionId,
      table.broadcasterId,
    ),
    index("session_channels_broadcaster_idx").on(
      table.broadcasterId,
      table.sessionId,
    ),
  ],
);

export const coopInvites = pgTable(
  "coop_invites",
  {
    id: uuid("id").primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => gameSessions.id, { onDelete: "cascade" }),
    inviterTwitchId: text("inviter_twitch_id")
      .notNull()
      .references(() => twitchAccounts.twitchUserId),
    inviteeTwitchId: text("invitee_twitch_id").notNull(),
    tokenHash: text("token_hash").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    status: text("status").notNull(),
    expiresAt: timestamptz("expires_at").notNull(),
    acceptedAt: timestamptz("accepted_at"),
    acceptIdempotencyKey: text("accept_idempotency_key"),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("coop_invites_token_hash_unique").on(table.tokenHash),
    uniqueIndex("coop_invites_idempotency_unique").on(
      table.sessionId,
      table.inviterTwitchId,
      table.idempotencyKey,
    ),
    index("coop_invites_session_status_idx").on(
      table.sessionId,
      table.status,
      table.expiresAt,
    ),
  ],
);

export const eventsubLeaderState = pgTable("eventsub_leader_state", {
  name: text("name").primaryKey(),
  epoch: bigint("epoch", { mode: "number" }).notNull().default(0),
  ownerId: text("owner_id"),
  acquiredAt: timestamptz("acquired_at"),
  updatedAt: timestamptz("updated_at").notNull().defaultNow(),
});

export const processedInputs = pgTable("processed_inputs", {
  inputId: text("input_id").primaryKey(),
  eventSubMessageId: text("eventsub_message_id").unique(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => gameSessions.id, { onDelete: "cascade" }),
  actorTwitchId: text("actor_twitch_id"),
  actionSummary: text("action_summary").notNull(),
  result: jsonb("result").$type<CommandResult>().notNull(),
  createdAt: timestamptz("created_at").notNull(),
});

export const sessionEvents = pgTable(
  "session_events",
  {
    eventId: uuid("event_id").primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => gameSessions.id, { onDelete: "cascade" }),
    revision: bigint("revision", { mode: "number" }).notNull(),
    eventType: text("event_type").notNull(),
    actorTwitchId: text("actor_twitch_id"),
    payload: jsonb("payload").$type<RoundSnapshot>().notNull(),
    createdAt: timestamptz("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("session_events_revision_unique").on(
      table.sessionId,
      table.revision,
    ),
  ],
);

export const contributions = pgTable(
  "contributions",
  {
    sessionId: uuid("session_id")
      .notNull()
      .references(() => gameSessions.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => sessionEvents.eventId, { onDelete: "cascade" }),
    actorTwitchId: text("actor_twitch_id").notNull(),
    kind: text("kind").notNull(),
    originBroadcasterId: text("origin_broadcaster_id").notNull(),
    evidenceId: text("evidence_id"),
    sourceMessageId: text("source_message_id").notNull(),
    createdAt: timestamptz("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("contributions_source_unique").on(
      table.sessionId,
      table.sourceMessageId,
      table.actorTwitchId,
      table.kind,
    ),
  ],
);

export const outbox = pgTable(
  "outbox",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => sessionEvents.eventId, { onDelete: "cascade" })
      .unique(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => gameSessions.id, { onDelete: "cascade" }),
    revision: bigint("revision", { mode: "number" }).notNull(),
    payload: jsonb("payload").$type<RoundSnapshot>().notNull(),
    attempts: integer("attempts").notNull(),
    nextAttemptAt: timestamptz("next_attempt_at").notNull(),
    publishedAt: timestamptz("published_at"),
    createdAt: timestamptz("created_at").notNull(),
  },
  (table) => [
    index("outbox_pending_idx").on(
      table.publishedAt,
      table.nextAttemptAt,
      table.id,
    ),
  ],
);

export const overlayCredentials = pgTable(
  "overlay_credentials",
  {
    tokenHash: text("token_hash").primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => gameSessions.id, { onDelete: "cascade" }),
    idempotencyKey: text("idempotency_key").notNull(),
    view: text("view").notNull(),
    expiresAt: timestamptz("expires_at").notNull(),
    revokedAt: timestamptz("revoked_at"),
    createdAt: timestamptz("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("overlay_credentials_session_idempotency_idx").on(
      table.sessionId,
      table.idempotencyKey,
    ),
  ],
);
