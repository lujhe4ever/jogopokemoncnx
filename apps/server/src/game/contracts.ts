export interface GameSnapshot {
  profile: {
    displayName: string;
    starterDefinitionId: string | null;
  };
  checkpoint: {
    zoneId: string;
    x: number;
    y: number;
  } | null;
  inventory: Array<{
    itemId: string;
    quantity: number;
  }>;
  creatures: Array<{
    id: string;
    definitionId: string;
    level: number;
    experience: number;
    teamSlot: number | null;
  }>;
}

export type StarterSelection =
  | {
      status: "selected" | "existing";
      definitionId: string;
      creatureId: string;
    }
  | {
      status: "conflict";
      definitionId: string;
    };

export interface GameRepository {
  snapshot(ownerId: string): Promise<GameSnapshot | null>;
  chooseStarter(
    ownerId: string,
    definitionId: string,
  ): Promise<StarterSelection>;
  setTeam(ownerId: string, creatureIds: readonly string[]): Promise<boolean>;
}
