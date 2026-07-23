import { PrismaClient } from "@prisma/client";
import { buildApp } from "./app.js";
import { PrismaAuthRepository } from "./auth/prisma-repository.js";
import { AuthService } from "./auth/service.js";
import { loadConfig } from "./config.js";
import { createDatabaseProbe } from "./database.js";

const config = loadConfig(process.env);
const prisma = new PrismaClient();
const app = await buildApp({
  database: createDatabaseProbe(prisma),
  auth: new AuthService(new PrismaAuthRepository(prisma)),
  cookieSecure: config.NODE_ENV === "production",
});

const shutdown = () => {
  void app.close();
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

await app.listen({ host: config.HOST, port: config.SERVER_PORT });
