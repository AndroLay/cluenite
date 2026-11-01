import type { FastifyInstance } from "fastify";
import type { Server } from "socket.io";
import type { Socket } from "node:net";

export function registerShutdown(
  app: FastifyInstance,
  sockets: Server,
  services: {
    stopBackground: () => Promise<void>;
    closeDatabase: () => Promise<void>;
  },
) {
  const connections = new Set<Socket>();
  const track = (socket: Socket) => {
    connections.add(socket);
    socket.once("close", () => connections.delete(socket));
  };
  app.server.on("connection", track);
  // onClose runs only after HTTP draining, which can wait forever on upgraded sockets.
  app.addHook("preClose", async () => {
    sockets.disconnectSockets(true);
    sockets.engine.close();
    try {
      await services.stopBackground();
    } finally {
      for (const socket of connections) socket.destroy();
      connections.clear();
      app.server.off("connection", track);
    }
  });
  app.addHook("onClose", async () => {
    await sockets.close();
    await services.closeDatabase();
  });
}
