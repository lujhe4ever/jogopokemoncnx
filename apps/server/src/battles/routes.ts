import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { AuthService } from "../auth/service.js";
import type { BattleService } from "./battle-service.js";

async function accountId(
  request: FastifyRequest,
  reply: FastifyReply,
  auth: AuthService,
): Promise<string | null> {
  const token = request.cookies.lt_session;
  const session = token ? await auth.getSession(token) : null;
  if (!session) {
    void reply.code(401).send({ error: "unauthorized" });
    return null;
  }
  return session.accountId;
}

export function registerBattleRoutes(
  app: FastifyInstance,
  auth: AuthService,
  battles: BattleService,
): void {
  app.post("/battles", async (request, reply) => {
    const ownerId = await accountId(request, reply, auth);
    return ownerId ? battles.start(ownerId) : reply;
  });

  app.get("/battles/:id", async (request, reply) => {
    const ownerId = await accountId(request, reply, auth);
    if (!ownerId) return reply;
    const input = z.object({ id: z.string().min(1) }).safeParse(request.params);
    if (!input.success)
      return reply.code(400).send({ error: "invalid_request" });
    return (
      battles.get(ownerId, input.data.id) ??
      reply.code(404).send({ error: "battle_not_found" })
    );
  });

  app.post("/battles/:id/commands", async (request, reply) => {
    const ownerId = await accountId(request, reply, auth);
    if (!ownerId) return reply;
    const params = z
      .object({ id: z.string().min(1) })
      .safeParse(request.params);
    const body = z
      .object({
        sequence: z.number().int().positive(),
        action: z.enum(["strike", "guard"]),
      })
      .safeParse(request.body);
    if (!params.success || !body.success)
      return reply.code(400).send({ error: "invalid_request" });
    const result = await battles.choose(
      ownerId,
      params.data.id,
      body.data.sequence,
      body.data.action,
    );
    return result ?? reply.code(404).send({ error: "battle_not_found" });
  });

  app.post("/battles/:id/abandon", async (request, reply) => {
    const ownerId = await accountId(request, reply, auth);
    if (!ownerId) return reply;
    const params = z
      .object({ id: z.string().min(1) })
      .safeParse(request.params);
    if (!params.success)
      return reply.code(400).send({ error: "invalid_request" });
    const query = z
      .object({ reason: z.enum(["abandon", "disconnect"]).optional() })
      .safeParse(request.query);
    const result = await battles.abandon(
      ownerId,
      params.data.id,
      query.success ? query.data.reason : "abandon",
    );
    return result ?? reply.code(404).send({ error: "battle_not_found" });
  });
}
