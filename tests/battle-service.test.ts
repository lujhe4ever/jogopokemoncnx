import type { BattleOutcome } from "../packages/battle-domain/src/index.js";
import {
  BattleService,
  type BattleResultStore,
} from "../apps/server/src/battles/battle-service.js";
import { describe, expect, it } from "vitest";

class MemoryResults implements BattleResultStore {
  starts: string[] = [];
  finishes: Array<{
    ownerId: string;
    battleId: string;
    outcome: BattleOutcome;
  }> = [];
  finishCalls = 0;
  private readonly applied = new Set<string>();

  start(ownerId: string, battleId: string, seed: number) {
    void ownerId;
    void seed;
    this.starts.push(battleId);
    return Promise.resolve();
  }

  finish(
    ownerId: string,
    battleId: string,
    outcome: BattleOutcome,
    winner?: "player" | "npc",
  ) {
    void winner;
    this.finishCalls += 1;
    const first = !this.applied.has(battleId);
    if (first) {
      this.applied.add(battleId);
      this.finishes.push({ ownerId, battleId, outcome });
    }
    return Promise.resolve(first);
  }
}

describe("battle session service", () => {
  it("starts only one active battle and applies its result once", async () => {
    const results = new MemoryResults();
    const battles = new BattleService(
      results,
      () => 1_000,
      () => "battle-1",
      () => 777,
    );
    const initial = await battles.start("owner");
    expect(await battles.start("owner")).toEqual(initial);
    expect(results.starts).toEqual(["battle-1"]);

    let state = initial;
    while (state.phase !== "finished") {
      const response = await battles.choose(
        "owner",
        state.id,
        state.expectedSequence,
        "strike",
      );
      if (!response) throw new Error("missing battle");
      state = response.state;
    }
    expect(results.finishes).toHaveLength(1);
    const retry = await battles.choose(
      "owner",
      state.id,
      state.expectedSequence,
      "strike",
    );
    expect(retry).toMatchObject({
      accepted: false,
      error: "battle_finished",
    });
    expect(results.finishes).toHaveLength(1);
    expect(results.finishCalls).toBe(2);
  });

  it("enforces timeout and records disconnect as explicit defeat", async () => {
    let now = 1_000;
    const timeoutResults = new MemoryResults();
    const timeout = new BattleService(
      timeoutResults,
      () => now,
      () => "timeout-battle",
      () => 1,
    );
    const timed = await timeout.start("owner");
    now += 30_000;
    expect(
      await timeout.choose("owner", timed.id, timed.expectedSequence, "strike"),
    ).toMatchObject({
      accepted: true,
      state: { outcome: "npc_win", winner: "npc" },
      resultApplied: true,
    });

    const disconnectResults = new MemoryResults();
    const disconnected = new BattleService(
      disconnectResults,
      () => 1_000,
      () => "disconnect-battle",
      () => 2,
    );
    const active = await disconnected.start("other-owner");
    expect(
      await disconnected.abandon("other-owner", active.id, "disconnect"),
    ).toMatchObject({
      accepted: true,
      state: { outcome: "abandoned", winner: "npc" },
      resultApplied: true,
    });
    expect(disconnectResults.finishes).toEqual([
      {
        ownerId: "other-owner",
        battleId: "disconnect-battle",
        outcome: "abandoned",
      },
    ]);
  });
});
