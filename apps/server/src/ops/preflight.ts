import { parseServerConfig } from "../config.js";

const required = [
  "PUBLIC_ORIGIN",
  "DATABASE_URL",
  "TWITCH_CLIENT_ID",
  "TWITCH_CLIENT_SECRET",
  "TWITCH_REDIRECT_URI",
  "SESSION_SIGNING_SECRET",
  "DATA_ENCRYPTION_KEY",
  "OVERLAY_TOKEN_SIGNING_KEY",
] as const;

/** Pure configuration validation: no provider calls, database connections, or migrations. */
export function productionPreflight(env: Record<string, string | undefined>) {
  const missing = required.filter((name) => !env[name]?.trim());
  const errors: string[] = [];
  if (missing.length === 0) {
    try {
      parseServerConfig({ ...env, NODE_ENV: "production" });
    } catch (error) {
      errors.push(
        error instanceof Error
          ? error.message
          : "Production configuration is invalid.",
      );
    }
  }
  return {
    check: "production-configuration",
    valid: missing.length === 0 && errors.length === 0,
    missing,
    errors,
  };
}
