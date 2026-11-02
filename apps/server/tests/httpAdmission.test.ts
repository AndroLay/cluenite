import Fastify from "fastify";
import { Writable } from "node:stream";
import { setTimeout as delay } from "node:timers/promises";
import { describe, expect, it } from "vitest";
import {
  createAdmission,
  HTTP_BODY_LIMIT,
  registerHttpAdmission,
  safeLoggerOptions,
} from "../src/ops/httpPolicy.js";

describe("HTTP admission and safe diagnostics", () => {
  it("bounds readiness database probes independently of ordinary API work", async () => {
    const app = Fastify();
    registerHttpAdmission(app);
    let calls = 0;
    let release!: () => void;
    const held = new Promise<void>((r) => {
      release = r;
    });
    app.get("/health/ready", async () => {
      calls++;
      await held;
      return { status: "ready" };
    });
    app.get("/health/live", () => ({ status: "ok" }));
    const requests = [
      app.inject("/health/ready"),
      app.inject("/health/ready"),
    ].map((x) => x.then((x) => x));
    try {
      while (calls < 2) await delay(1);
      const response = await Promise.race([
        app.inject("/health/ready"),
        delay(100, null),
      ]);
      expect(response?.statusCode).toBe(503);
      expect(calls).toBe(2);
      expect((await app.inject("/health/live")).statusCode).toBe(200);
    } finally {
      release();
      await Promise.all(requests);
      await app.close();
    }
  });
  it("rejects excess concurrent API work before the handler and recovers capacity", async () => {
    const app = Fastify();
    registerHttpAdmission(app, { maxInFlight: 2 });
    let entered = 0;
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    app.get("/api/slow", async () => {
      entered++;
      await held;
      return { ok: true };
    });
    app.get("/health/live", () => ({ ok: true }));
    const requests = [app.inject("/api/slow"), app.inject("/api/slow")].map(
      (x) => x.then((x) => x),
    );
    try {
      while (entered < 2) await delay(1);
      for (let i = 0; i < 2; i++) {
        const rejected = await Promise.race([
          app.inject("/api/slow"),
          delay(100, null),
        ]);
        expect(rejected?.statusCode).toBe(503);
        expect(rejected?.json()).toEqual({ error: "server_busy" });
        expect(rejected?.headers["retry-after"]).toBe("1");
      }
      expect(entered).toBe(2);
      expect((await app.inject("/health/live")).statusCode).toBe(200);
    } finally {
      release();
      await Promise.all(requests);
      await app.close();
    }
  });

  it("releases admitted capacity after body rejection and handler failure", async () => {
    const app = Fastify({ bodyLimit: HTTP_BODY_LIMIT });
    registerHttpAdmission(app, { maxInFlight: 1 });
    let fail = true;
    app.post("/api/work", () => {
      if (fail) {
        fail = false;
        throw new Error("fixture failure");
      }
      return { ok: true };
    });
    try {
      expect(
        (
          await app.inject({
            method: "POST",
            url: "/api/work",
            payload: "x".repeat(HTTP_BODY_LIMIT + 1),
            headers: { "content-type": "application/json" },
          })
        ).statusCode,
      ).toBe(413);
      expect(
        (await app.inject({ method: "POST", url: "/api/work", payload: {} }))
          .statusCode,
      ).toBe(500);
      expect(
        (await app.inject({ method: "POST", url: "/api/work", payload: {} }))
          .statusCode,
      ).toBe(200);
    } finally {
      await app.close();
    }
  });

  it("rejects excess OAuth requests before provider work despite spoofed forwarding headers", async () => {
    let calls = 0;
    let now = 1000;
    const app = Fastify({ trustProxy: false, bodyLimit: HTTP_BODY_LIMIT });
    registerHttpAdmission(app, { now: () => now, oauthMax: 2 });
    app.get("/api/auth/twitch/callback", () => {
      calls++;
      return { status: "provider-boundary" };
    });
    app.get("/health/ready", () => ({ status: "ready" }));
    app.get("/asset.css", () => "body{}");
    try {
      for (let i = 0; i < 2; i++)
        expect(
          (
            await app.inject({
              url: "/api/auth/twitch/callback",
              headers: { "x-forwarded-for": `192.0.2.${i}` },
            })
          ).statusCode,
        ).toBe(200);
      const blocked = await app.inject({
        url: "/api/auth/twitch/callback",
        headers: { "x-forwarded-for": "203.0.113.1" },
      });
      expect(blocked.statusCode).toBe(429);
      expect(blocked.json()).toEqual({ error: "rate_limited" });
      expect(blocked.headers["retry-after"]).toBe("60");
      expect(calls).toBe(2);
      for (const url of ["/health/ready", "/asset.css"])
        expect((await app.inject({ url })).statusCode).toBe(200);
      now += 60_001;
      expect(
        (await app.inject({ url: "/api/auth/twitch/callback" })).statusCode,
      ).toBe(200);
    } finally {
      await app.close();
    }
  });

  it("fails closed at key capacity and recovers when the window expires", () => {
    let now = 0;
    const gate = createAdmission(2, 1000, () => now, 2);
    expect(gate.take("a").allowed).toBe(true);
    expect(gate.take("b").allowed).toBe(true);
    expect(gate.take("c").allowed).toBe(false);
    expect(gate.take("a").allowed).toBe(true);
    expect(gate.take("a").allowed).toBe(false);
    now = 1001;
    expect(gate.take("c").allowed).toBe(true);
  });

  it("bounds API bodies and omits query, cookie, body and error secrets from logs", async () => {
    let log = "";
    const stream = new Writable({
      write(chunk, _encoding, done) {
        log += String(chunk);
        done();
      },
    });
    const app = Fastify({
      bodyLimit: HTTP_BODY_LIMIT,
      trustProxy: false,
      logger: { ...safeLoggerOptions, stream },
    });
    registerHttpAdmission(app, { apiMax: 2 });
    app.post("/api/example", (request) => request.body);
    app.get("/api/auth/twitch/callback", () => {
      throw new Error("synthetic-error-secret");
    });
    try {
      expect(
        (
          await app.inject({
            method: "POST",
            url: "/api/example",
            payload: { value: "x".repeat(HTTP_BODY_LIMIT + 1) },
          })
        ).statusCode,
      ).toBe(413);
      await app.inject({
        method: "POST",
        url: "/api/example?token=synthetic-query-secret",
        headers: {
          cookie: "session=synthetic-cookie-secret",
          authorization: "Bearer synthetic-header-secret",
        },
        payload: { value: "synthetic-body-secret" },
      });
      expect((await app.inject({ url: "/api/example" })).statusCode).toBe(429);
      await app.inject({
        url: "/api/auth/twitch/callback?code=synthetic-code-secret&state=synthetic-state-secret",
        remoteAddress: "192.0.2.20",
      });
      for (const marker of [
        "query",
        "cookie",
        "header",
        "body",
        "code",
        "state",
        "error",
      ])
        expect(log).not.toContain(`synthetic-${marker}-secret`);
      expect(log).toContain("/api/example");
      expect(log).toContain("statusCode");
    } finally {
      await app.close();
    }
  });
});
