export const migration0002BackendCompletion = {
  name: "0002_backend_completion",
  sql: `
    ALTER TABLE game_sessions DROP CONSTRAINT IF EXISTS game_sessions_phase_check;
    ALTER TABLE game_sessions ADD CONSTRAINT game_sessions_phase_check
      CHECK (phase IN ('COOP_WAITING', 'READY', 'ACTIVE', 'PAUSED', 'RESOLVED', 'CANCELLED'));
    DROP INDEX IF EXISTS game_sessions_one_open_per_host_idx;
    CREATE UNIQUE INDEX game_sessions_one_open_per_host_idx
      ON game_sessions(host_twitch_id)
      WHERE phase IN ('COOP_WAITING', 'READY', 'ACTIVE', 'PAUSED');

    CREATE TABLE session_channels (
      session_id uuid NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
      broadcaster_id text NOT NULL REFERENCES twitch_accounts(twitch_user_id),
      team_role text NOT NULL CHECK (team_role IN ('A', 'B')),
      consented_at timestamptz NOT NULL DEFAULT now(),
      revoked_at timestamptz,
      PRIMARY KEY (session_id, team_role),
      UNIQUE (session_id, broadcaster_id)
    );
    CREATE INDEX session_channels_broadcaster_idx
      ON session_channels(broadcaster_id, session_id) WHERE revoked_at IS NULL;
    INSERT INTO session_channels (session_id, broadcaster_id, team_role, consented_at)
      SELECT id, host_twitch_id, 'A', created_at FROM game_sessions
      ON CONFLICT DO NOTHING;

    CREATE TABLE coop_invites (
      id uuid PRIMARY KEY,
      session_id uuid NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
      inviter_twitch_id text NOT NULL REFERENCES twitch_accounts(twitch_user_id),
      invitee_twitch_id text NOT NULL,
      token_hash text NOT NULL UNIQUE,
      idempotency_key text NOT NULL,
      status text NOT NULL CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED', 'EXPIRED')),
      expires_at timestamptz NOT NULL,
      accepted_at timestamptz,
      accept_idempotency_key text,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (session_id, inviter_twitch_id, idempotency_key)
    );
    CREATE INDEX coop_invites_session_status_idx ON coop_invites(session_id, status, expires_at);

    ALTER TABLE overlay_credentials DROP CONSTRAINT IF EXISTS overlay_credentials_view_check;
    ALTER TABLE overlay_credentials ADD CONSTRAINT overlay_credentials_view_check
      CHECK (view IN ('overlay', 'team_a', 'team_b'));

    CREATE TABLE eventsub_leader_state (
      name text PRIMARY KEY,
      epoch bigint NOT NULL DEFAULT 0 CHECK (epoch >= 0),
      owner_id text,
      acquired_at timestamptz,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    INSERT INTO eventsub_leader_state (name) VALUES ('eventsub-ingest')
      ON CONFLICT (name) DO NOTHING;
  `,
} as const;
