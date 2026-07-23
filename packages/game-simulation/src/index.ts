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
