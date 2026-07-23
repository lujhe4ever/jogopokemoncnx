import { describe, expect, it, vi } from "vitest";
import type { AuthService } from "../apps/server/src/auth/service.js";
import { buildApp } from "../apps/server/src/app.js";
import { AlphaTelemetry } from "../apps/server/src/alpha/telemetry.js";

function database() {
  return {
    isReady: vi.fn(() => Promise.resolve(true)),
    close: vi.fn(() => Promise.resolve()),
  };
}

describe("private alpha telemetry", () => {
  it("only accepts allowlisted anonymous events with explicit consent", () => {
    const telemetry = new AlphaTelemetry();
    expect(telemetry.record({ consent: false, event: "home_loaded" })).toBe(
      false,
    );
    expect(
      telemetry.record({
        consent: true,
        event: "home_loaded",
        accountId: "must-not-be-collected",
      }),
    ).toBe(false);
    expect(telemetry.record({ consent: true, event: "home_loaded" })).toBe(
      true,
    );
    expect(telemetry.snapshot().home_loaded).toBe(1);
  });

  it("requires a session and keeps collection disabled unless injected", async () => {
    const telemetry = new AlphaTelemetry();
    const auth = {
      getSession: vi.fn((token: string) =>
        Promise.resolve(
          token === "valid"
            ? {
                accountId: "internal-id",
                email: "private@example.invalid",
                displayName: "Alpha",
                expiresAt: new Date(Date.now() + 60_000),
              }
            : null,
        ),
      ),
    } as unknown as AuthService;
    const app = await buildApp({
      database: database(),
      logger: false,
      auth,
      alphaTelemetry: telemetry,
      metricsToken: "alpha-metrics-token-with-32-characters",
    });

    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/alpha/events",
          payload: { consent: true, event: "arena_joined" },
        })
      ).statusCode,
    ).toBe(401);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/alpha/events",
          headers: { cookie: "lt_session=valid" },
          payload: { consent: true, event: "arena_joined" },
        })
      ).statusCode,
    ).toBe(202);
    expect(telemetry.snapshot().arena_joined).toBe(1);
    const metrics = await app.inject({
      method: "GET",
      url: "/metrics",
      headers: {
        authorization: "Bearer alpha-metrics-token-with-32-characters",
      },
    });
    expect(metrics.body).toContain(
      'lt_alpha_events_total{event="arena_joined"} 1',
    );
    expect(metrics.body).not.toContain("internal-id");
    expect(metrics.body).not.toContain("private@example.invalid");
    await app.close();

    const disabled = await buildApp({ database: database(), logger: false });
    expect(
      (
        await disabled.inject({
          method: "POST",
          url: "/api/alpha/events",
          payload: { consent: true, event: "arena_joined" },
        })
      ).statusCode,
    ).toBe(404);
    await disabled.close();
  });
});
