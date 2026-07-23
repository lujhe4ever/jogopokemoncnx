import { describe, expect, it, vi } from "vitest";
import { buildApp } from "../apps/server/src/app.js";
import { loadConfig } from "../apps/server/src/config.js";

function database() {
  return {
    isReady: vi.fn(() => Promise.resolve(true)),
    close: vi.fn(() => Promise.resolve()),
  };
}

describe("operational hardening", () => {
  it("adds browser security headers and keeps metrics disabled by default", async () => {
    const app = await buildApp({ database: database(), logger: false });
    const health = await app.inject({ method: "GET", url: "/health" });
    expect(health.headers).toMatchObject({
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "referrer-policy": "no-referrer",
    });
    expect(health.headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
    expect(
      (await app.inject({ method: "GET", url: "/metrics" })).statusCode,
    ).toBe(404);
    const acceptedId = await app.inject({
      method: "GET",
      url: "/health",
      headers: { "x-request-id": "client_request-42" },
    });
    expect(acceptedId.json()).toMatchObject({ requestId: "client_request-42" });
    const rejectedId = await app.inject({
      method: "GET",
      url: "/health",
      headers: { "x-request-id": "a".repeat(65) },
    });
    expect(rejectedId.body).toMatch(
      /"requestId":"[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}"/,
    );
    await app.close();
  });

  it("requires a constant-time bearer token for Prometheus metrics", async () => {
    const app = await buildApp({
      database: database(),
      logger: false,
      metricsToken: "metrics-token-with-at-least-32-characters",
    });
    expect(
      (await app.inject({ method: "GET", url: "/metrics" })).statusCode,
    ).toBe(401);
    const response = await app.inject({
      method: "GET",
      url: "/metrics",
      headers: {
        authorization: "Bearer metrics-token-with-at-least-32-characters",
      },
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("lt_http_requests_total");
    expect(response.body).toContain("lt_arena_players 0");
    await app.close();
  });

  it("loads production secrets from mounted files without changing the schema", () => {
    const reads: string[] = [];
    const config = loadConfig(
      {
        DATABASE_URL_FILE: "/run/secrets/database_url",
        ADMIN_STEP_UP_SECRET_FILE: "/run/secrets/admin_step_up",
        METRICS_TOKEN_FILE: "/run/secrets/metrics_token",
        NODE_ENV: "production",
      },
      (path) => {
        reads.push(path);
        if (path.endsWith("database_url"))
          return "postgresql://service:secret@postgres:5432/projeto_lt";
        return "secret-value-with-at-least-32-characters";
      },
    );
    expect(config).toMatchObject({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://service:secret@postgres:5432/projeto_lt",
      ADMIN_STEP_UP_SECRET: "secret-value-with-at-least-32-characters",
      METRICS_TOKEN: "secret-value-with-at-least-32-characters",
    });
    expect(reads).toHaveLength(3);
  });
});
