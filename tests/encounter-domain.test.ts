import {
  evaluateCapture,
  planCaptureAttempt,
  resolveCapture,
  seededCaptureRandom,
} from "../packages/encounter-domain/src/index.js";
import { describe, expect, it } from "vitest";

describe("capture eligibility and deterministic RNG", () => {
  it("requires the approved battle stage and capture item", () => {
    expect(
      evaluateCapture({
        battleOutcome: null,
        targetHealth: 1,
        targetMaxHealth: 10,
        captureItemId: "item:capture-orb",
      }),
    ).toEqual({ eligible: false, reason: "battle_required" });
    expect(
      evaluateCapture({
        battleOutcome: "player_win",
        targetHealth: 1,
        targetMaxHealth: 10,
        captureItemId: "item:field-tonic",
      }),
    ).toEqual({ eligible: false, reason: "item_required" });
  });

  it("increases chance for a weakened target and caps it", () => {
    const healthy = evaluateCapture({
      battleOutcome: "player_win",
      targetHealth: 10,
      targetMaxHealth: 10,
      captureItemId: "item:capture-orb",
    });
    const weakened = evaluateCapture({
      battleOutcome: "player_win",
      targetHealth: 0,
      targetMaxHealth: 10,
      captureItemId: "item:capture-orb",
    });
    expect(healthy).toEqual({ eligible: true, chance: 0.35 });
    expect(weakened).toEqual({ eligible: true, chance: 0.85 });
  });

  it("resolves retries deterministically from the stored seed", () => {
    const evaluation = evaluateCapture({
      battleOutcome: "player_win",
      targetHealth: 0,
      targetMaxHealth: 10,
      captureItemId: "item:capture-orb",
    });
    const first = seededCaptureRandom(404);
    expect(seededCaptureRandom(404)).toBe(first);
    expect(resolveCapture(evaluation, first)).toBe(
      resolveCapture(evaluation, first),
    );
    expect(() => resolveCapture(evaluation, 1)).toThrow("invalid_random_value");
  });

  it("plans item consumption and creature creation only once", () => {
    const evaluation = evaluateCapture({
      battleOutcome: "player_win",
      targetHealth: 0,
      targetMaxHealth: 10,
      captureItemId: "item:capture-orb",
    });
    const first = planCaptureAttempt(
      { status: "pending", itemQuantity: 2 },
      evaluation,
      0,
    );
    expect(first).toEqual({
      status: "captured",
      itemQuantity: 1,
      consumed: true,
      createCreature: true,
      replayed: false,
    });
    expect(
      planCaptureAttempt(
        { status: first.status, itemQuantity: first.itemQuantity },
        evaluation,
        0,
      ),
    ).toEqual({
      status: "captured",
      itemQuantity: 1,
      consumed: false,
      createCreature: false,
      replayed: true,
    });
  });
});
