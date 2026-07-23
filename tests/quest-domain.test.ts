import {
  applyGameplayEvent,
  createQuestState,
  migrateQuestState,
  type GameplayEvent,
  type QuestDefinition,
} from "../packages/quest-domain/src/index.js";
import { describe, expect, it } from "vitest";

const quest: QuestDefinition = {
  id: "quest:first-expedition",
  version: 1,
  title: "Primeira expedição",
  objectives: [
    {
      id: "visit",
      eventType: "world.zone_entered",
      requiredCount: 1,
      filters: { zoneId: "meadow" },
    },
    {
      id: "capture",
      eventType: "creature.captured",
      requiredCount: 1,
    },
  ],
  reward: { itemId: "item:field-tonic", quantity: 3 },
};

const event = (
  id: string,
  type: GameplayEvent["type"],
  attributes: Record<string, string> = {},
): GameplayEvent => ({
  id,
  type,
  occurredAt: "2026-07-23T00:00:00.000Z",
  attributes,
});

describe("versioned quest state", () => {
  it("reacts only to matching public events and completes all objectives", () => {
    const initial = createQuestState(quest);
    expect(
      applyGameplayEvent(
        initial,
        quest,
        event("wrong", "world.zone_entered", { zoneId: "house" }),
      ),
    ).toEqual({ state: initial, changed: false, completedNow: false });
    const visited = applyGameplayEvent(
      initial,
      quest,
      event("visit", "world.zone_entered", { zoneId: "meadow" }),
    );
    expect(visited.state.progress.visit).toBe(1);
    expect(visited.state.status).toBe("active");
    const captured = applyGameplayEvent(
      visited.state,
      quest,
      event("capture", "creature.captured"),
    );
    expect(captured).toMatchObject({
      changed: true,
      completedNow: true,
      state: { status: "completed" },
    });
  });

  it("preserves compatible progress through an explicit content migration", () => {
    const visited = applyGameplayEvent(
      createQuestState(quest),
      quest,
      event("visit", "world.zone_entered", { zoneId: "meadow" }),
    ).state;
    const next: QuestDefinition = {
      ...quest,
      version: 2,
      objectives: [
        ...quest.objectives,
        {
          id: "battle",
          eventType: "battle.finished",
          requiredCount: 1,
        },
      ],
    };
    expect(migrateQuestState(visited, quest, next)).toEqual({
      questId: quest.id,
      definitionVersion: 2,
      status: "active",
      progress: { visit: 1, capture: 0, battle: 0 },
    });
  });

  it("rejects implicit version drift", () => {
    const state = createQuestState(quest);
    expect(() =>
      applyGameplayEvent(
        state,
        { ...quest, version: 2 },
        event("event", "creature.captured"),
      ),
    ).toThrow("quest_version_mismatch");
  });
});
