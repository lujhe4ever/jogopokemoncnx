import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { AuthService } from "../auth/service.js";
import type { QuestService } from "./quest-service.js";

async function owner(
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

export function registerQuestRoutes(
  app: FastifyInstance,
  auth: AuthService,
  quests: QuestService,
): void {
  app.get("/quests", async (request, reply) => {
    const ownerId = await owner(request, reply, auth);
    return ownerId ? quests.journal(ownerId) : reply;
  });
  app.post("/quests/:id/claim", async (request, reply) => {
    const ownerId = await owner(request, reply, auth);
    if (!ownerId) return reply;
    const params = z
      .object({ id: z.string().min(1) })
      .safeParse(request.params);
    if (!params.success)
      return reply.code(400).send({ error: "invalid_request" });
    return { claimed: await quests.claim(ownerId, params.data.id) };
  });
}
