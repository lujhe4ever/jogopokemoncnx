import {
  applyGameplayEvent,
  createQuestState,
  type GameplayEvent,
  type QuestDefinition,
  type QuestState,
} from "@lt/quest-domain";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { GameplayEventSink } from "../events/gameplay-events.js";
import { FIRST_EXPEDITION } from "./catalog.js";

export interface QuestJournalEntry extends QuestState {
  title: string;
  objectives: Array<{
    id: string;
    current: number;
    required: number;
  }>;
  reward: { itemId: string; quantity: number };
}

function progressFrom(value: Prisma.JsonValue): Record<string, number> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("invalid_quest_progress");
  const progress: Record<string, number> = {};
  for (const [key, count] of Object.entries(value)) {
    if (typeof count !== "number" || !Number.isInteger(count) || count < 0)
      throw new Error("invalid_quest_progress");
    progress[key] = count;
  }
  return progress;
}

export class QuestService implements GameplayEventSink {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly definition: QuestDefinition = FIRST_EXPEDITION,
  ) {}

  async publish(ownerId: string, event: GameplayEvent): Promise<void> {
    try {
      await this.prisma.$transaction(
        async (transaction) => {
          const receipt = await transaction.questEventReceipt.findUnique({
            where: {
              ownerId_eventId: { ownerId, eventId: event.id },
            },
          });
          if (receipt) return;
          const persisted = await transaction.questProgress.findUnique({
            where: {
              ownerId_questId: {
                ownerId,
                questId: this.definition.id,
              },
            },
          });
          const state: QuestState = persisted
            ? {
                questId: persisted.questId,
                definitionVersion: persisted.definitionVersion,
                status: persisted.status as QuestState["status"],
                progress: progressFrom(persisted.progress),
              }
            : createQuestState(this.definition);
          if (state.definitionVersion !== this.definition.version)
            throw new Error("quest_migration_required");
          const transition = applyGameplayEvent(state, this.definition, event);
          await transaction.questEventReceipt.create({
            data: {
              ownerId,
              eventId: event.id,
              eventType: event.type,
              occurredAt: new Date(event.occurredAt),
            },
          });
          await transaction.questProgress.upsert({
            where: {
              ownerId_questId: {
                ownerId,
                questId: this.definition.id,
              },
            },
            create: {
              ownerId,
              questId: transition.state.questId,
              definitionVersion: transition.state.definitionVersion,
              status: transition.state.status,
              progress: { ...transition.state.progress },
            },
            update: {
              status: transition.state.status,
              progress: { ...transition.state.progress },
            },
          });
          if (transition.state.status === "completed")
            await this.claimWithin(transaction, ownerId);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        Array.isArray(error.meta?.target) &&
        error.meta.target.includes("eventId")
      )
        return;
      throw error;
    }
  }

  async journal(ownerId: string): Promise<QuestJournalEntry[]> {
    const initial = createQuestState(this.definition);
    const progress = await this.prisma.questProgress.upsert({
      where: {
        ownerId_questId: { ownerId, questId: this.definition.id },
      },
      create: {
        ownerId,
        questId: initial.questId,
        definitionVersion: initial.definitionVersion,
        status: initial.status,
        progress: { ...initial.progress },
      },
      update: {},
    });
    const state: QuestState = {
      questId: progress.questId,
      definitionVersion: progress.definitionVersion,
      status: progress.status as QuestState["status"],
      progress: progressFrom(progress.progress),
    };
    if (state.definitionVersion !== this.definition.version)
      throw new Error("quest_migration_required");
    return [this.entry(state)];
  }

  async claim(ownerId: string, questId: string): Promise<boolean> {
    if (questId !== this.definition.id) return false;
    return this.prisma.$transaction(
      (transaction) => this.claimWithin(transaction, ownerId),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async claimWithin(
    transaction: Prisma.TransactionClient,
    ownerId: string,
  ): Promise<boolean> {
    const progress = await transaction.questProgress.findUnique({
      where: {
        ownerId_questId: { ownerId, questId: this.definition.id },
      },
    });
    if (!progress || progress.status === "active") return false;
    const existing = await transaction.questRewardClaim.findUnique({
      where: {
        ownerId_questId_definitionVersion: {
          ownerId,
          questId: this.definition.id,
          definitionVersion: this.definition.version,
        },
      },
    });
    if (existing) return false;
    const stack = await transaction.inventoryStack.findUnique({
      where: {
        accountId_itemId: {
          accountId: ownerId,
          itemId: this.definition.reward.itemId,
        },
      },
    });
    const slots = stack
      ? 0
      : await transaction.inventoryStack.count({
          where: { accountId: ownerId },
        });
    if (
      (stack && stack.quantity + this.definition.reward.quantity > 99) ||
      (!stack && slots >= 20)
    )
      return false;
    await transaction.inventoryStack.upsert({
      where: {
        accountId_itemId: {
          accountId: ownerId,
          itemId: this.definition.reward.itemId,
        },
      },
      create: {
        accountId: ownerId,
        itemId: this.definition.reward.itemId,
        quantity: this.definition.reward.quantity,
      },
      update: {
        quantity: { increment: this.definition.reward.quantity },
      },
    });
    await transaction.questRewardClaim.create({
      data: {
        ownerId,
        questId: this.definition.id,
        definitionVersion: this.definition.version,
      },
    });
    await transaction.questProgress.update({
      where: { id: progress.id },
      data: { status: "claimed" },
    });
    return true;
  }

  private entry(state: QuestState): QuestJournalEntry {
    return {
      ...state,
      title: this.definition.title,
      objectives: this.definition.objectives.map((objective) => ({
        id: objective.id,
        current: state.progress[objective.id] ?? 0,
        required: objective.requiredCount,
      })),
      reward: this.definition.reward,
    };
  }
}
