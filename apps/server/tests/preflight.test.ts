import { describe, expect, it } from "vitest";
import { productionPreflight } from "../src/ops/preflight.js";
import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

const env = {
  PUBLIC_ORIGIN: "https://cluenite.example",
  DATABASE_URL:
    "postgresql://synthetic-user:synthetic-database-secret@unreachable.invalid/cluenite",
  TWITCH_CLIENT_ID: "synthetic-client-id",
  TWITCH_CLIENT_SECRET: "synthetic-client-secret",
  TWITCH_REDIRECT_URI: "https://cluenite.example/api/auth/twitch/callback",
  SESSION_SIGNING_SECRET: "s".repeat(40),
  DATA_ENCRYPTION_KEY: Buffer.alloc(32, 8).toString("base64"),
  OVERLAY_TOKEN_SIGNING_KEY: "o".repeat(40),
};
describe("non-mutating production preflight", () => {
  it("runs the actual CLI successfully against unreachable synthetic provider/database targets", async () => {
    const require = createRequire(import.meta.url);
    const { stdout, stderr } = await promisify(execFile)(
      process.execPath,
      [
        "--import",
        pathToFileURL(require.resolve("tsx")).href,
        fileURLToPath(new URL("../src/ops/preflightCli.ts", import.meta.url)),
      ],
      {
        env: {
          ...process.env,
          ...env,
          NODE_ENV: "production",
          CLUENITE_DEV_CONTROLS: "0",
          TWITCH_ADAPTER: "twitch",
        },
        timeout: 5000,
      },
    );
    expect(JSON.parse(stdout).valid).toBe(true);
    expect(stderr).toBe("");
    expect(stdout).not.toContain("synthetic-database-secret");
    expect(stdout).not.toContain(env.TWITCH_CLIENT_SECRET);
  });
  it("validates production configuration without accessing the specified network targets", () => {
    expect(productionPreflight(env)).toEqual({
      check: "production-configuration",
      valid: true,
      missing: [],
      errors: [],
    });
  });
  it("lists all missing variables without exposing configured values", () => {
    const report = productionPreflight({
      TWITCH_CLIENT_SECRET: env.TWITCH_CLIENT_SECRET,
    });
    expect(report.valid).toBe(false);
    expect(report.missing).toEqual([
      "PUBLIC_ORIGIN",
      "DATABASE_URL",
      "TWITCH_CLIENT_ID",
      "TWITCH_REDIRECT_URI",
      "SESSION_SIGNING_SECRET",
      "DATA_ENCRYPTION_KEY",
      "OVERLAY_TOKEN_SIGNING_KEY",
    ]);
    expect(JSON.stringify(report)).not.toContain(env.TWITCH_CLIENT_SECRET);
  });
  it.each([
    { PUBLIC_ORIGIN: "http://cluenite.example" },
    {
      TWITCH_REDIRECT_URI:
        "https://other.example/api/auth/twitch/callback?secret=synthetic-secret",
    },
    { DATA_ENCRYPTION_KEY: "synthetic-invalid-key" },
    { CLUENITE_DEV_CONTROLS: "1" },
    { TWITCH_ADAPTER: "simulation" },
  ])(
    "rejects invalid production configuration without reflecting values: %j",
    (invalid) => {
      const report = productionPreflight({ ...env, ...invalid });
      expect(report.valid).toBe(false);
      expect(report.errors).toHaveLength(1);
      expect(JSON.stringify(report)).not.toContain("synthetic-secret");
      expect(JSON.stringify(report)).not.toContain(env.TWITCH_CLIENT_SECRET);
    },
  );
});
