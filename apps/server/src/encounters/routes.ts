import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { AuthService } from "../auth/service.js";
import type { HouseRoom } from "../world/house-room.js";
import type { EncounterService } from "./encounter-service.js";

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

export function registerEncounterRoutes(
  app: FastifyInstance,
  auth: AuthService,
  encounters: EncounterService,
  world: HouseRoom,
): void {
  app.post("/encounters", async (request, reply) => {
    const ownerId = await owner(request, reply, auth);
    if (!ownerId) return reply;
    const body = z.object({ authorization: z.uuid() }).safeParse(request.body);
    if (!body.success)
      return reply.code(400).send({ error: "invalid_request" });
    const zoneId = world.consumeEncounterAuthorization(
      ownerId,
      body.data.authorization,
    );
    return zoneId
      ? encounters.start(ownerId, zoneId)
      : reply.code(403).send({ error: "encounter_not_authorized" });
  });

  app.post("/encounters/:id/capture", async (request, reply) => {
    const ownerId = await owner(request, reply, auth);
    if (!ownerId) return reply;
    const params = z
      .object({ id: z.string().min(1) })
      .safeParse(request.params);
    const body = z.object({ requestId: z.uuid() }).safeParse(request.body);
    if (!params.success || !body.success)
      return reply.code(400).send({ error: "invalid_request" });
    const result = await encounters.capture(
      ownerId,
      params.data.id,
      body.data.requestId,
    );
    return result ?? reply.code(404).send({ error: "encounter_not_found" });
  });

  app.post("/encounters/:id/return", async (request, reply) => {
    const ownerId = await owner(request, reply, auth);
    if (!ownerId) return reply;
    const params = z
      .object({ id: z.string().min(1) })
      .safeParse(request.params);
    if (!params.success)
      return reply.code(400).send({ error: "invalid_request" });
    const result = await encounters.returnToWorld(ownerId, params.data.id);
    return result ?? reply.code(404).send({ error: "encounter_not_found" });
  });
}
