import { describe, expect, it } from "vitest";
import { parseServerConfig } from "../../apps/server/src/config.js";

const base = {
  NODE_ENV: "test",
  PORT: "10000",
  PUBLIC_ORIGIN: "http://localhost:5173",
  DATABASE_URL: "postgresql://localhost/cluenite_test",
};

const production = {
  ...base,
  NODE_ENV: "production",
  PUBLIC_ORIGIN: "https://cluenite.example",
  TWITCH_CLIENT_ID: "test-client-id",
  TWITCH_CLIENT_SECRET: "test-client-secret",
  TWITCH_REDIRECT_URI: "https://cluenite.example/api/auth/twitch/callback",
  SESSION_SIGNING_SECRET: "s".repeat(40),
  DATA_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64"),
  OVERLAY_TOKEN_SIGNING_KEY: "o".repeat(40),
};

describe("server configuration", () => {
  it("accepts the deployed HTTPS origin and its registered OAuth callback", () => {
    const config = parseServerConfig(production);
    expect(config.publicOrigin.origin).toBe("https://cluenite.example");
    expect(config.twitch?.redirectUri.href).toBe(
      "https://cluenite.example/api/auth/twitch/callback",
    );
  });

  it("rejects a production public origin that cannot use secure host cookies", () => {
    expect(() =>
      parseServerConfig({
        ...production,
        PUBLIC_ORIGIN: "http://cluenite.example",
      }),
    ).toThrow(/PUBLIC_ORIGIN.*HTTPS/i);
  });

  it.each([
    "https://another-app.example/api/auth/twitch/callback",
    "https://cluenite.example/wrong-callback",
    "http://localhost:10000/api/auth/twitch/callback",
  ])(
    "rejects a production callback outside the deployed auth route: %s",
    (uri) => {
      expect(() =>
        parseServerConfig({ ...production, TWITCH_REDIRECT_URI: uri }),
      ).toThrow(/TWITCH_REDIRECT_URI.*PUBLIC_ORIGIN.*callback/i);
    },
  );

  it("preserves separate frontend and API origins for local OAuth development", () => {
    const config = parseServerConfig({
      ...production,
      NODE_ENV: "development",
      PUBLIC_ORIGIN: "http://localhost:5173",
      TWITCH_REDIRECT_URI: "http://localhost:10000/api/auth/twitch/callback",
    });
    expect(config.twitch?.redirectUri.origin).toBe("http://localhost:10000");
  });

  it("allows a local backend with Twitch OAuth explicitly unavailable", () => {
    const config = parseServerConfig(base);

    expect(config.port).toBe(10000);
    expect(config.publicOrigin.origin).toBe("http://localhost:5173");
    expect(config.twitch).toBeNull();
    expect(config.devControls).toBe(false);
  });

  it("rejects a partially configured Twitch OAuth client", () => {
    expect(() =>
      parseServerConfig({
        ...base,
        TWITCH_CLIENT_ID: "client-id",
      }),
    ).toThrow(/TWITCH_CLIENT_ID.*TWITCH_CLIENT_SECRET.*TWITCH_REDIRECT_URI/i);
  });

  it("requires a 256-bit encryption key before enabling Twitch credentials", () => {
    const shortKey = Buffer.from("not-32-bytes").toString("base64");
    expect(() =>
      parseServerConfig({
        ...base,
        TWITCH_CLIENT_ID: "client-id",
        TWITCH_CLIENT_SECRET: "client-secret",
        TWITCH_REDIRECT_URI: "http://localhost:10000/api/auth/twitch/callback",
        SESSION_SIGNING_SECRET: "s".repeat(32),
        DATA_ENCRYPTION_KEY: shortKey,
        OVERLAY_TOKEN_SIGNING_KEY: "o".repeat(32),
      }),
    ).toThrow(/DATA_ENCRYPTION_KEY/i);
  });

  it("requires a public origin, Twitch app, and signing keys in production", () => {
    expect(() =>
      parseServerConfig({
        NODE_ENV: "production",
        DATABASE_URL: base.DATABASE_URL,
      }),
    ).toThrow(/PUBLIC_ORIGIN/i);
    expect(() =>
      parseServerConfig({
        ...base,
        NODE_ENV: "production",
        PUBLIC_ORIGIN: "https://cluenite.example",
      }),
    ).toThrow(/session, encryption, and overlay signing keys/i);
    expect(() =>
      parseServerConfig({
        ...base,
        NODE_ENV: "production",
        PUBLIC_ORIGIN: "https://cluenite.example",
        ...{
          SESSION_SIGNING_SECRET: "s".repeat(40),
          DATA_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64"),
          OVERLAY_TOKEN_SIGNING_KEY: "o".repeat(40),
        },
      }),
    ).toThrow(/Twitch OAuth application/i);
  });
});
