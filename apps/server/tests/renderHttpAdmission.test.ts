import Fastify from "fastify";
import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import {
  registerHttpAdmission,
  safeLoggerOptions,
} from "../src/ops/httpPolicy.js";

function fixture(renderEdge: boolean) {
  const app = Fastify({ trustProxy: false });
  registerHttpAdmission(app, { apiMax: 1, renderEdge });
  app.get("/api/example", () => ({ ok: true }));
  return app;
}

describe("Render edge HTTP admission", () => {
  it("gives different edge clients independent budgets behind one private proxy", async () => {
    const app = fixture(true);
    try {
      for (const ip of ["192.0.2.1", "192.0.2.2"])
        expect(
          (
            await app.inject({
              url: "/api/example",
              remoteAddress: "10.20.0.1",
              headers: { "cf-connecting-ip": ip },
            })
          ).statusCode,
        ).toBe(200);
      expect(
        (
          await app.inject({
            url: "/api/example",
            remoteAddress: "10.20.0.1",
            headers: {
              "cf-connecting-ip": "192.0.2.1",
              "x-forwarded-for": "203.0.113.99",
            },
          })
        ).statusCode,
      ).toBe(429);
    } finally {
      await app.close();
    }
  });

  it("shares one client budget across proxy peers and equivalent IPv6 spellings", async () => {
    const app = fixture(true);
    try {
      expect(
        (
          await app.inject({
            url: "/api/example",
            remoteAddress: "::ffff:10.20.0.1",
            headers: { "cf-connecting-ip": "2001:db8::a" },
          })
        ).statusCode,
      ).toBe(200);
      expect(
        (
          await app.inject({
            url: "/api/example",
            remoteAddress: "10.20.0.2",
            headers: {
              "cf-connecting-ip": "2001:0db8:0000:0000:0000:0000:0000:000a",
            },
          })
        ).statusCode,
      ).toBe(429);
    } finally {
      await app.close();
    }
  });

  it.each([false, true])(
    "ignores forged headers from direct public clients, render mode %s",
    async (renderEdge) => {
      const app = fixture(renderEdge);
      try {
        for (const [index, ip] of ["192.0.2.1", "192.0.2.2"].entries())
          expect(
            (
              await app.inject({
                url: "/api/example",
                remoteAddress: "203.0.113.10",
                headers: { "cf-connecting-ip": ip, "x-forwarded-for": ip },
              })
            ).statusCode,
          ).toBe(index === 0 ? 200 : 429);
      } finally {
        await app.close();
      }
    },
  );

  it("does not trust private-peer headers unless the Render edge mode is enabled", async () => {
    const app = fixture(false);
    try {
      for (const [index, ip] of ["192.0.2.1", "192.0.2.2"].entries())
        expect(
          (
            await app.inject({
              url: "/api/example",
              remoteAddress: "127.0.0.1",
              headers: { "cf-connecting-ip": ip },
            })
          ).statusCode,
        ).toBe(index === 0 ? 200 : 429);
    } finally {
      await app.close();
    }
  });

  it.each([
    undefined,
    "",
    "not-an-ip",
    "192.0.2.1, 192.0.2.2",
    "192.0.2.1:80",
    "fe80::1%eth0",
  ])(
    "falls back to the peer for missing or malformed edge IP %s",
    async (ip) => {
      const app = fixture(true);
      try {
        const headers = ip === undefined ? {} : { "cf-connecting-ip": ip };
        expect(
          (
            await app.inject({
              url: "/api/example",
              remoteAddress: "10.20.0.1",
              headers,
            })
          ).statusCode,
        ).toBe(200);
        expect(
          (
            await app.inject({
              url: "/api/example",
              remoteAddress: "10.20.0.1",
              headers: { "cf-connecting-ip": "invalid-fallback" },
            })
          ).statusCode,
        ).toBe(429);
      } finally {
        await app.close();
      }
    },
  );

  it("reports the selected source once without retaining address or header values", async () => {
    let log = "";
    const stream = new Writable({
      write(chunk, _encoding, done) {
        log += String(chunk);
        done();
      },
    });
    const app = Fastify({
      trustProxy: false,
      disableRequestLogging: true,
      logger: { ...safeLoggerOptions, stream },
    });
    registerHttpAdmission(app, { renderEdge: true });
    app.get("/api/example", () => ({ ok: true }));
    try {
      for (let index = 0; index < 3; index++)
        await app.inject({
          url: "/api/example",
          remoteAddress: "10.20.0.1",
          headers: {
            "cf-connecting-ip": "192.0.2.55",
            "x-forwarded-for": "synthetic-private-header",
          },
        });
      const records = log
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line));
      expect(
        records.filter((row) => row.msg === "HTTP rate limit source"),
      ).toHaveLength(1);
      expect(
        records.find((row) => row.msg === "HTTP rate limit source")
          ?.clientIpSource,
      ).toBe("render-edge");
      expect(log).not.toContain("10.20.0.1");
      expect(log).not.toContain("192.0.2.55");
      expect(log).not.toContain("synthetic-private-header");
    } finally {
      await app.close();
    }
  });
});
