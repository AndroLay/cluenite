export const migration0001Backend = {
  name: "0001_backend",
  sql: `
    CREATE TABLE twitch_accounts (
      twitch_user_id text PRIMARY KEY,
      login text NOT NULL,
      display_name text NOT NULL,
      access_token_ciphertext text NOT NULL,
      access_token_iv text NOT NULL,
      access_token_tag text NOT NULL,
      refresh_token_ciphertext text NOT NULL,
      refresh_token_iv text NOT NULL,
      refresh_token_tag text NOT NULL,
      scopes text[] NOT NULL DEFAULT ARRAY[]::text[],
      token_expires_at timestamptz NOT NULL,
      revoked_at timestamptz,
      last_validated_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE user_sessions (
      token_hash text PRIMARY KEY,
      csrf_hash text NOT NULL,
      twitch_user_id text NOT NULL REFERENCES twitch_accounts(twitch_user_id) ON DELETE CASCADE,
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      last_seen_at timestamptz NOT NULL DEFAULT now(),
      revoked_at timestamptz
    );
    CREATE INDEX user_sessions_twitch_user_idx ON user_sessions(twitch_user_id, expires_at);

    CREATE TABLE cases (
      case_id text NOT NULL,
      version integer NOT NULL CHECK (version > 0),
      content_hash text NOT NULL,
      public_metadata jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (case_id, version)
    );

    CREATE TABLE game_sessions (
      id uuid PRIMARY KEY,
      host_twitch_id text NOT NULL REFERENCES twitch_accounts(twitch_user_id),
      case_id text NOT NULL,
      case_version integer NOT NULL,
      case_content_hash text NOT NULL,
      phase text NOT NULL CHECK (phase IN ('READY', 'ACTIVE', 'PAUSED', 'RESOLVED', 'CANCELLED')),
      source text NOT NULL CHECK (source IN ('simulation', 'live')),
      revision bigint NOT NULL CHECK (revision >= 0),
      state jsonb NOT NULL,
      create_idempotency_key text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      FOREIGN KEY (case_id, case_version) REFERENCES cases(case_id, version),
      UNIQUE (host_twitch_id, create_idempotency_key)
    );
    CREATE INDEX game_sessions_host_updated_idx ON game_sessions(host_twitch_id, updated_at DESC);
    CREATE UNIQUE INDEX game_sessions_one_open_per_host_idx
      ON game_sessions(host_twitch_id)
      WHERE phase IN ('READY', 'ACTIVE', 'PAUSED');

    CREATE TABLE processed_inputs (
      input_id text PRIMARY KEY,
      eventsub_message_id text UNIQUE,
      session_id uuid NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
      actor_twitch_id text,
      action_summary text NOT NULL,
      result jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX processed_inputs_session_created_idx ON processed_inputs(session_id, created_at DESC);

    CREATE TABLE session_events (
      event_id uuid PRIMARY KEY,
      session_id uuid NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
      revision bigint NOT NULL,
      event_type text NOT NULL,
      actor_twitch_id text,
      payload jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (session_id, revision)
    );

    CREATE TABLE contributions (
      session_id uuid NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
      event_id uuid NOT NULL REFERENCES session_events(event_id) ON DELETE CASCADE,
      actor_twitch_id text NOT NULL,
      kind text NOT NULL,
      origin_broadcaster_id text NOT NULL,
      evidence_id text,
      source_message_id text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (session_id, source_message_id, actor_twitch_id, kind)
    );

    CREATE TABLE outbox (
      id bigserial PRIMARY KEY,
      event_id uuid NOT NULL UNIQUE REFERENCES session_events(event_id) ON DELETE CASCADE,
      session_id uuid NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
      revision bigint NOT NULL,
      payload jsonb NOT NULL,
      attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
      next_attempt_at timestamptz NOT NULL DEFAULT now(),
      published_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (session_id, revision)
    );
    CREATE INDEX outbox_pending_idx ON outbox(published_at, next_attempt_at, id);

    CREATE TABLE overlay_credentials (
      token_hash text PRIMARY KEY,
      session_id uuid NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
      idempotency_key text NOT NULL,
      view text NOT NULL CHECK (view = 'overlay'),
      expires_at timestamptz NOT NULL,
      revoked_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX overlay_credentials_session_idempotency_idx
      ON overlay_credentials(session_id, idempotency_key);
    CREATE INDEX overlay_credentials_session_idx ON overlay_credentials(session_id, expires_at);
  `,
} as const;
