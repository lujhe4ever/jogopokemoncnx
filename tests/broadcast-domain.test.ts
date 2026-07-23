import { describe, expect, it } from "vitest";
import {
  BattleBroadcastChannel,
  toPublicBattleProjection,
  type BattleBroadcastSource,
} from "../packages/broadcast-domain/src/index.js";

function source(
  turn = 1,
  phase: "choosing" | "finished" = "choosing",
): BattleBroadcastSource & {
  accountId: string;
  choices: Record<string, string>;
} {
  return {
    id: "battle-1",
    accountId: "internal-account",
    choices: { "public-a": "strike" },
    turn,
    phase,
    participants: [
      {
        playerId: "public-a",
        displayName: "Ana",
        combatant: { name: "Broto-lume", health: 40, maxHealth: 50 },
      },
      {
        playerId: "public-b",
        displayName: "Beto",
        combatant: { name: "Casco-pedra", health: 32, maxHealth: 50 },
      },
    ],
    ...(phase === "finished"
      ? {
          winnerPlayerId: "public-a",
          outcome: "win" as const,
          finishReason: "health",
        }
      : {}),
  };
}

describe("public battle broadcasts", () => {
  it("builds an explicit allowlist without choices or internal identifiers", () => {
    const projection = toPublicBattleProjection(source());
    expect(projection.battleId).toBe("battle-1");
    expect(projection.competitors[0]).toMatchObject({
      playerId: "public-a",
      displayName: "Ana",
      creatureName: "Broto-lume",
      health: 40,
    });
    expect(JSON.stringify(projection)).not.toContain("accountId");
    expect(JSON.stringify(projection)).not.toContain("choices");
    expect(JSON.stringify(projection)).not.toContain("strike");
  });

  it("replays contiguous revisions and falls back to a snapshot after a gap", () => {
    const channel = new BattleBroadcastChannel("arena-1", 2);
    channel.publish("started", source(1));
    channel.publish("turn_resolved", source(2));
    channel.publish("finished", source(3, "finished"));

    expect(channel.resume(1)).toMatchObject({
      mode: "deltas",
      revision: 3,
      updates: [{ revision: 2 }, { revision: 3 }],
    });
    expect(channel.resume(0)).toMatchObject({
      mode: "snapshot",
      revision: 3,
      battles: [
        {
          battleId: "battle-1",
          phase: "finished",
          winnerPlayerId: "public-a",
        },
      ],
    });
  });
});
