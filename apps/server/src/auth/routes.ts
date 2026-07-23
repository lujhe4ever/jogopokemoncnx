import { createHash } from "node:crypto";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { AuthenticationError, type AuthService } from "./service.js";

export const SESSION_COOKIE = "lt_session";
const credentialsSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(12).max(128),
});
const registrationSchema = credentialsSchema.extend({
  displayName: z.string().trim().min(2).max(40),
});

function ipHash(request: FastifyRequest): string {
  return createHash("sha256").update(request.ip).digest("hex");
}

export async function registerAuthRoutes(
  app: FastifyInstance,
  auth: AuthService,
  cookieSecure: boolean,
) {
  await app.register(cookie);
  await app.register(rateLimit, { global: false });

  app.post(
    "/auth/register",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const input = registrationSchema.safeParse(request.body);
      if (!input.success)
        return reply.code(400).send({ error: "invalid_request" });
      try {
        const account = await auth.register(
          input.data.email,
          input.data.password,
          input.data.displayName,
        );
        reply.code(201);
        return { id: account.id, displayName: account.displayName };
      } catch (error) {
        if (error instanceof AuthenticationError) {
          return reply.code(409).send({ error: "account_unavailable" });
        }
        throw error;
      }
    },
  );

  app.post(
    "/auth/login",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const input = credentialsSchema.safeParse(request.body);
      if (!input.success)
        return reply.code(400).send({ error: "invalid_request" });
      try {
        const result = await auth.login(
          input.data.email,
          input.data.password,
          ipHash(request),
        );
        reply.setCookie(SESSION_COOKIE, result.token, {
          httpOnly: true,
          sameSite: "strict",
          secure: cookieSecure,
          path: "/",
          maxAge: 7 * 24 * 60 * 60,
        });
        return { profile: result.profile };
      } catch (error) {
        if (error instanceof AuthenticationError) {
          return reply.code(401).send({ error: "invalid_credentials" });
        }
        throw error;
      }
    },
  );

  app.get("/auth/session", async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE];
    if (!token) return reply.code(401).send({ error: "unauthorized" });
    const session = await auth.getSession(token);
    return session
      ? { profile: session }
      : reply.code(401).send({ error: "unauthorized" });
  });

  app.post("/auth/logout", async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE];
    if (token) await auth.logout(token);
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return reply.code(204).send();
  });

  app.post("/auth/ws-ticket", async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE];
    const session = token ? await auth.getSession(token) : null;
    if (!session) return reply.code(401).send({ error: "unauthorized" });
    return {
      ticket: await auth.createWebSocketTicket(session.accountId),
      expiresInSeconds: 30,
    };
  });
}
