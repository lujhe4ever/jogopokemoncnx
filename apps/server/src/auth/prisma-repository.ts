import type { PrismaClient } from "@prisma/client";
import type { AuthRepository } from "./contracts.js";

export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createAccount(input: {
    email: string;
    passwordHash: string;
    displayName: string;
  }) {
    const account = await this.prisma.account.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        profile: { create: { displayName: input.displayName } },
      },
      include: { profile: true },
    });
    return {
      id: account.id,
      email: account.email,
      passwordHash: account.passwordHash,
      displayName: account.profile?.displayName ?? "",
    };
  }

  async findAccountByEmail(email: string) {
    const account = await this.prisma.account.findUnique({
      where: { email },
      include: { profile: true },
    });
    return account
      ? {
          id: account.id,
          email: account.email,
          passwordHash: account.passwordHash,
          displayName: account.profile?.displayName ?? "",
        }
      : null;
  }

  async createSession(accountId: string, tokenHash: string, expiresAt: Date) {
    await this.prisma.session.create({
      data: { accountId, tokenHash, expiresAt },
    });
  }

  async findActiveSession(tokenHash: string, now: Date) {
    const session = await this.prisma.session.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: now } },
      include: { account: { include: { profile: true } } },
    });
    return session
      ? {
          accountId: session.accountId,
          email: session.account.email,
          displayName: session.account.profile?.displayName ?? "",
        }
      : null;
  }

  async revokeSession(tokenHash: string, now: Date) {
    await this.prisma.session.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: now },
    });
  }

  async createTicket(accountId: string, tokenHash: string, expiresAt: Date) {
    await this.prisma.webSocketTicket.create({
      data: { accountId, tokenHash, expiresAt },
    });
  }

  async consumeTicket(tokenHash: string, now: Date) {
    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.webSocketTicket.findFirst({
        where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
      });
      if (!ticket) return null;
      const updated = await tx.webSocketTicket.updateMany({
        where: { id: ticket.id, usedAt: null },
        data: { usedAt: now },
      });
      return updated.count === 1 ? ticket.accountId : null;
    });
  }

  async audit(event: string, success: boolean, ipHash?: string) {
    await this.prisma.authAudit.create({
      data: { event, success, ipHash: ipHash ?? null },
    });
  }
}
