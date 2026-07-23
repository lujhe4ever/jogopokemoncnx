export interface ArenaPosition {
  x: number;
  y: number;
  lastProcessedSequence: number;
}

export interface ArenaMovementInput {
  sequence: number;
  x: number;
  y: number;
}

export const ARENA_BOUNDS = {
  minX: 24,
  maxX: 616,
  minY: 24,
  maxY: 376,
} as const;

export const ARENA_SPAWN: ArenaPosition = {
  x: 320,
  y: 200,
  lastProcessedSequence: 0,
};

const SPEED = 160;

export function simulateArenaMovement(
  state: ArenaPosition,
  input: ArenaMovementInput,
  deltaSeconds: number,
): ArenaPosition {
  if (
    !Number.isFinite(deltaSeconds) ||
    deltaSeconds <= 0 ||
    input.sequence <= state.lastProcessedSequence
  )
    return state;
  const magnitude = Math.hypot(input.x, input.y);
  const scale = magnitude > 1 ? 1 / magnitude : 1;
  const x = Math.min(
    ARENA_BOUNDS.maxX,
    Math.max(
      ARENA_BOUNDS.minX,
      state.x + input.x * scale * SPEED * deltaSeconds,
    ),
  );
  const y = Math.min(
    ARENA_BOUNDS.maxY,
    Math.max(
      ARENA_BOUNDS.minY,
      state.y + input.y * scale * SPEED * deltaSeconds,
    ),
  );
  return { x, y, lastProcessedSequence: input.sequence };
}
