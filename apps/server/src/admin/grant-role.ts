import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const input = z
  .object({
    ADMIN_STEP_UP_SECRET: z.string().min(32),
    ADMIN_GRANT_ACCOUNT_ID: z.string().min(1),
    ADMIN_GRANT_ROLE: z.enum(["SUPPORT", "CONTENT_EDITOR", "OWNER"]),
  })
  .parse(process.env);

const prisma = new PrismaClient();
try {
  await prisma.$transaction(async (tx) => {
    await tx.account.update({
      where: { id: input.ADMIN_GRANT_ACCOUNT_ID },
      data: { adminRole: input.ADMIN_GRANT_ROLE },
    });
    await tx.adminAudit.create({
      data: {
        actorId: null,
        action: "admin.role.bootstrap",
        permission: "audit:read",
        outcome: "allowed",
        requestId: crypto.randomUUID(),
        targetType: "account",
        targetRef: createHash("sha256")
          .update(input.ADMIN_GRANT_ACCOUNT_ID)
          .digest("hex")
          .slice(0, 16),
        reason: `role:${input.ADMIN_GRANT_ROLE}`,
      },
    });
  });
  console.log("Administrative role granted and audited.");
} finally {
  await prisma.$disconnect();
}
