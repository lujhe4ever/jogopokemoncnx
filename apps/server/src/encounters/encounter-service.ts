import {
  evaluateCapture,
  planCaptureAttempt,
  seededCaptureRandom,
} from "@lt/encounter-domain";
import { Prisma, type PrismaClient } from "@prisma/client";
import { randomInt, randomUUID } from "node:crypto";
import type { BattleService } from "../battles/battle-service.js";
import {
  noopGameplayEvents,
  type GameplayEventSink,
} from "../events/gameplay-events.js";

export interface EncounterView {
  id: string;
  battleId: string;
  definitionId: string;
  status: "battling" | "captured" | "escaped";
  captureSucceeded?: boolean;
  capturedCreatureId?: string;
}

export type CaptureResult =
  | (EncounterView & { result: "captured" | "escaped"; replayed: boolean })
  | {
      id: string;
      battleId: string;
      definitionId: string;
      status: "battling";
      result: "battle_required" | "item_required";
      replayed: false;
    };

const DEFINITION_ID = "creature:nightleaf";
const CAPTURE_ITEM_ID = "item:capture-orb";

export class EncounterService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly battles: BattleService,
    private readonly id: () => string = randomUUID,
    private readonly seed: () => number = () => randomInt(1, 2_147_483_647),
    private readonly events: GameplayEventSink = noopGameplayEvents,
  ) {}

  async start(ownerId: string, zoneId: string): Promise<EncounterView> {
    const existing = await this.prisma.encounterRecord.findFirst({
      where: { ownerId, status: "battling" },
      orderBy: { createdAt: "desc" },
    });
    if (existing) return this.view(existing);
    const battle = await this.battles.start(ownerId);
    const encounter = await this.prisma.encounterRecord.create({
      data: {
        id: this.id(),
        ownerId,
        zoneId,
        definitionId: DEFINITION_ID,
        definitionVersion: 1,
        catalogVersion: 1,
        seed: this.seed(),
        battleId: battle.id,
      },
    });
    return this.view(encounter);
  }

  async capture(
    ownerId: string,
    encounterId: string,
    requestId: string,
  ): Promise<CaptureResult | null> {
    try {
      const result: CaptureResult | null = await this.prisma.$transaction(
        async (transaction) => {
          const encounter = await transaction.encounterRecord.findFirst({
            where: { id: encounterId, ownerId },
            include: { battle: true },
          });
          if (!encounter) return null;
          if (encounter.status !== "battling") {
            return {
              ...this.view(encounter),
              result: encounter.status === "captured" ? "captured" : "escaped",
              replayed: true,
            };
          }
          if (encounter.battle.outcome !== "player_win") {
            return {
              ...this.view(encounter),
              status: "battling",
              result: "battle_required",
              replayed: false,
            };
          }
          const item = await transaction.inventoryStack.findUnique({
            where: {
              accountId_itemId: {
                accountId: ownerId,
                itemId: CAPTURE_ITEM_ID,
              },
            },
          });
          const evaluation = evaluateCapture({
            battleOutcome: encounter.battle.outcome,
            targetHealth: 0,
            targetMaxHealth: 42,
            captureItemId: CAPTURE_ITEM_ID,
          });
          const attempt = planCaptureAttempt(
            {
              status: "pending",
              itemQuantity: item?.quantity ?? 0,
            },
            evaluation,
            seededCaptureRandom(encounter.seed),
          );
          if (attempt.status === "pending") {
            return {
              ...this.view(encounter),
              status: "battling",
              result:
                attempt.reason === "item_required"
                  ? "item_required"
                  : "battle_required",
              replayed: false,
            };
          }
          if (!item) throw new Error("capture_item_state_mismatch");
          if (attempt.itemQuantity === 0) {
            await transaction.inventoryStack.delete({ where: { id: item.id } });
          } else {
            await transaction.inventoryStack.update({
              where: { id: item.id },
              data: { quantity: attempt.itemQuantity },
            });
          }
          const creature = attempt.createCreature
            ? await transaction.creature.create({
                data: {
                  ownerId,
                  definitionId: encounter.definitionId,
                  definitionVersion: encounter.definitionVersion,
                  catalogVersion: encounter.catalogVersion,
                },
              })
            : null;
          const completed = await transaction.encounterRecord.update({
            where: { id: encounter.id },
            data: {
              status: attempt.status,
              captureRequestId: requestId,
              captureSucceeded: attempt.status === "captured",
              ...(creature ? { capturedCreatureId: creature.id } : {}),
              completedAt: new Date(),
            },
          });
          return {
            ...this.view(completed),
            result: attempt.status,
            replayed: false,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      await this.publishCapture(ownerId, result);
      return result;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2002" || error.code === "P2034")
      ) {
        const encounter = await this.prisma.encounterRecord.findFirst({
          where: { id: encounterId, ownerId },
        });
        if (encounter && encounter.status !== "battling") {
          const result: CaptureResult = {
            ...this.view(encounter),
            result: encounter.status === "captured" ? "captured" : "escaped",
            replayed: true,
          };
          await this.publishCapture(ownerId, result);
          return result;
        }
      }
      throw error;
    }
  }

  async returnToWorld(
    ownerId: string,
    encounterId: string,
  ): Promise<EncounterView | null> {
    const encounter = await this.prisma.encounterRecord.findFirst({
      where: { id: encounterId, ownerId },
    });
    if (!encounter) return null;
    if (encounter.status !== "battling") return this.view(encounter);
    await this.battles.abandon(ownerId, encounter.battleId, "disconnect");
    const completed = await this.prisma.encounterRecord.update({
      where: { id: encounter.id },
      data: {
        status: "escaped",
        captureSucceeded: false,
        completedAt: new Date(),
      },
    });
    return this.view(completed);
  }

  private view(record: {
    id: string;
    battleId: string;
    definitionId: string;
    status: string;
    captureSucceeded: boolean | null;
    capturedCreatureId: string | null;
  }): EncounterView {
    const status =
      record.status === "captured"
        ? "captured"
        : record.status === "escaped"
          ? "escaped"
          : "battling";
    return {
      id: record.id,
      battleId: record.battleId,
      definitionId: record.definitionId,
      status,
      ...(record.captureSucceeded === null
        ? {}
        : { captureSucceeded: record.captureSucceeded }),
      ...(record.capturedCreatureId
        ? { capturedCreatureId: record.capturedCreatureId }
        : {}),
    };
  }

  private async publishCapture(
    ownerId: string,
    result: CaptureResult | null,
  ): Promise<void> {
    if (!result || result.result !== "captured") return;
    await this.events.publish(ownerId, {
      id: `creature-captured:${result.id}`,
      type: "creature.captured",
      occurredAt: new Date().toISOString(),
      attributes: { definitionId: result.definitionId },
    });
  }
}
