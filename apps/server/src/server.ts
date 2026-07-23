import { PrismaClient } from "@prisma/client";
import { buildApp } from "./app.js";
import { PrismaAuthRepository } from "./auth/prisma-repository.js";
import { AuthService } from "./auth/service.js";
import { loadConfig } from "./config.js";
import {
  BattleService,
  PrismaBattleResultStore,
} from "./battles/battle-service.js";
import { createDatabaseProbe } from "./database.js";
import { EncounterService } from "./encounters/encounter-service.js";
import { HouseRoom, PrismaCheckpointStore } from "./world/house-room.js";
import { PrismaInteractionStore } from "./world/interaction-store.js";
import { QuestService } from "./quests/quest-service.js";
import { ArenaRegistry } from "./arena/arena-room.js";
import { PrismaArenaProfileStore } from "./arena/profile-store.js";
import { PvpService } from "./battles/pvp-service.js";

const config = loadConfig(process.env);
const prisma = new PrismaClient();
const quests = new QuestService(prisma);
const pvp = new PvpService(prisma);
const arena = new ArenaRegistry(true, Date.now, pvp);
const world = new HouseRoom(
  new PrismaCheckpointStore(prisma),
  true,
  new PrismaInteractionStore(prisma),
  quests,
);
const battles = new BattleService(new PrismaBattleResultStore(prisma, quests));
const app = await buildApp({
  database: createDatabaseProbe(prisma),
  auth: new AuthService(new PrismaAuthRepository(prisma)),
  cookieSecure: config.NODE_ENV === "production",
  world,
  battles,
  encounters: new EncounterService(
    prisma,
    battles,
    undefined,
    undefined,
    quests,
  ),
  quests,
  arena,
  arenaProfiles: new PrismaArenaProfileStore(prisma),
});

const shutdown = () => {
  void app.close();
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

await app.listen({ host: config.HOST, port: config.SERVER_PORT });
