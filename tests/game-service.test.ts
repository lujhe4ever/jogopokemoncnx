import { describe, expect, it } from "vitest";
import type {
  GameRepository,
  GameSnapshot,
  StarterSelection,
} from "../apps/server/src/game/contracts.js";
import {
  GameService,
  type QuestJournalReader,
} from "../apps/server/src/game/game-service.js";

class MemoryGameRepository implements GameRepository {
  snapshotValue: GameSnapshot = {
    profile: { displayName: "Lia", starterDefinitionId: null },
    checkpoint: null,
    inventory: [{ itemId: "item:capture-orb", quantity: 2 }],
    creatures: [],
  };

  snapshot(): Promise<GameSnapshot> {
    return Promise.resolve(structuredClone(this.snapshotValue));
  }

  chooseStarter(
    _ownerId: string,
    definitionId: string,
  ): Promise<StarterSelection> {
    const selected = this.snapshotValue.profile.starterDefinitionId;
    if (selected)
      return Promise.resolve(
        selected === definitionId
          ? {
              status: "existing",
              definitionId,
              creatureId: "starter-1",
            }
          : { status: "conflict", definitionId: selected },
      );
    this.snapshotValue.profile.starterDefinitionId = definitionId;
    this.snapshotValue.creatures.push({
      id: "starter-1",
      definitionId,
      experience: 0,
      level: 1,
      teamSlot: 1,
    });
    return Promise.resolve({
      status: "selected",
      definitionId,
      creatureId: "starter-1",
    });
  }

  setTeam(_ownerId: string, creatureIds: readonly string[]): Promise<boolean> {
    if (
      creatureIds.length > 6 ||
      new Set(creatureIds).size !== creatureIds.length ||
      creatureIds.some(
        (id) =>
          !this.snapshotValue.creatures.some((creature) => creature.id === id),
      )
    )
      return Promise.resolve(false);
    this.snapshotValue.creatures.forEach((creature) => {
      const index = creatureIds.indexOf(creature.id);
      creature.teamSlot = index === -1 ? null : index + 1;
    });
    return Promise.resolve(true);
  }
}

const quests: QuestJournalReader = {
  journal: () =>
    Promise.resolve([
      {
        questId: "quest:first-expedition",
        definitionVersion: 1,
        title: "Primeira expedição",
        status: "active",
        progress: { "visit-meadow": 0 },
        objectives: [{ id: "visit-meadow", current: 0, required: 1 }],
        reward: { itemId: "item:field-tonic", quantity: 3 },
      },
    ]),
};

describe("vertical slice game service", () => {
  it("selects one original starter idempotently and rejects replacement", async () => {
    const repository = new MemoryGameRepository();
    const game = new GameService(repository, quests);

    await expect(
      game.chooseStarter("owner", "creature:mosscalf"),
    ).resolves.toEqual({
      status: "selected",
      definitionId: "creature:mosscalf",
      creatureId: "starter-1",
    });
    await expect(
      game.chooseStarter("owner", "creature:mosscalf"),
    ).resolves.toMatchObject({ status: "existing" });
    await expect(
      game.chooseStarter("owner", "creature:tidefin"),
    ).rejects.toMatchObject({
      code: "starter_already_selected",
      status: 409,
    });
    await expect(
      game.chooseStarter("owner", "creature:unknown"),
    ).rejects.toMatchObject({ code: "invalid_starter", status: 400 });
  });

  it("returns a minimized labeled projection and validates team ownership", async () => {
    const repository = new MemoryGameRepository();
    const game = new GameService(repository, quests);
    await game.chooseStarter("owner", "creature:emberbud");

    await expect(game.state("owner")).resolves.toMatchObject({
      profile: {
        displayName: "Lia",
        starterDefinitionId: "creature:emberbud",
      },
      inventory: [
        {
          itemId: "item:capture-orb",
          name: "Orbe de captura",
          quantity: 2,
        },
      ],
      creatures: [
        {
          id: "starter-1",
          definitionId: "creature:emberbud",
          name: "Broto Âmbar",
          teamSlot: 1,
        },
      ],
      quests: [{ questId: "quest:first-expedition" }],
    });
    await expect(game.setTeam("owner", ["starter-1"])).resolves.toEqual({
      updated: true,
    });
    await expect(game.setTeam("owner", ["foreign"])).rejects.toMatchObject({
      code: "invalid_team",
      status: 400,
    });
    await expect(game.setTeam("owner", [])).rejects.toMatchObject({
      code: "invalid_team",
      status: 400,
    });
  });
});
