import {
  isSafePosition,
  simulateMovement,
  type MovementInput,
  type PlayerState,
  type WorldCollision,
} from "@lt/engine-core";

export const HOUSE_COLLISION: WorldCollision = {
  bounds: { x: 24, y: 24, width: 592, height: 352 },
  obstacles: [
    { x: 76, y: 70, width: 160, height: 70 },
    { x: 410, y: 70, width: 150, height: 54 },
    { x: 270, y: 250, width: 110, height: 72 },
  ],
};

export const SAFE_SPAWN: PlayerState = {
  x: 320,
  y: 200,
  lastProcessedSequence: 0,
};

export interface ZoneDefinition {
  id: string;
  packId: string;
  collision: WorldCollision;
  spawn: PlayerState;
  portals: readonly {
    id: string;
    targetZoneId: string;
    targetSpawn: PlayerState;
    trigger: { x: number; y: number; width: number; height: number };
  }[];
  interactions: readonly InteractionDefinition[];
}

export type InteractionDefinition =
  | {
      id: string;
      kind: "npc";
      x: number;
      y: number;
      radius: number;
      label: string;
      capability: "dialogue";
      dialogue: readonly string[];
    }
  | {
      id: string;
      kind: "pickup" | "chest";
      x: number;
      y: number;
      radius: number;
      label: string;
      capability: "reward";
      reward: { itemId: string; quantity: number };
      once: true;
    }
  | {
      id: string;
      kind: "encounter";
      x: number;
      y: number;
      radius: number;
      label: string;
      capability: "encounter";
      definitionId: string;
    };

const MEADOW_COLLISION: WorldCollision = {
  bounds: { x: 24, y: 24, width: 592, height: 352 },
  obstacles: [
    { x: 120, y: 90, width: 80, height: 52 },
    { x: 430, y: 220, width: 92, height: 64 },
  ],
};

export const ZONES: Readonly<Record<string, ZoneDefinition>> = {
  house: {
    id: "house",
    packId: "original-house",
    collision: HOUSE_COLLISION,
    spawn: SAFE_SPAWN,
    portals: [
      {
        id: "front-door",
        targetZoneId: "meadow",
        targetSpawn: { x: 320, y: 72, lastProcessedSequence: 0 },
        trigger: { x: 290, y: 342, width: 60, height: 34 },
      },
    ],
    interactions: [
      {
        id: "npc:caretaker",
        kind: "npc",
        x: 260,
        y: 190,
        radius: 48,
        label: "Cuidadora",
        capability: "dialogue",
        dialogue: [
          "Bem-vindo. A clareira fica depois da porta iluminada.",
          "Explore com calma e observe os objetos próximos.",
        ],
      },
    ],
  },
  meadow: {
    id: "meadow",
    packId: "original-meadow",
    collision: MEADOW_COLLISION,
    spawn: { x: 320, y: 72, lastProcessedSequence: 0 },
    portals: [
      {
        id: "house-door",
        targetZoneId: "house",
        targetSpawn: { x: 320, y: 320, lastProcessedSequence: 0 },
        trigger: { x: 290, y: 24, width: 60, height: 58 },
      },
    ],
    interactions: [
      {
        id: "pickup:herb-01",
        kind: "pickup",
        x: 250,
        y: 170,
        radius: 44,
        label: "Erva luminosa",
        capability: "reward",
        reward: { itemId: "item:bright-herb", quantity: 1 },
        once: true,
      },
      {
        id: "pickup:capture-orb-01",
        kind: "pickup",
        x: 320,
        y: 210,
        radius: 44,
        label: "Orbe de captura",
        capability: "reward",
        reward: { itemId: "item:capture-orb", quantity: 2 },
        once: true,
      },
      {
        id: "chest:meadow-01",
        kind: "chest",
        x: 370,
        y: 270,
        radius: 52,
        label: "Baú da clareira",
        capability: "reward",
        reward: { itemId: "item:field-tonic", quantity: 2 },
        once: true,
      },
      {
        id: "encounter:nightleaf-01",
        kind: "encounter",
        x: 540,
        y: 130,
        radius: 50,
        label: "Folha Noturna selvagem",
        capability: "encounter",
        definitionId: "creature:nightleaf",
      },
    ],
  },
};

export function getZone(zoneId: string): ZoneDefinition | undefined {
  return ZONES[zoneId];
}

export function simulateZoneMovement(
  zoneId: string,
  state: PlayerState,
  input: MovementInput,
  deltaSeconds: number,
): PlayerState {
  const zone = getZone(zoneId);
  return zone
    ? simulateMovement(state, input, deltaSeconds, zone.collision)
    : state;
}

export function findAvailablePortal(zoneId: string, state: PlayerState) {
  return getZone(zoneId)?.portals.find(
    ({ trigger }) =>
      state.x >= trigger.x &&
      state.x <= trigger.x + trigger.width &&
      state.y >= trigger.y &&
      state.y <= trigger.y + trigger.height,
  );
}

export function findAvailableInteraction(
  zoneId: string,
  interactionId: string,
  state: PlayerState,
): InteractionDefinition | undefined {
  return getZone(zoneId)?.interactions.find(
    (interaction) =>
      interaction.id === interactionId &&
      Math.hypot(state.x - interaction.x, state.y - interaction.y) <=
        interaction.radius,
  );
}

export function simulateHouseMovement(
  state: PlayerState,
  input: MovementInput,
  deltaSeconds: number,
): PlayerState {
  return simulateMovement(state, input, deltaSeconds, HOUSE_COLLISION);
}

export function isSafeHousePosition(state: PlayerState): boolean {
  return isSafePosition(state, HOUSE_COLLISION);
}
