import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { SESSION_COOKIE } from "../auth/routes.js";
import type { AuthService } from "../auth/service.js";
import { GameStateError } from "./game-service.js";
import type { GameService } from "./game-service.js";

async function owner(
  request: FastifyRequest,
  reply: FastifyReply,
  auth: AuthService,
): Promise<string | null> {
  const token = request.cookies[SESSION_COOKIE];
  const session = token ? await auth.getSession(token) : null;
  if (!session) {
    void reply.code(401).send({ error: "unauthorized" });
    return null;
  }
  return session.accountId;
}

function gameError(reply: FastifyReply, error: unknown) {
  if (error instanceof GameStateError)
    return reply.code(error.status).send({ error: error.code });
  throw error;
}

export function registerGameRoutes(
  app: FastifyInstance,
  auth: AuthService,
  game: GameService,
) {
  app.get("/game/state", async (request, reply) => {
    const ownerId = await owner(request, reply, auth);
    if (!ownerId) return reply;
    try {
      return await game.state(ownerId);
    } catch (error) {
      return gameError(reply, error);
    }
  });

  app.post("/game/starter", async (request, reply) => {
    const ownerId = await owner(request, reply, auth);
    if (!ownerId) return reply;
    const input = z
      .object({ definitionId: z.string().min(1).max(80) })
      .safeParse(request.body);
    if (!input.success)
      return reply.code(400).send({ error: "invalid_request" });
    try {
      const result = await game.chooseStarter(ownerId, input.data.definitionId);
      return await reply
        .code(result.status === "selected" ? 201 : 200)
        .send(result);
    } catch (error) {
      return gameError(reply, error);
    }
  });

  app.post("/game/team", async (request, reply) => {
    const ownerId = await owner(request, reply, auth);
    if (!ownerId) return reply;
    const input = z
      .object({
        creatureIds: z.array(z.string().min(1).max(80)).max(6),
      })
      .safeParse(request.body);
    if (!input.success)
      return reply.code(400).send({ error: "invalid_request" });
    try {
      return await game.setTeam(ownerId, input.data.creatureIds);
    } catch (error) {
      return gameError(reply, error);
    }
  });
}
