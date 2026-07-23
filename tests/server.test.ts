import { describe, expect, it, vi } from "vitest";
import { buildApp } from "../apps/server/src/app.js";

describe("runtime server", () => {
  it("reports health with a correlation id", async () => {
    const database = {
      isReady: vi.fn(() => Promise.resolve(true)),
      close: vi.fn(() => Promise.resolve()),
    };
    const app = await buildApp({ database, logger: false });
    const response = await app.inject({
      method: "GET",
      url: "/health",
      headers: { "x-request-id": "test-id" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok", requestId: "test-id" });
    await app.close();
  });

  it("returns 503 when PostgreSQL is unavailable", async () => {
    const database = {
      isReady: vi.fn(() => Promise.resolve(false)),
      close: vi.fn(() => Promise.resolve()),
    };
    const app = await buildApp({ database, logger: false });
    const response = await app.inject({ method: "GET", url: "/ready" });
    expect(response.statusCode).toBe(503);
    await app.close();
  });
});
