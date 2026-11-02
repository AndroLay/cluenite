import type { TwitchOAuthConfig } from "../config.js";
import { twitchIdentitySchema, twitchLoginSchema } from "@cluenite/contracts";
import type { TwitchIdentity, TwitchTokenSet } from "../auth/sessionStore.js";

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

interface TwitchTokenResponse {
  readonly access_token: string;
  readonly refresh_token: string;
  readonly expires_in: number;
  readonly scope: readonly string[];
  readonly token_type?: string;
}

export interface TwitchValidation {
  readonly client_id: string;
  readonly user_id: string;
  readonly login: string;
  readonly scopes: readonly string[];
  readonly expires_in: number;
}

export class TwitchAuthorizationExpiredError extends Error {
  constructor() {
    super("Twitch authorization is no longer valid.");
    this.name = "TwitchAuthorizationExpiredError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function tokenResponse(value: unknown): TwitchTokenResponse {
  if (
    !isRecord(value) ||
    typeof value.access_token !== "string" ||
    value.access_token.length < 1 ||
    value.access_token.length > 8192 ||
    typeof value.refresh_token !== "string" ||
    value.refresh_token.length < 1 ||
    value.refresh_token.length > 8192 ||
    typeof value.expires_in !== "number" ||
    !Number.isFinite(value.expires_in) ||
    value.expires_in < 1 ||
    !Array.isArray(value.scope) ||
    !value.scope.every((scope) => typeof scope === "string")
  ) {
    throw new Error("Twitch returned an invalid token response.");
  }
  return value as unknown as TwitchTokenResponse;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("Twitch returned an invalid response.");
  }
}

export class TwitchApi {
  constructor(
    private readonly config: TwitchOAuthConfig,
    private readonly fetcher: FetchLike = fetch,
  ) {}

  authorizationUrl(state: string): URL {
    const url = new URL("https://id.twitch.tv/oauth2/authorize");
    url.search = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri.toString(),
      response_type: "code",
      scope: "user:read:chat",
      state,
      force_verify: "true",
    }).toString();
    return url;
  }

  async exchangeCode(code: string): Promise<TwitchTokenSet> {
    const response = await this.fetcher("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: this.config.redirectUri.toString(),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok)
      throw new Error("Twitch authorization could not be completed.");
    const token = tokenResponse(await readJson(response));
    return {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresIn: token.expires_in,
      scopes: token.scope,
    };
  }

  async validateToken(accessToken: string): Promise<TwitchValidation> {
    const response = await this.fetcher(
      "https://id.twitch.tv/oauth2/validate",
      {
        headers: { authorization: `OAuth ${accessToken}` },
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (response.status === 401 || response.status === 403)
      throw new TwitchAuthorizationExpiredError();
    if (!response.ok)
      throw new Error("Twitch token validation is temporarily unavailable.");
    const value = await readJson(response);
    if (
      !isRecord(value) ||
      typeof value.client_id !== "string" ||
      value.client_id !== this.config.clientId ||
      typeof value.user_id !== "string" ||
      !/^\d{1,32}$/.test(value.user_id) ||
      typeof value.login !== "string" ||
      !Array.isArray(value.scopes) ||
      !value.scopes.every((scope) => typeof scope === "string") ||
      typeof value.expires_in !== "number"
    ) {
      throw new Error(
        "Twitch authorization response did not match this application.",
      );
    }
    return value as unknown as TwitchValidation;
  }

  async getCurrentUser(accessToken: string): Promise<TwitchIdentity> {
    const response = await this.fetcher("https://api.twitch.tv/helix/users", {
      headers: {
        "client-id": this.config.clientId,
        authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error("Twitch profile could not be verified.");
    const value = await readJson(response);
    if (
      !isRecord(value) ||
      !Array.isArray(value.data) ||
      value.data.length !== 1
    ) {
      throw new Error("Twitch profile response was invalid.");
    }
    const profile = value.data[0];
    if (!isRecord(profile)) {
      throw new Error("Twitch profile response was invalid.");
    }
    const identity = twitchIdentitySchema.safeParse({
      id: profile.id,
      login: profile.login,
      displayName: profile.display_name,
    });
    if (!identity.success)
      throw new Error("Twitch profile response was invalid.");
    return identity.data;
  }

  async getUserByLogin(
    accessToken: string,
    login: string,
  ): Promise<TwitchIdentity | null> {
    const normalized = twitchLoginSchema.parse(login);
    const url = new URL("https://api.twitch.tv/helix/users");
    url.searchParams.set("login", normalized);
    const response = await this.fetcher(url, {
      headers: {
        "client-id": this.config.clientId,
        authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 401 || response.status === 403)
      throw new TwitchAuthorizationExpiredError();
    if (!response.ok)
      throw new Error("Twitch user lookup is temporarily unavailable.");
    const value = await readJson(response);
    if (!isRecord(value) || !Array.isArray(value.data) || value.data.length > 1)
      throw new Error("Twitch user lookup returned an invalid response.");
    if (value.data.length === 0) return null;
    const profile = value.data[0];
    if (!isRecord(profile))
      throw new Error("Twitch user lookup returned an invalid profile.");
    const identity = twitchIdentitySchema.safeParse({
      id: profile.id,
      login: profile.login,
      displayName: profile.display_name,
    });
    if (!identity.success || identity.data.login.toLowerCase() !== normalized)
      throw new Error(
        "Twitch user lookup did not match the requested account.",
      );
    return identity.data;
  }

  async refreshToken(refreshToken: string): Promise<TwitchTokenSet> {
    const response = await this.fetcher("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (response.status === 400) throw new TwitchAuthorizationExpiredError();
    if (!response.ok)
      throw new Error(
        "Twitch authorization refresh is temporarily unavailable.",
      );
    const token = tokenResponse(await readJson(response));
    return {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresIn: token.expires_in,
      scopes: token.scope,
    };
  }

  async revokeToken(
    accessToken: string,
  ): Promise<"revoked" | "already_invalid"> {
    const response = await this.fetcher("https://id.twitch.tv/oauth2/revoke", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        token: accessToken,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) return "revoked";
    if (response.status === 400) return "already_invalid";
    throw new Error("Twitch authorization could not be revoked.");
  }

  async subscribeChat(
    accessToken: string,
    broadcasterId: string,
    sessionId: string,
  ): Promise<void> {
    const response = await this.fetcher(
      "https://api.twitch.tv/helix/eventsub/subscriptions",
      {
        method: "POST",
        headers: {
          "client-id": this.config.clientId,
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          type: "channel.chat.message",
          version: "1",
          condition: {
            broadcaster_user_id: broadcasterId,
            user_id: broadcasterId,
          },
          transport: { method: "websocket", session_id: sessionId },
        }),
        signal: AbortSignal.timeout(8_000),
      },
    );
    if (!response.ok)
      throw new Error("Twitch chat subscription could not be created.");
  }
}
