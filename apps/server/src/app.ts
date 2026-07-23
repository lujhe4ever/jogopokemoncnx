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
import { createHash, timingSafeEqual } from "node:crypto";

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
  allowedOrigin?: string;
  metricsToken?: string;
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
  allowedOrigin,
  metricsToken,
}: AppDependencies) {
  const app = Fastify({
    logger,
    bodyLimit: 64 * 1024,
    genReqId: (request) => {
      const candidate = request.headers["x-request-id"]?.toString();
      return candidate && /^[A-Za-z0-9_-]{1,64}$/.test(candidate)
        ? candidate
        : crypto.randomUUID();
    },
  });
  let requestCount = 0;
  let errorCount = 0;

  await app.register(websocket);
  app.addHook("onSend", (_request, reply, payload, done) => {
    void reply
      .header(
        "content-security-policy",
        [
          "default-src 'self'",
          "script-src 'self'",
          "style-src 'self'",
          "img-src 'self' data:",
          "connect-src 'self' ws: wss:",
          "object-src 'none'",
          "base-uri 'none'",
          "frame-ancestors 'none'",
        ].join("; "),
      )
      .header("referrer-policy", "no-referrer")
      .header("x-content-type-options", "nosniff")
      .header("x-frame-options", "DENY")
      .header("permissions-policy", "camera=(), microphone=(), geolocation=()");
    done(null, payload);
  });
  app.addHook("onResponse", (_request, reply, done) => {
    requestCount += 1;
    if (reply.statusCode >= 500) errorCount += 1;
    done();
  });
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
    if (allowedOrigin && request.headers.origin !== allowedOrigin) {
      socket.close(1008, "origin_not_allowed");
      return;
    }
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
    if (allowedOrigin && request.headers.origin !== allowedOrigin) {
      socket.close(1008, "origin_not_allowed");
      return;
    }
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
  if (metricsToken)
    app.get("/metrics", (request, reply) => {
      const authorization = request.headers.authorization;
      const candidate = authorization?.startsWith("Bearer ")
        ? authorization.slice(7)
        : "";
      const expectedHash = createHash("sha256").update(metricsToken).digest();
      const candidateHash = createHash("sha256").update(candidate).digest();
      if (!timingSafeEqual(expectedHash, candidateHash))
        return reply.code(401).send({ error: "unauthorized" });
      const metrics = arena
        ? arena.metrics()
        : {
            rooms: 0,
            players: 0,
            droppedMessages: 0,
            battleBroadcasts: 0,
            battleBroadcastDeliveries: 0,
            maxTickDurationMs: 0,
          };
      return reply
        .type("text/plain; version=0.0.4")
        .send(
          [
            `lt_http_requests_total ${String(requestCount)}`,
            `lt_http_errors_total ${String(errorCount)}`,
            `lt_process_uptime_seconds ${String(Math.floor(process.uptime()))}`,
            `lt_process_resident_memory_bytes ${String(process.memoryUsage().rss)}`,
            `lt_arena_rooms ${String(metrics.rooms)}`,
            `lt_arena_players ${String(metrics.players)}`,
            `lt_arena_dropped_messages_total ${String(metrics.droppedMessages)}`,
            `lt_arena_max_tick_duration_ms ${String(metrics.maxTickDurationMs)}`,
            `lt_battle_broadcasts_total ${String(metrics.battleBroadcasts)}`,
            `lt_battle_broadcast_deliveries_total ${String(metrics.battleBroadcastDeliveries)}`,
            "",
          ].join("\n"),
        );
    });
  app.addHook("onClose", async () => database.close());
  if (world) app.addHook("onClose", async () => world.close());
  if (arena)
    app.addHook("onClose", () => {
      arena.close();
    });
  return app;
}
