type NodeEnvironment = "development" | "test" | "production";

export interface TwitchOAuthConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUri: URL;
}

export interface ServerConfig {
  readonly nodeEnv: NodeEnvironment;
  readonly port: number;
  readonly publicOrigin: URL;
  readonly databaseUrl: string;
  readonly twitch: TwitchOAuthConfig | null;
  readonly sessionHashKey: Buffer | null;
  readonly dataEncryptionKey: Buffer | null;
  readonly overlayHashKey: Buffer | null;
  readonly devControls: boolean;
  readonly twitchAdapter: "twitch" | "simulation";
}

function parseOrigin(value: string | undefined): URL {
  const raw = value ?? "http://localhost:5173";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("PUBLIC_ORIGIN must be an absolute HTTP(S) origin.");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username !== "" ||
    url.password !== "" ||
    url.pathname !== "/" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new Error("PUBLIC_ORIGIN must contain only an HTTP(S) origin.");
  }
  return url;
}

function parseDatabaseUrl(value: string | undefined): string {
  if (!value) throw new Error("DATABASE_URL is required.");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("DATABASE_URL must be a PostgreSQL connection URL.");
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must use postgres:// or postgresql://.");
  }
  return value;
}

function parseSecret(value: string | undefined, name: string): Buffer | null {
  if (value === undefined || value === "") return null;
  const secret = Buffer.from(value, "utf8");
  if (secret.byteLength < 32)
    throw new Error(`${name} must contain at least 32 bytes.`);
  return secret;
}

function parseEncryptionKey(value: string | undefined): Buffer | null {
  if (value === undefined || value === "") return null;
  const key = Buffer.from(value, "base64");
  if (key.byteLength !== 32 || key.toString("base64") !== value) {
    throw new Error(
      "DATA_ENCRYPTION_KEY must be canonical base64 for exactly 32 bytes.",
    );
  }
  return key;
}

function parseRedirectUri(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("TWITCH_REDIRECT_URI must be an absolute HTTP(S) URL.");
  }
  const localHttp =
    url.protocol === "http:" &&
    ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (url.protocol !== "https:" && !localHttp) {
    throw new Error(
      "TWITCH_REDIRECT_URI must use HTTPS outside localhost development.",
    );
  }
  if (
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new Error(
      "TWITCH_REDIRECT_URI cannot contain credentials, query, or fragment values.",
    );
  }
  return url;
}

export function parseServerConfig(
  env: Record<string, string | undefined>,
): ServerConfig {
  const rawEnvironment = env.NODE_ENV ?? "development";
  if (!["development", "test", "production"].includes(rawEnvironment)) {
    throw new Error("NODE_ENV must be development, test, or production.");
  }
  const nodeEnv = rawEnvironment as NodeEnvironment;
  if (nodeEnv === "production" && !env.PUBLIC_ORIGIN) {
    throw new Error("PUBLIC_ORIGIN is required in production.");
  }
  if (nodeEnv === "production" && env.CLUENITE_DEV_CONTROLS === "1") {
    throw new Error("CLUENITE_DEV_CONTROLS cannot be enabled in production.");
  }
  const port = Number(env.PORT ?? "10000");
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  const publicOrigin = parseOrigin(env.PUBLIC_ORIGIN);
  if (nodeEnv === "production" && publicOrigin.protocol !== "https:") {
    throw new Error("PUBLIC_ORIGIN must use HTTPS in production.");
  }
  const databaseUrl = parseDatabaseUrl(env.DATABASE_URL);
  const sessionHashKey = parseSecret(
    env.SESSION_SIGNING_SECRET,
    "SESSION_SIGNING_SECRET",
  );
  const dataEncryptionKey = parseEncryptionKey(env.DATA_ENCRYPTION_KEY);
  const overlayHashKey = parseSecret(
    env.OVERLAY_TOKEN_SIGNING_KEY,
    "OVERLAY_TOKEN_SIGNING_KEY",
  );
  if (
    nodeEnv === "production" &&
    (!sessionHashKey || !dataEncryptionKey || !overlayHashKey)
  ) {
    throw new Error(
      "Production requires session, encryption, and overlay signing keys.",
    );
  }

  const twitchValues = [
    env.TWITCH_CLIENT_ID,
    env.TWITCH_CLIENT_SECRET,
    env.TWITCH_REDIRECT_URI,
  ];
  const configuredTwitchValues = twitchValues.filter(
    (value) => value !== undefined && value.trim() !== "",
  );
  let twitch: TwitchOAuthConfig | null = null;
  if (
    configuredTwitchValues.length > 0 &&
    configuredTwitchValues.length !== twitchValues.length
  ) {
    throw new Error(
      "TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET, and TWITCH_REDIRECT_URI must be configured together.",
    );
  }
  if (configuredTwitchValues.length === twitchValues.length) {
    if (!sessionHashKey || !dataEncryptionKey || !overlayHashKey) {
      throw new Error(
        "Twitch OAuth also requires SESSION_SIGNING_SECRET, DATA_ENCRYPTION_KEY, and OVERLAY_TOKEN_SIGNING_KEY.",
      );
    }
    const [clientId, clientSecret, redirectUri] = twitchValues;
    if (!clientId || !clientSecret || !redirectUri)
      throw new Error("Twitch OAuth configuration is incomplete.");
    twitch = {
      clientId,
      clientSecret,
      redirectUri: parseRedirectUri(redirectUri),
    };
  }
  if (nodeEnv === "production" && !twitch) {
    throw new Error(
      "Production requires a complete Twitch OAuth application configuration.",
    );
  }
  if (
    nodeEnv === "production" &&
    twitch &&
    (twitch.redirectUri.origin !== publicOrigin.origin ||
      twitch.redirectUri.pathname !== "/api/auth/twitch/callback")
  ) {
    throw new Error(
      "TWITCH_REDIRECT_URI must match PUBLIC_ORIGIN at /api/auth/twitch/callback in production.",
    );
  }

  const adapter = env.TWITCH_ADAPTER ?? "twitch";
  if (adapter !== "twitch" && adapter !== "simulation") {
    throw new Error("TWITCH_ADAPTER must be twitch or simulation.");
  }
  if (nodeEnv === "production" && adapter !== "twitch") {
    throw new Error("TWITCH_ADAPTER must be twitch in production.");
  }

  return {
    nodeEnv,
    port,
    publicOrigin,
    databaseUrl,
    twitch,
    sessionHashKey,
    dataEncryptionKey,
    overlayHashKey,
    devControls: env.CLUENITE_DEV_CONTROLS === "1",
    twitchAdapter: adapter,
  };
}
