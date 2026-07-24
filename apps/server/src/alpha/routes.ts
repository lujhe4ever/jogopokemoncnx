import type { FastifyInstance } from "fastify";
import { SESSION_COOKIE } from "../auth/routes.js";
import type { AuthService } from "../auth/service.js";
import type { AlphaTelemetry } from "./telemetry.js";

export function registerAlphaRoutes(
  app: FastifyInstance,
  auth: AuthService,
  telemetry: AlphaTelemetry,
) {
  app.post(
    "/api/alpha/events",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const token = request.cookies[SESSION_COOKIE];
      const session = token ? await auth.getSession(token) : null;
      if (!session) return reply.code(401).send({ error: "unauthorized" });
      if (!telemetry.record(request.body))
        return reply.code(400).send({ error: "invalid_or_without_consent" });
      return reply.code(202).send({ accepted: true });
    },
  );
}
