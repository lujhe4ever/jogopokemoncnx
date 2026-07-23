import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { SESSION_COOKIE } from "../auth/routes.js";
import type { AuthService } from "../auth/service.js";
import { AdminAccessError, type AdminService } from "./service.js";

const manifestSchema = z.object({
  packId: z.string().max(80),
  version: z.string().max(32),
  checksum: z.string().max(128),
  license: z.enum(["ORIGINAL", "CC0"]),
  entries: z
    .array(
      z.object({
        id: z.string().max(100),
        path: z.string().max(240),
      }),
    )
    .max(200),
});
const revokeSchema = z.object({
  supportRef: z.string().max(300),
  confirmation: z.string().max(40),
  reason: z.string().trim().min(10).max(200),
});
const publishSchema = z.object({
  manifest: manifestSchema,
  confirmation: z.string().max(40),
});

function sendAdminError(reply: FastifyReply, error: unknown) {
  if (error instanceof AdminAccessError)
    return reply.code(error.status).send({ error: error.code });
  throw error;
}

async function credentials(request: FastifyRequest, auth: AuthService) {
  const token = request.cookies[SESSION_COOKIE];
  const session = token ? await auth.getSession(token) : null;
  const stepUp = request.headers["x-admin-step-up"];
  return {
    accountId: session?.accountId ?? null,
    stepUp: typeof stepUp === "string" ? stepUp : "",
    requestId: request.id,
  };
}

export function registerAdminRoutes(
  app: FastifyInstance,
  auth: AuthService,
  admin: AdminService,
) {
  app.get("/api/admin/me", async (request, reply) => {
    try {
      return await admin.identity(await credentials(request, auth));
    } catch (error) {
      return sendAdminError(reply, error);
    }
  });

  app.get("/api/admin/profiles", async (request, reply) => {
    const query = z
      .object({ displayName: z.string().trim().min(2).max(40) })
      .safeParse(request.query);
    if (!query.success)
      return reply.code(400).send({ error: "invalid_request" });
    try {
      const profile = await admin.profile(
        await credentials(request, auth),
        query.data.displayName,
      );
      if (!profile)
        return await reply.code(404).send({ error: "profile_not_found" });
      return profile;
    } catch (error) {
      return sendAdminError(reply, error);
    }
  });

  app.post("/api/admin/sessions/revoke", async (request, reply) => {
    const input = revokeSchema.safeParse(request.body);
    if (!input.success)
      return reply.code(400).send({ error: "invalid_request" });
    try {
      return await admin.revokeSessions(
        await credentials(request, auth),
        input.data.supportRef,
        input.data.confirmation,
        input.data.reason,
      );
    } catch (error) {
      return sendAdminError(reply, error);
    }
  });

  app.post("/api/admin/content/validate", async (request, reply) => {
    const input = manifestSchema.safeParse(request.body);
    if (!input.success)
      return reply.code(400).send({ error: "invalid_request" });
    try {
      return await admin.validateContent(
        await credentials(request, auth),
        input.data,
      );
    } catch (error) {
      return sendAdminError(reply, error);
    }
  });

  app.post("/api/admin/content/publish", async (request, reply) => {
    const input = publishSchema.safeParse(request.body);
    if (!input.success)
      return reply.code(400).send({ error: "invalid_request" });
    try {
      return await admin.publishContent(
        await credentials(request, auth),
        input.data.manifest,
        input.data.confirmation,
      );
    } catch (error) {
      return sendAdminError(reply, error);
    }
  });

  app.get("/api/admin/audits", async (request, reply) => {
    const query = z
      .object({ limit: z.coerce.number().int().min(1).max(100).default(25) })
      .safeParse(request.query);
    if (!query.success)
      return reply.code(400).send({ error: "invalid_request" });
    try {
      return {
        audits: await admin.audits(
          await credentials(request, auth),
          query.data.limit,
        ),
      };
    } catch (error) {
      return sendAdminError(reply, error);
    }
  });
}
