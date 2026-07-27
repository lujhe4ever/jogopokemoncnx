import type { BattleOutcome } from "../packages/battle-domain/src/index.js";
import {
  BattleService,
  type BattleCommandResponse,
  type BattleRoster,
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

  it("uses the persisted active companion as the player combatant", async () => {
    const roster: BattleRoster = {
      playerCombatant: () =>
        Promise.resolve({
          creatureId: "tidefin-1",
          combatant: {
            id: "creature:tidefin",
            name: "Maréu",
            maxHealth: 44,
            health: 44,
            strength: 13,
            guard: 9,
            agility: 15,
          },
        }),
    };
    const battles = new BattleService(
      new MemoryResults(),
      () => 1_000,
      () => "starter-battle",
      () => 42,
      roster,
    );
    await expect(battles.start("owner")).resolves.toMatchObject({
      player: {
        id: "creature:tidefin",
        name: "Maréu",
        maxHealth: 44,
      },
    });
  });

  it("rejects a persisted roster without an active companion", async () => {
    const roster: BattleRoster = {
      playerCombatant: () => Promise.resolve(null),
    };
    const battles = new BattleService(
      new MemoryResults(),
      () => 1_000,
      () => "missing-roster-battle",
      () => 42,
      roster,
    );
    await expect(battles.start("owner")).rejects.toThrow("creature_required");
  });

  it("uses the authorized wild definition and returns applied progression", async () => {
    let rewardedCreatureId: string | undefined;
    const results: BattleResultStore = {
      start: () => Promise.resolve(),
      finish: (
        _ownerId,
        _battleId,
        _outcome,
        _winner,
        participantCreatureId,
      ) => {
        rewardedCreatureId = participantCreatureId;
        return Promise.resolve({
          applied: true,
          progression: {
            creatureId: "starter-1",
            definitionId: "creature:mosscalf",
            experienceGained: 100,
            experience: 100,
            level: 2,
            leveledUp: true,
            evolved: false,
          },
        });
      },
    };
    const roster: BattleRoster = {
      playerCombatant: () =>
        Promise.resolve({
          creatureId: "starter-1",
          combatant: {
            id: "creature:mosscalf",
            name: "Musgote",
            level: 1,
            maxHealth: 100,
            health: 100,
            strength: 100,
            guard: 100,
            agility: 100,
          },
        }),
    };
    const battles = new BattleService(
      results,
      () => 1_000,
      () => "progression-battle",
      () => 42,
      roster,
    );
    let state = await battles.start("owner", "creature:tidefin");
    expect(state.npc.id).toBe("creature:tidefin");
    let finalResponse: BattleCommandResponse | undefined;
    while (state.phase !== "finished") {
      finalResponse = await battles.choose(
        "owner",
        state.id,
        state.expectedSequence,
        "strike",
      );
      if (!finalResponse) throw new Error("missing battle");
      state = finalResponse.state;
    }
    expect(finalResponse).toMatchObject({
      resultApplied: true,
      progression: {
        experienceGained: 100,
        level: 2,
        leveledUp: true,
      },
    });
    expect(finalResponse?.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "turn_resolved", turn: 1 }),
      ]),
    );
    expect(rewardedCreatureId).toBe("starter-1");
  });
});
