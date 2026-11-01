import Fastify from "fastify";
import { Server } from "socket.io";
import { io as socketClient } from "../../web/node_modules/socket.io-client";
import { connect } from "node:net";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { describe, expect, it, vi } from "vitest";
import {
  HTTP_BODY_LIMIT,
  registerHttpAdmission,
} from "../src/ops/httpPolicy.js";
import { registerShutdown } from "../src/ops/shutdown.js";

describe("bounded server shutdown", () => {
  async function setup() {
    const app = Fastify({ bodyLimit: HTTP_BODY_LIMIT });
    const sockets = new Server(app.server);
    registerHttpAdmission(app);
    app.post("/api/example", () => ({ status: "accepted" }));
    const order: string[] = [];
    const stopBackground = vi.fn(async () => {
      order.push("background");
    });
    const closeDatabase = vi.fn(async () => {
      order.push("database");
    });
    registerShutdown(app, sockets, { stopBackground, closeDatabase });
    const origin = await app.listen({ host: "127.0.0.1", port: 0 });
    return { app, sockets, origin, order, stopBackground, closeDatabase };
  }

  it("closes a rejected oversized request whose sender never finishes its body", async () => {
    const x = await setup();
    const socket = connect(Number(new URL(x.origin).port), "127.0.0.1");
    await once(socket, "connect");
    socket.on("error", () => undefined);
    const data = once(socket, "data");
    socket.write(
      "POST /api/example HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/json\r\nContent-Length: 100000\r\n\r\n{",
    );
    expect(String((await data)[0])).toContain("413");
    const closing = x.app.close();
    try {
      expect(
        await Promise.race([closing.then(() => true), delay(1000, false)]),
      ).toBe(true);
      expect(x.order).toEqual(["background", "database"]);
    } finally {
      socket.destroy();
      await closing;
      await x.sockets.close();
    }
  });

  it("disconnects an active websocket before waiting for HTTP closure and closes services once", async () => {
    const x = await setup();
    const client = socketClient(x.origin, {
      transports: ["websocket"],
      reconnection: false,
    });
    await once(client, "connect");
    const closing = x.app.close();
    try {
      expect(
        await Promise.race([closing.then(() => true), delay(1000, false)]),
      ).toBe(true);
      await x.app.close();
      expect(x.stopBackground).toHaveBeenCalledOnce();
      expect(x.closeDatabase).toHaveBeenCalledOnce();
    } finally {
      client.disconnect();
      await closing;
      await x.sockets.close();
    }
  });
});
