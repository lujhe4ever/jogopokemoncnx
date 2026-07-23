import { z } from "zod";
import { readFileSync } from "node:fs";

const configSchema = z.object({
  DATABASE_URL: z.url(),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  SERVER_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  ADMIN_STEP_UP_SECRET: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(32).optional(),
  ),
  METRICS_TOKEN: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(32).optional(),
  ),
  PUBLIC_ORIGIN: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.url().optional(),
  ),
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(
  environment: NodeJS.ProcessEnv,
  readSecret: (path: string) => string = (path) =>
    readFileSync(path, "utf8").trim(),
): AppConfig {
  const resolved = { ...environment };
  for (const name of [
    "DATABASE_URL",
    "ADMIN_STEP_UP_SECRET",
    "METRICS_TOKEN",
  ] as const) {
    const file = environment[`${name}_FILE`];
    if (!resolved[name] && file) resolved[name] = readSecret(file);
  }
  const result = configSchema.safeParse(resolved);
  if (!result.success) {
    const fields = result.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ");
    throw new Error(`Invalid environment configuration: ${fields}`);
  }
  return result.data;
}
