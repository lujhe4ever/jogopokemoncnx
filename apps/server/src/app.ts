import websocket from "@fastify/websocket";
import Fastify from "fastify";
import type { DatabaseProbe } from "./database.js";

export interface AppDependencies {
  database: DatabaseProbe;
  logger?: boolean;
}

export async function buildApp({ database, logger = true }: AppDependencies) {
  const app = Fastify({
    logger,
    genReqId: (request) =>
      request.headers["x-request-id"]?.toString() ?? crypto.randomUUID(),
  });

  await app.register(websocket);

  app.get("/health", (request) => ({
    status: "ok",
    requestId: request.id,
  }));
  app.get("/ready", async (_request, reply) => {
    const ready = await database.isReady();
    return reply
      .code(ready ? 200 : 503)
      .send({ status: ready ? "ready" : "unavailable" });
  });
  app.get("/ws", { websocket: true }, (socket) => {
    socket.send(
      JSON.stringify({
        protocolVersion: 1,
        type: "hello",
        serverTime: Date.now(),
      }),
    );
    socket.on("message", () => {
      socket.send("pong");
    });
  });
  app.addHook("onClose", async () => database.close());
  return app;
}
