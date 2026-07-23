import {
  applyExperience,
  validateTeam,
  type CreatureCatalog,
  type CreatureInstance,
} from "@lt/creature-domain";
import { Prisma, type Creature, type PrismaClient } from "@prisma/client";

export interface TrainingResult {
  instance: CreatureInstance;
  applied: boolean;
  evolved: boolean;
}

function toDomain(creature: Creature): CreatureInstance {
  return {
    id: creature.id,
    ownerId: creature.ownerId,
    definitionId: creature.definitionId,
    definitionVersion: creature.definitionVersion,
    catalogVersion: creature.catalogVersion,
    experience: creature.experience,
    level: creature.level,
  };
}

export class PrismaCreatureStore {
  constructor(private readonly prisma: PrismaClient) {}

  async collection(ownerId: string): Promise<CreatureInstance[]> {
    return (
      await this.prisma.creature.findMany({
        where: { ownerId },
        orderBy: [{ teamSlot: "asc" }, { createdAt: "asc" }],
      })
    ).map(toDomain);
  }

  async train(
    ownerId: string,
    creatureId: string,
    requestId: string,
    amount: number,
    catalog: CreatureCatalog,
  ): Promise<TrainingResult> {
    try {
      return await this.prisma.$transaction(
        async (transaction) => {
          const previousEvent =
            await transaction.creatureProgressionEvent.findUnique({
              where: { ownerId_requestId: { ownerId, requestId } },
            });
          const creature = await transaction.creature.findFirst({
            where: { id: creatureId, ownerId },
          });
          if (!creature) throw new Error("creature_not_owned");
          if (previousEvent)
            return {
              instance: toDomain(creature),
              applied: false,
              evolved: false,
            };

          const progression = applyExperience(
            toDomain(creature),
            amount,
            catalog,
          );
          const updated = await transaction.creature.update({
            where: { id: creature.id },
            data: {
              definitionId: progression.instance.definitionId,
              definitionVersion: progression.instance.definitionVersion,
              catalogVersion: progression.instance.catalogVersion,
              experience: progression.instance.experience,
              level: progression.instance.level,
            },
          });
          await transaction.creatureProgressionEvent.create({
            data: { ownerId, creatureId, requestId, amount },
          });
          return {
            instance: toDomain(updated),
            applied: true,
            evolved: progression.evolved,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2002" || error.code === "P2034")
      ) {
        const event = await this.prisma.creatureProgressionEvent.findUnique({
          where: { ownerId_requestId: { ownerId, requestId } },
          include: { creature: true },
        });
        if (event)
          return {
            instance: toDomain(event.creature),
            applied: false,
            evolved: false,
          };
      }
      throw error;
    }
  }

  async setTeam(ownerId: string, teamIds: readonly string[]): Promise<void> {
    await this.prisma.$transaction(
      async (transaction) => {
        const collection = (
          await transaction.creature.findMany({ where: { ownerId } })
        ).map(toDomain);
        if (!validateTeam(ownerId, collection, teamIds))
          throw new Error("invalid_team");
        await transaction.creature.updateMany({
          where: { ownerId },
          data: { teamSlot: null },
        });
        await Promise.all(
          teamIds.map((id, index) =>
            transaction.creature.update({
              where: { id },
              data: { teamSlot: index + 1 },
            }),
          ),
        );
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
