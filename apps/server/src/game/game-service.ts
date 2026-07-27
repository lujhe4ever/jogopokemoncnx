import type { QuestJournalEntry } from "../quests/quest-service.js";
import {
  STARTER_OPTIONS,
  creatureName,
  isStarterDefinition,
  itemName,
} from "./catalog.js";
import type { GameRepository } from "./contracts.js";

export interface QuestJournalReader {
  journal(ownerId: string): Promise<QuestJournalEntry[]>;
}

export class GameStateError extends Error {
  constructor(
    readonly code:
      | "profile_not_found"
      | "invalid_starter"
      | "starter_already_selected"
      | "invalid_team",
    readonly status: 400 | 404 | 409,
  ) {
    super(code);
  }
}

export class GameService {
  constructor(
    private readonly repository: GameRepository,
    private readonly quests: QuestJournalReader,
  ) {}

  async state(ownerId: string) {
    const [snapshot, quests] = await Promise.all([
      this.repository.snapshot(ownerId),
      this.quests.journal(ownerId),
    ]);
    if (!snapshot) throw new GameStateError("profile_not_found", 404);
    return {
      profile: snapshot.profile,
      checkpoint: snapshot.checkpoint,
      starterOptions: STARTER_OPTIONS,
      inventory: snapshot.inventory.map((stack) => ({
        ...stack,
        name: itemName(stack.itemId),
      })),
      creatures: snapshot.creatures.map((creature) => ({
        ...creature,
        name: creatureName(creature.definitionId),
      })),
      quests,
    };
  }

  async chooseStarter(ownerId: string, definitionId: string) {
    if (!isStarterDefinition(definitionId))
      throw new GameStateError("invalid_starter", 400);
    const result = await this.repository.chooseStarter(ownerId, definitionId);
    if (result.status === "conflict")
      throw new GameStateError("starter_already_selected", 409);
    return result;
  }

  async setTeam(ownerId: string, creatureIds: readonly string[]) {
    if (
      creatureIds.length === 0 ||
      !(await this.repository.setTeam(ownerId, creatureIds))
    )
      throw new GameStateError("invalid_team", 400);
    return { updated: true };
  }
}
