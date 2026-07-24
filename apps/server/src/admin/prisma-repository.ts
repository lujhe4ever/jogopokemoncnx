import type { AdminContentManifest, AdminRole } from "@lt/admin-domain";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { AdminAuditInput, AdminRepository } from "./contracts.js";

function auditData(input: AdminAuditInput) {
  return {
    actorId: input.actorId,
    action: input.action,
    permission: input.permission,
    outcome: input.outcome,
    requestId: input.requestId,
    targetType: input.targetType ?? null,
    targetRef: input.targetRef ?? null,
    reason: input.reason ?? null,
    ...(input.metadata
      ? { metadata: input.metadata as Prisma.InputJsonValue }
      : {}),
  };
}

export class PrismaAdminRepository implements AdminRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async role(accountId: string): Promise<AdminRole | null> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { adminRole: true },
    });
    return account?.adminRole ?? null;
  }

  async supportProfile(displayName: string) {
    const accounts = await this.prisma.account.findMany({
      where: {
        profile: {
          displayName: { equals: displayName, mode: "insensitive" },
        },
      },
      take: 2,
      select: {
        id: true,
        profile: { select: { displayName: true } },
        checkpoint: { select: { zoneId: true, updatedAt: true } },
        _count: {
          select: {
            creatures: true,
            inventory: true,
            questProgress: true,
          },
        },
      },
    });
    if (accounts.length !== 1) return null;
    const account = accounts[0];
    if (!account) return null;
    const activeSessionCount = await this.prisma.session.count({
      where: {
        accountId: account.id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    return {
      accountId: account.id,
      displayName: account.profile?.displayName ?? "",
      zoneId: account.checkpoint?.zoneId ?? null,
      checkpointUpdatedAt: account.checkpoint?.updatedAt ?? null,
      creatureCount: account._count.creatures,
      inventoryStackCount: account._count.inventory,
      questCount: account._count.questProgress,
      activeSessionCount,
    };
  }

  async audit(input: AdminAuditInput): Promise<void> {
    await this.prisma.adminAudit.create({ data: auditData(input) });
  }

  revokeSessionsAndAudit(
    targetAccountId: string,
    now: Date,
    audit: AdminAuditInput,
  ): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.session.updateMany({
        where: { accountId: targetAccountId, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.adminAudit.create({ data: auditData(audit) });
      return result.count;
    });
  }

  publishContentAndAudit(
    manifest: AdminContentManifest,
    actorId: string,
    audit: AdminAuditInput,
  ): Promise<"published" | "existing" | "conflict"> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.contentRelease.findUnique({
        where: {
          packId_version: {
            packId: manifest.packId,
            version: manifest.version,
          },
        },
      });
      const result =
        existing?.checksum === manifest.checksum
          ? "existing"
          : existing
            ? "conflict"
            : "published";
      if (!existing)
        await tx.contentRelease.create({
          data: {
            packId: manifest.packId,
            version: manifest.version,
            checksum: manifest.checksum,
            license: manifest.license,
            manifest: manifest as unknown as Prisma.InputJsonValue,
            publisherId: actorId,
          },
        });
      await tx.adminAudit.create({
        data: auditData({
          ...audit,
          outcome: result === "conflict" ? "denied" : "allowed",
        }),
      });
      return result;
    });
  }

  recentAudits(limit: number) {
    return this.prisma.adminAudit.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        action: true,
        permission: true,
        outcome: true,
        requestId: true,
        targetType: true,
        targetRef: true,
        reason: true,
        createdAt: true,
      },
    });
  }
}
