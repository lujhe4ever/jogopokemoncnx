import websocket from "@fastify/websocket";
import Fastify from "fastify";
import { z } from "zod";
import { registerAuthRoutes } from "./auth/routes.js";
import type { AuthService } from "./auth/service.js";
import { registerBattleRoutes } from "./battles/routes.js";
import type { BattleService } from "./battles/battle-service.js";
import type { DatabaseProbe } from "./database.js";
import { registerEncounterRoutes } from "./encounters/routes.js";
import type { EncounterService } from "./encounters/encounter-service.js";
import type { HouseRoom } from "./world/house-room.js";
import { registerQuestRoutes } from "./quests/routes.js";
import type { QuestService } from "./quests/quest-service.js";
import type { ArenaRegistry } from "./arena/arena-room.js";
import type { ArenaProfileStore } from "./arena/profile-store.js";
import { registerAdminRoutes } from "./admin/routes.js";
import type { AdminService } from "./admin/service.js";

export interface AppDependencies {
  database: DatabaseProbe;
  auth?: AuthService;
  cookieSecure?: boolean;
  logger?: boolean;
  world?: HouseRoom;
  battles?: BattleService;
  encounters?: EncounterService;
  quests?: QuestService;
  arena?: ArenaRegistry;
  arenaProfiles?: ArenaProfileStore;
  admin?: AdminService;
}

export async function buildApp({
  database,
  auth,
  cookieSecure = false,
  logger = true,
  world,
  battles,
  encounters,
  quests,
  arena,
  arenaProfiles,
  admin,
}: AppDependencies) {
  const app = Fastify({
    logger,
    genReqId: (request) =>
      request.headers["x-request-id"]?.toString() ?? crypto.randomUUID(),
  });

  await app.register(websocket);
  if (auth) await registerAuthRoutes(app, auth, cookieSecure);
  if (auth && battles) registerBattleRoutes(app, auth, battles);
  if (auth && encounters && world)
    registerEncounterRoutes(app, auth, encounters, world);
  if (auth && quests) registerQuestRoutes(app, auth, quests);
  if (auth && admin) registerAdminRoutes(app, auth, admin);

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
  app.get("/arena", { websocket: true }, (socket, request) => {
    const query = z
      .object({
        ticket: z.string().min(1),
        roomId: z.string().regex(/^arena-[1-9][0-9]?$/),
      })
      .safeParse(request.query);
    void (async () => {
      const accountId =
        query.success && auth
          ? await auth.consumeWebSocketTicket(query.data.ticket)
          : null;
      const displayName =
        accountId && arenaProfiles
          ? await arenaProfiles.displayName(accountId)
          : null;
      if (!query.success || !accountId || !displayName || !arena) {
        socket.close(1008, "invalid_arena_session");
        return;
      }
      arena.connect(query.data.roomId, socket, accountId, displayName);
    })();
  });
  app.get("/arena-metrics", () =>
    arena
      ? arena.metrics()
      : { rooms: 0, players: 0, droppedMessages: 0, maxTickDurationMs: 0 },
  );
  app.addHook("onClose", async () => database.close());
  if (world) app.addHook("onClose", async () => world.close());
  if (arena)
    app.addHook("onClose", () => {
      arena.close();
    });
  return app;
}
