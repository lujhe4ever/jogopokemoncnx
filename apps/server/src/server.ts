import { PrismaClient } from "@prisma/client";
import { buildApp } from "./app.js";
import { PrismaAuthRepository } from "./auth/prisma-repository.js";
import { AuthService } from "./auth/service.js";
import { loadConfig } from "./config.js";
import { createDatabaseProbe } from "./database.js";
import { HouseRoom, PrismaCheckpointStore } from "./world/house-room.js";

const config = loadConfig(process.env);
const prisma = new PrismaClient();
const world = new HouseRoom(new PrismaCheckpointStore(prisma));
const app = await buildApp({
  database: createDatabaseProbe(prisma),
  auth: new AuthService(new PrismaAuthRepository(prisma)),
  cookieSecure: config.NODE_ENV === "production",
  world,
});

const shutdown = () => {
  void app.close();
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

await app.listen({ host: config.HOST, port: config.SERVER_PORT });
