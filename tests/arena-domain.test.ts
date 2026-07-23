import { describe, expect, it } from "vitest";
import {
  ARENA_BOUNDS,
  ARENA_SPAWN,
  simulateArenaMovement,
} from "../packages/arena-domain/src/index.js";

describe("arena movement domain", () => {
  it("normalizes diagonal movement and rejects replayed sequences", () => {
    const moved = simulateArenaMovement(
      ARENA_SPAWN,
      { sequence: 1, x: 1, y: 1 },
      0.05,
    );
    expect(moved.x - ARENA_SPAWN.x).toBeCloseTo(moved.y - ARENA_SPAWN.y);
    expect(
      simulateArenaMovement(moved, { sequence: 1, x: 1, y: 0 }, 0.05),
    ).toBe(moved);
  });

  it("keeps authoritative positions inside the arena", () => {
    let state = ARENA_SPAWN;
    for (let sequence = 1; sequence <= 200; sequence += 1)
      state = simulateArenaMovement(state, { sequence, x: -1, y: 1 }, 0.05);
    expect(state.x).toBe(ARENA_BOUNDS.minX);
    expect(state.y).toBe(ARENA_BOUNDS.maxY);
  });
});
