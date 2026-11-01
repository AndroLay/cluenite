import type { Pool } from "pg";
import { timingSafeEqual } from "node:crypto";
import {
  createOpaqueToken,
  decryptSecret,
  deriveCsrfToken,
  encryptSecret,
  hashOpaqueToken,
  type EncryptedSecret,
} from "./crypto.js";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const OVERLAY_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface TwitchIdentity {
  readonly id: string;
  readonly login: string;
  readonly displayName: string;
}

export interface TwitchTokenSet {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresIn: number;
  readonly scopes: readonly string[];
}

export interface HostSession {
  readonly twitchUserId: string;
  readonly sessionTokenHash: string;
  readonly login: string;
  readonly displayName: string;
  readonly csrfToken: string;
  readonly expiresAt: Date;
}

export interface OverlayPrincipal {
  readonly sessionId: string;
  readonly tokenHash: string;
}

export class OverlayCredentialReplayError extends Error {
  constructor() {
    super("An overlay credential was already issued for this idempotency key.");
    this.name = "OverlayCredentialReplayError";
  }
}

export interface DecryptedTwitchAccount {
  readonly identity: TwitchIdentity;
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly scopes: readonly string[];
  readonly tokenExpiresAt: Date;
}

function asEncrypted(
  prefix: "access" | "refresh",
  row: Record<string, unknown>,
): EncryptedSecret {
  const ciphertext = row[`${prefix}_token_ciphertext`];
  const iv = row[`${prefix}_token_iv`];
  const tag = row[`${prefix}_token_tag`];
  if (
    typeof ciphertext !== "string" ||
    typeof iv !== "string" ||
    typeof tag !== "string"
  ) {
    throw new Error("Stored Twitch credential is malformed.");
  }
  return { ciphertext, iv, tag };
}

export class SessionStore {
  constructor(
    private readonly pool: Pool,
    private readonly sessionHashKey: Buffer,
    private readonly dataEncryptionKey: Buffer,
    private readonly overlayHashKey: Buffer,
    private readonly now: () => number = Date.now,
  ) {
    if (
      sessionHashKey.byteLength < 32 ||
      overlayHashKey.byteLength < 32 ||
      dataEncryptionKey.byteLength !== 32
    ) {
      throw new Error("Session security keys are invalid.");
    }
  }

  async saveTwitchAccount(
    identity: TwitchIdentity,
    tokenSet: TwitchTokenSet,
  ): Promise<void> {
    const access = encryptSecret(
      tokenSet.accessToken,
      this.dataEncryptionKey,
      `twitch-access:${identity.id}`,
    );
    const refresh = encryptSecret(
      tokenSet.refreshToken,
      this.dataEncryptionKey,
      `twitch-refresh:${identity.id}`,
    );
    await this.pool.query(
      `INSERT INTO twitch_accounts (
         twitch_user_id, login, display_name,
         access_token_ciphertext, access_token_iv, access_token_tag,
         refresh_token_ciphertext, refresh_token_iv, refresh_token_tag,
         scopes, token_expires_at, revoked_at, last_validated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now() + ($11 * interval '1 second'), NULL, now())
       ON CONFLICT (twitch_user_id) DO UPDATE SET
         login = EXCLUDED.login,
         display_name = EXCLUDED.display_name,
         access_token_ciphertext = EXCLUDED.access_token_ciphertext,
         access_token_iv = EXCLUDED.access_token_iv,
         access_token_tag = EXCLUDED.access_token_tag,
         refresh_token_ciphertext = EXCLUDED.refresh_token_ciphertext,
         refresh_token_iv = EXCLUDED.refresh_token_iv,
         refresh_token_tag = EXCLUDED.refresh_token_tag,
         scopes = EXCLUDED.scopes,
         token_expires_at = EXCLUDED.token_expires_at,
         revoked_at = NULL,
         last_validated_at = now(),
         updated_at = now()`,
      [
        identity.id,
        identity.login,
        identity.displayName,
        access.ciphertext,
        access.iv,
        access.tag,
        refresh.ciphertext,
        refresh.iv,
        refresh.tag,
        [...new Set(tokenSet.scopes)],
        Math.max(1, Math.trunc(tokenSet.expiresIn)),
      ],
    );
    await this.pool.query(
      `UPDATE session_channels sc SET revoked_at = NULL
       FROM game_sessions s
       WHERE sc.session_id = s.id AND sc.broadcaster_id = $1
         AND sc.team_role = 'A' AND s.host_twitch_id = $1`,
      [identity.id],
    );
  }

