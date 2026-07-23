import { describe, expect, it } from "vitest";
import { QuestService } from "../apps/server/src/quests/quest-service.js";
import type { GameplayEvent } from "../packages/quest-domain/src/index.js";

class MemoryQuestDatabase {
  progress:
    | {
        id: string;
        ownerId: string;
        questId: string;
        definitionVersion: number;
        status: string;
        progress: Record<string, number>;
      }
    | undefined;
  readonly receipts = new Map<string, { eventId: string }>();
  readonly rewards = new Map<string, { id: string }>();
  readonly inventory = new Map<
    string,
    { id: string; accountId: string; itemId: string; quantity: number }
  >();

  readonly questEventReceipt = {
    findUnique: ({
      where,
    }: {
      where: { ownerId_eventId: { eventId: string } };
    }) =>
      Promise.resolve(this.receipts.get(where.ownerId_eventId.eventId) ?? null),
    create: ({ data }: { data: { eventId: string } }) => {
      const receipt = { eventId: data.eventId };
      this.receipts.set(data.eventId, receipt);
      return Promise.resolve(receipt);
    },
  };

  readonly questProgress = {
    findUnique: () => Promise.resolve(this.progress ?? null),
    upsert: ({
      create,
      update,
    }: {
      create: Omit<NonNullable<MemoryQuestDatabase["progress"]>, "id">;
      update: Partial<NonNullable<MemoryQuestDatabase["progress"]>>;
    }) => {
      if (!this.progress)
        this.progress = {
          id: "progress-1",
          ...create,
          progress: { ...create.progress },
        };
      else
        this.progress = {
          ...this.progress,
          ...update,
          progress: update.progress
            ? { ...update.progress }
            : this.progress.progress,
        };
      return Promise.resolve(this.progress);
    },
    update: ({ data }: { data: { status: string } }) => {
      if (!this.progress) throw new Error("missing_progress");
      this.progress = { ...this.progress, status: data.status };
      return Promise.resolve(this.progress);
    },
  };

  readonly questRewardClaim = {
    findUnique: () =>
      Promise.resolve(this.rewards.get("quest:first-expedition") ?? null),
    create: () => {
      const reward = { id: "reward-1" };
      this.rewards.set("quest:first-expedition", reward);
      return Promise.resolve(reward);
    },
  };

  readonly inventoryStack = {
    findUnique: ({
      where,
    }: {
      where: { accountId_itemId: { itemId: string } };
    }) =>
      Promise.resolve(
        this.inventory.get(where.accountId_itemId.itemId) ?? null,
      ),
    count: () => Promise.resolve(this.inventory.size),
    upsert: ({
      create,
      update,
    }: {
      create: {
        accountId: string;
        itemId: string;
        quantity: number;
      };
      update: { quantity: { increment: number } };
    }) => {
      const current = this.inventory.get(create.itemId);
      const stack = current
        ? {
            ...current,
            quantity: current.quantity + update.quantity.increment,
          }
        : { id: "stack-1", ...create };
      this.inventory.set(create.itemId, stack);
      return Promise.resolve(stack);
    },
  };

  $transaction<T>(
    operation: (transaction: MemoryQuestDatabase) => Promise<T>,
  ): Promise<T> {
    return operation(this);
  }
}

function event(
  id: string,
  type: GameplayEvent["type"],
  attributes: Record<string, string> = {},
): GameplayEvent {
  return {
    id,
    type,
    occurredAt: "2026-07-23T00:00:00.000Z",
    attributes,
  };
}

describe("persistent quest service", () => {
  it("deduplicates retries and restores progress after reconnect", async () => {
    const database = new MemoryQuestDatabase();
    const quests = new QuestService(database as never);
    const visit = event("zone-visited:meadow", "world.zone_entered", {
      zoneId: "meadow",
    });
    await quests.publish("owner", visit);
    await quests.publish("owner", visit);

    const restored = new QuestService(database as never);
    const [entry] = await restored.journal("owner");
    expect(entry?.objectives.find(({ id }) => id === "visit-meadow")).toEqual({
      id: "visit-meadow",
      current: 1,
      required: 1,
    });
    expect(database.receipts.size).toBe(1);
  });

  it("grants the completion reward exactly once", async () => {
    const database = new MemoryQuestDatabase();
    const quests = new QuestService(database as never);
    await quests.publish(
      "owner",
      event("zone", "world.zone_entered", { zoneId: "meadow" }),
    );
    await quests.publish(
      "owner",
      event("talk", "interaction.completed", {
        interactionId: "npc:caretaker",
      }),
    );
    await quests.publish(
      "owner",
      event("battle", "battle.finished", { outcome: "player_win" }),
    );
    const captured = event("capture", "creature.captured");
    await quests.publish("owner", captured);
    await quests.publish("owner", captured);
    expect(await quests.claim("owner", "quest:first-expedition")).toBe(false);

    expect(database.inventory.get("item:field-tonic")?.quantity).toBe(3);
    expect(database.rewards.size).toBe(1);
    expect(database.progress?.status).toBe("claimed");
  });
});
