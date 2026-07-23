export interface Clock {
  now(): number;
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface Rectangle extends Vector2 {
  width: number;
  height: number;
}

export interface MovementInput extends Vector2 {
  sequence: number;
}

export interface PlayerState extends Vector2 {
  lastProcessedSequence: number;
}

export interface WorldCollision {
  bounds: Rectangle;
  obstacles: readonly Rectangle[];
}

const PLAYER_RADIUS = 10;
const PLAYER_SPEED = 120;

function overlapsCircleRectangle(
  position: Vector2,
  rectangle: Rectangle,
): boolean {
  const nearestX = Math.max(
    rectangle.x,
    Math.min(position.x, rectangle.x + rectangle.width),
  );
  const nearestY = Math.max(
    rectangle.y,
    Math.min(position.y, rectangle.y + rectangle.height),
  );
  const dx = position.x - nearestX;
  const dy = position.y - nearestY;
  return dx * dx + dy * dy < PLAYER_RADIUS * PLAYER_RADIUS;
}

function valid(position: Vector2, world: WorldCollision): boolean {
  const { bounds } = world;
  const inside =
    position.x >= bounds.x + PLAYER_RADIUS &&
    position.x <= bounds.x + bounds.width - PLAYER_RADIUS &&
    position.y >= bounds.y + PLAYER_RADIUS &&
    position.y <= bounds.y + bounds.height - PLAYER_RADIUS;
  return (
    inside &&
    !world.obstacles.some((obstacle) =>
      overlapsCircleRectangle(position, obstacle),
    )
  );
}

export function simulateMovement(
  state: PlayerState,
  input: MovementInput,
  deltaSeconds: number,
  world: WorldCollision,
): PlayerState {
  const magnitude = Math.hypot(input.x, input.y);
  const normalizedX = magnitude > 1 ? input.x / magnitude : input.x;
  const normalizedY = magnitude > 1 ? input.y / magnitude : input.y;
  const boundedDelta = Math.min(Math.max(deltaSeconds, 0), 0.1);
  const distance = PLAYER_SPEED * boundedDelta;
  let x = state.x;
  let y = state.y;

  const horizontal = { x: x + normalizedX * distance, y };
  if (valid(horizontal, world)) x = horizontal.x;
  const vertical = { x, y: y + normalizedY * distance };
  if (valid(vertical, world)) y = vertical.y;

  return {
    x,
    y,
    lastProcessedSequence: Math.max(
      state.lastProcessedSequence,
      input.sequence,
    ),
  };
}

export function isSafePosition(
  position: Vector2,
  world: WorldCollision,
): boolean {
  return valid(position, world);
}