  async createHostSession(
    twitchUserId: string,
  ): Promise<{ token: string; csrfToken: string; expiresAt: Date }> {
    const token = createOpaqueToken();
    const csrfToken = deriveCsrfToken(token, this.sessionHashKey);
    const expiresAt = new Date(this.now() + SESSION_TTL_MS);
    await this.pool.query(
      `INSERT INTO user_sessions (token_hash, csrf_hash, twitch_user_id, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [
        hashOpaqueToken(token, this.sessionHashKey, "host-session"),
        hashOpaqueToken(csrfToken, this.sessionHashKey, "csrf"),
        twitchUserId,
        expiresAt,
      ],
    );
    return { token, csrfToken, expiresAt };
  }

  async resolveHostSession(
    token: string | undefined,
  ): Promise<HostSession | null> {
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    const tokenHash = hashOpaqueToken(
      token,
      this.sessionHashKey,
      "host-session",
    );
    const result = await this.pool.query<{
      twitch_user_id: string;
      login: string;
      display_name: string;
      csrf_hash: string;
      expires_at: Date;
    }>(
      `SELECT s.twitch_user_id, s.csrf_hash, s.expires_at, a.login, a.display_name
       FROM user_sessions s
       JOIN twitch_accounts a ON a.twitch_user_id = s.twitch_user_id
       WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now()
         AND a.revoked_at IS NULL`,
      [tokenHash],
    );
    const row = result.rows[0];
    if (!row) return null;
    await this.pool.query(
      "UPDATE user_sessions SET last_seen_at = now() WHERE token_hash = $1",
      [tokenHash],
    );
    return {
      twitchUserId: row.twitch_user_id,
      sessionTokenHash: tokenHash,
      login: row.login,
      displayName: row.display_name,
      csrfToken: deriveCsrfToken(token, this.sessionHashKey),
      expiresAt: row.expires_at,
    };
  }

  async csrfMatches(
    token: string | undefined,
    csrfToken: string | undefined,
  ): Promise<boolean> {
    if (
      !token ||
      !csrfToken ||
      !/^[A-Za-z0-9_-]{43}$/.test(token) ||
      !/^[A-Za-z0-9_-]{43}$/.test(csrfToken)
    ) {
      return false;
    }
    const expected = hashOpaqueToken(csrfToken, this.sessionHashKey, "csrf");
    const result = await this.pool.query<{ csrf_hash: string }>(
      `SELECT csrf_hash FROM user_sessions
       WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()`,
      [hashOpaqueToken(token, this.sessionHashKey, "host-session")],
    );
    const stored = result.rows[0]?.csrf_hash;
    if (!stored || stored.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(stored), Buffer.from(expected));
  }

  async revokeHostSession(token: string | undefined): Promise<string | null> {
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    const result = await this.pool.query<{ twitch_user_id: string }>(
      `UPDATE user_sessions SET revoked_at = now()
       WHERE token_hash = $1 AND revoked_at IS NULL
       RETURNING twitch_user_id`,
      [hashOpaqueToken(token, this.sessionHashKey, "host-session")],
    );
    return result.rows[0]?.twitch_user_id ?? null;
  }

  async hasActiveHostSession(twitchUserId: string): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT 1 FROM user_sessions
       WHERE twitch_user_id = $1 AND revoked_at IS NULL AND expires_at > now()
       LIMIT 1`,
      [twitchUserId],
    );
    return result.rowCount === 1;
  }

