import { describe, expect, it } from "vitest";
import {
  SAFE_SPAWN,
  isSafeHousePosition,
  simulateHouseMovement,
} from "../packages/game-simulation/src/index.js";

describe("headless movement simulation", () => {
  it("normalizes diagonal speed and limits client-controlled delta", () => {
    const next = simulateHouseMovement(
      SAFE_SPAWN,
      { x: 100, y: 100, sequence: 1 },
      99,
    );
    expect(
      Math.hypot(next.x - SAFE_SPAWN.x, next.y - SAFE_SPAWN.y),
    ).toBeCloseTo(12, 5);
  });

  it("rejects movement through house obstacles", () => {
    const before = { x: 260, y: 286, lastProcessedSequence: 0 };
    const next = simulateHouseMovement(
      before,
      { x: 1, y: 0, sequence: 1 },
      0.1,
    );
    expect(next.x).toBe(before.x);
    expect(isSafeHousePosition(next)).toBe(true);
  });

  it("keeps every repeated movement inside world bounds", () => {
    let state = SAFE_SPAWN;
    for (let sequence = 1; sequence <= 500; sequence += 1) {
      state = simulateHouseMovement(state, { x: -1, y: -1, sequence }, 0.05);
    }
    expect(isSafeHousePosition(state)).toBe(true);
  });
});
