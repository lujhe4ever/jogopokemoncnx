import websocket from "@fastify/websocket";
import Fastify from "fastify";
import { z } from "zod";
import { registerAuthRoutes } from "./auth/routes.js";
import type { AuthService } from "./auth/service.js";
import type { DatabaseProbe } from "./database.js";
import type { HouseRoom } from "./world/house-room.js";

export interface AppDependencies {
  database: DatabaseProbe;
  auth?: AuthService;
  cookieSecure?: boolean;
  logger?: boolean;
  world?: HouseRoom;
}

export async function buildApp({
  database,
  auth,
  cookieSecure = false,
  logger = true,
  world,
}: AppDependencies) {
  const app = Fastify({
    logger,
    genReqId: (request) =>
      request.headers["x-request-id"]?.toString() ?? crypto.randomUUID(),
  });

  await app.register(websocket);
  if (auth) await registerAuthRoutes(app, auth, cookieSecure);

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
  app.get("/ws", { websocket: true }, (socket, request) => {
    const ticket = z
      .object({ ticket: z.string().min(1) })
      .safeParse(request.query);
    void (async () => {
      const accountId =
        ticket.success && auth
          ? await auth.consumeWebSocketTicket(ticket.data.ticket)
          : null;
      if (!accountId) {
        socket.close(1008, "invalid_ticket");
        return;
      }
      socket.send(
        JSON.stringify({
          protocolVersion: 1,
          type: "hello",
          serverTime: Date.now(),
        }),
      );
      if (world) await world.connect(socket, accountId);
      socket.on("message", () => {
        if (!world) socket.send("pong");
      });
    })();
  });
  app.addHook("onClose", async () => database.close());
  if (world) app.addHook("onClose", async () => world.close());
  return app;
}
