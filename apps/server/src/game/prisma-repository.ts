import { validateTeam, type CreatureInstance } from "@lt/creature-domain";
import { Prisma, type PrismaClient } from "@prisma/client";
import type {
  GameRepository,
  GameSnapshot,
  StarterSelection,
} from "./contracts.js";

export class PrismaGameRepository implements GameRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async snapshot(ownerId: string): Promise<GameSnapshot | null> {
    const account = await this.prisma.account.findUnique({
      where: { id: ownerId },
      select: {
        profile: {
          select: {
            displayName: true,
            starterDefinitionId: true,
          },
        },
        checkpoint: {
          select: { zoneId: true, x: true, y: true },
        },
        inventory: {
          orderBy: { itemId: "asc" },
          select: { itemId: true, quantity: true },
        },
        creatures: {
          orderBy: [{ teamSlot: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            definitionId: true,
            level: true,
            experience: true,
            teamSlot: true,
          },
        },
      },
    });
    if (!account?.profile) return null;
    return {
      profile: account.profile,
      checkpoint: account.checkpoint,
      inventory: account.inventory,
      creatures: account.creatures,
    };
  }

  async chooseStarter(
    ownerId: string,
    definitionId: string,
  ): Promise<StarterSelection> {
    return this.prisma.$transaction(
      async (transaction) => {
        const profile = await transaction.profile.findUnique({
          where: { accountId: ownerId },
          select: { starterDefinitionId: true },
        });
        if (!profile) throw new Error("profile_not_found");
        if (profile.starterDefinitionId) {
          const creature = await transaction.creature.findFirst({
            where: {
              ownerId,
              definitionId: profile.starterDefinitionId,
            },
            orderBy: { createdAt: "asc" },
            select: { id: true },
          });
          return profile.starterDefinitionId === definitionId && creature
            ? {
                status: "existing",
                definitionId,
                creatureId: creature.id,
              }
            : {
                status: "conflict",
                definitionId: profile.starterDefinitionId,
              };
        }

        const reserved = await transaction.profile.updateMany({
          where: { accountId: ownerId, starterDefinitionId: null },
          data: { starterDefinitionId: definitionId },
        });
        if (reserved.count !== 1) return { status: "conflict", definitionId };

        await transaction.creature.updateMany({
          where: { ownerId, teamSlot: 1 },
          data: { teamSlot: null },
        });
        const creature = await transaction.creature.create({
          data: {
            ownerId,
            definitionId,
            definitionVersion: 1,
            catalogVersion: 1,
            teamSlot: 1,
          },
          select: { id: true },
        });
        return {
          status: "selected",
          definitionId,
          creatureId: creature.id,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async setTeam(
    ownerId: string,
    creatureIds: readonly string[],
  ): Promise<boolean> {
    return this.prisma.$transaction(
      async (transaction) => {
        const collection = await transaction.creature.findMany({
          where: { ownerId },
        });
        const domain: CreatureInstance[] = collection.map((creature) => ({
          id: creature.id,
          ownerId: creature.ownerId,
          definitionId: creature.definitionId,
          definitionVersion: creature.definitionVersion,
          catalogVersion: creature.catalogVersion,
          experience: creature.experience,
          level: creature.level,
        }));
        if (!validateTeam(ownerId, domain, creatureIds)) return false;
        await transaction.creature.updateMany({
          where: { ownerId },
          data: { teamSlot: null },
        });
        for (const [index, id] of creatureIds.entries())
          await transaction.creature.update({
            where: { id },
            data: { teamSlot: index + 1 },
          });
        return true;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
