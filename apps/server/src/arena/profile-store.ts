import type { PrismaClient } from "@prisma/client";

export interface ArenaProfileStore {
  displayName(accountId: string): Promise<string | null>;
}

export class PrismaArenaProfileStore implements ArenaProfileStore {
  constructor(private readonly prisma: PrismaClient) {}

  async displayName(accountId: string): Promise<string | null> {
    const profile = await this.prisma.profile.findUnique({
      where: { accountId },
      select: { displayName: true },
    });
    return profile?.displayName ?? null;
  }
}
