import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createDatabaseProbe } from "./database.js";

const config = loadConfig(process.env);
const app = await buildApp({ database: createDatabaseProbe() });

const shutdown = () => {
  void app.close();
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

await app.listen({ host: config.HOST, port: config.SERVER_PORT });