  async isHostSessionActive(
    sessionTokenHash: string,
    twitchUserId: string,
  ): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT 1 FROM user_sessions s
       JOIN twitch_accounts a ON a.twitch_user_id = s.twitch_user_id
       WHERE s.token_hash = $1 AND s.twitch_user_id = $2
         AND s.revoked_at IS NULL AND s.expires_at > now() AND a.revoked_at IS NULL
       LIMIT 1`,
      [sessionTokenHash, twitchUserId],
    );
    return result.rowCount === 1;
  }

  async createOverlayCredential(
    sessionId: string,
    participantTwitchId: string,
    idempotencyKey: string,
  ): Promise<{ token: string; expiresAt: Date } | null> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const owned = await client.query<{ team_role: "A" | "B" }>(
        `SELECT sc.team_role FROM session_channels sc
         JOIN game_sessions s ON s.id = sc.session_id
         WHERE sc.session_id = $1 AND sc.broadcaster_id = $2 AND sc.revoked_at IS NULL
           AND s.phase IN ('COOP_WAITING', 'READY', 'ACTIVE', 'PAUSED')
         FOR UPDATE OF s`,
        [sessionId, participantTwitchId],
      );
      const teamRole = owned.rows[0]?.team_role;
      if (teamRole !== "A" && teamRole !== "B") {
        await client.query("COMMIT");
        return null;
      }
      const prior = await client.query(
        "SELECT 1 FROM overlay_credentials WHERE session_id = $1 AND idempotency_key = $2 LIMIT 1",
        [sessionId, idempotencyKey],
      );
      if (prior.rowCount === 1) throw new OverlayCredentialReplayError();
      const token = createOpaqueToken();
      const expiresAt = new Date(this.now() + OVERLAY_TTL_MS);
      await client.query(
        `UPDATE overlay_credentials SET revoked_at = now()
         WHERE session_id = $1 AND view = $2 AND revoked_at IS NULL`,
        [sessionId, teamRole === "A" ? "team_a" : "team_b"],
      );
      await client.query(
        `INSERT INTO overlay_credentials (token_hash, session_id, idempotency_key, view, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          hashOpaqueToken(token, this.overlayHashKey, "overlay"),
          sessionId,
          idempotencyKey,
          teamRole === "A" ? "team_a" : "team_b",
          expiresAt,
        ],
      );
      await client.query("COMMIT");
      return { token, expiresAt };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async resolveOverlay(
    token: string | undefined,
  ): Promise<OverlayPrincipal | null> {
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    const result = await this.pool.query<{ session_id: string }>(
      `SELECT session_id FROM overlay_credentials
       WHERE token_hash = $1 AND view IN ('overlay', 'team_a', 'team_b')
         AND revoked_at IS NULL AND expires_at > now()`,
      [hashOpaqueToken(token, this.overlayHashKey, "overlay")],
    );
    return result.rows[0]
      ? {
          sessionId: result.rows[0].session_id,
          tokenHash: hashOpaqueToken(token, this.overlayHashKey, "overlay"),
        }
      : null;
  }

  async isOverlayCredentialActive(
    tokenHash: string,
    sessionId: string,
  ): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT 1 FROM overlay_credentials
       WHERE token_hash = $1 AND session_id = $2 AND view IN ('overlay', 'team_a', 'team_b')
         AND revoked_at IS NULL AND expires_at > now()
       LIMIT 1`,
      [tokenHash, sessionId],
    );
    return result.rowCount === 1;
  }

  async revokeOverlayCredential(
    sessionId: string,
    participantTwitchId: string,
  ): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE overlay_credentials o SET revoked_at = now()
       FROM session_channels sc
       WHERE o.session_id = sc.session_id AND o.session_id = $1
         AND sc.broadcaster_id = $2 AND sc.revoked_at IS NULL
         AND o.view = CASE sc.team_role WHEN 'A' THEN 'team_a' ELSE 'team_b' END
         AND o.revoked_at IS NULL`,
      [sessionId, participantTwitchId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async loadTwitchAccount(
    twitchUserId: string,
  ): Promise<DecryptedTwitchAccount | null> {
    const result = await this.pool.query<Record<string, unknown>>(
      `SELECT twitch_user_id, login, display_name, access_token_ciphertext, access_token_iv, access_token_tag,
              refresh_token_ciphertext, refresh_token_iv, refresh_token_tag, scopes, token_expires_at
       FROM twitch_accounts WHERE twitch_user_id = $1 AND revoked_at IS NULL`,
      [twitchUserId],
    );
    const row = result.rows[0];
    if (!row) return null;
    const scopes = row.scopes;
    if (
      !Array.isArray(scopes) ||
      !scopes.every((scope) => typeof scope === "string")
    ) {
      throw new Error("Stored Twitch scopes are malformed.");
    }
    return {
      identity: {
        id: String(row.twitch_user_id),
        login: String(row.login),
        displayName: String(row.display_name),
      },
      accessToken: decryptSecret(
        asEncrypted("access", row),
        this.dataEncryptionKey,
        `twitch-access:${row.twitch_user_id}`,
      ),
      refreshToken: decryptSecret(
        asEncrypted("refresh", row),
        this.dataEncryptionKey,
        `twitch-refresh:${row.twitch_user_id}`,
      ),
      scopes,
      tokenExpiresAt: row.token_expires_at as Date,
    };
  }

  async listActiveTwitchUserIds(): Promise<string[]> {
    const result = await this.pool.query<{ twitch_user_id: string }>(
      `SELECT DISTINCT a.twitch_user_id
       FROM twitch_accounts a
       JOIN user_sessions s ON s.twitch_user_id = a.twitch_user_id
       WHERE a.revoked_at IS NULL AND s.revoked_at IS NULL AND s.expires_at > now()`,
    );
    return result.rows.map((row) => row.twitch_user_id);
  }

  async markTokenValidated(twitchUserId: string): Promise<void> {
    await this.pool.query(
      "UPDATE twitch_accounts SET last_validated_at = now(), updated_at = now() WHERE twitch_user_id = $1 AND revoked_at IS NULL",
      [twitchUserId],
    );
  }

  async markTwitchRevoked(twitchUserId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE overlay_credentials o SET revoked_at = now()
         FROM session_channels sc
         WHERE o.session_id = sc.session_id AND sc.broadcaster_id = $1
           AND o.view = CASE sc.team_role WHEN 'A' THEN 'team_a' ELSE 'team_b' END
           AND o.revoked_at IS NULL`,
        [twitchUserId],
      );
      await client.query(
        "UPDATE session_channels SET revoked_at = now() WHERE broadcaster_id = $1 AND revoked_at IS NULL",
        [twitchUserId],
      );
      await client.query(
        `UPDATE coop_invites SET status = 'REVOKED'
         WHERE status = 'PENDING' AND (inviter_twitch_id = $1 OR invitee_twitch_id = $1)`,
        [twitchUserId],
      );
      await client.query(
        `UPDATE twitch_accounts SET revoked_at = now(), updated_at = now(),
           access_token_ciphertext = '', access_token_iv = '', access_token_tag = '',
           refresh_token_ciphertext = '', refresh_token_iv = '', refresh_token_tag = '',
           scopes = ARRAY[]::text[], token_expires_at = now()
         WHERE twitch_user_id = $1 AND revoked_at IS NULL`,
        [twitchUserId],
      );
      await client.query(
        "UPDATE user_sessions SET revoked_at = now() WHERE twitch_user_id = $1 AND revoked_at IS NULL",
        [twitchUserId],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async listSessionIdsForParticipant(twitchUserId: string): Promise<string[]> {
    const result = await this.pool.query<{ session_id: string }>(
      `SELECT session_id FROM session_channels
       WHERE broadcaster_id = $1`,
      [twitchUserId],
    );
    return result.rows.map((row) => row.session_id);
  }
}
