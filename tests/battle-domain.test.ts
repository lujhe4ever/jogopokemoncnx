import {
  applyBattleCommand,
  createBattle,
  replayBattle,
  type BattleCommand,
  type Combatant,
} from "../packages/battle-domain/src/index.js";
import { describe, expect, it } from "vitest";

const player: Combatant = {
  id: "player-creature",
  name: "Broto Âmbar",
  maxHealth: 48,
  health: 48,
  strength: 15,
  guard: 10,
  agility: 12,
};
const npc: Combatant = {
  id: "npc-creature",
  name: "Folha Noturna",
  maxHealth: 42,
  health: 42,
  strength: 13,
  guard: 9,
  agility: 9,
};

describe("deterministic NPC battle", () => {
  it("replays the same seed and commands to an equivalent result", () => {
    const initial = createBattle("battle-1", 123_456, player, npc);
    const commands: BattleCommand[] = Array.from({ length: 3 }, (_, index) => ({
      type: "choose",
      sequence: index + 1,
      action: index % 3 === 2 ? "guard" : "strike",
    }));
    expect(replayBattle(initial, commands)).toEqual(
      replayBattle(createBattle("battle-1", 123_456, player, npc), commands),
    );
  });

  it("rejects duplicate and out-of-turn commands", () => {
    const initial = createBattle("battle-1", 99, player, npc);
    const invalid = applyBattleCommand(initial, {
      type: "choose",
      sequence: 2,
      action: "strike",
    });
    expect(invalid).toMatchObject({
      accepted: false,
      error: "sequence_mismatch",
      state: initial,
    });
    const first = applyBattleCommand(initial, {
      type: "choose",
      sequence: 1,
      action: "strike",
    });
    expect(first.accepted).toBe(true);
    if (!first.accepted) throw new Error("command rejected");
    expect(
      applyBattleCommand(first.state, {
        type: "choose",
        sequence: 1,
        action: "strike",
      }),
    ).toMatchObject({ accepted: false, error: "sequence_mismatch" });
  });

  it("produces explicit timeout and disconnect outcomes", () => {
    const initial = createBattle("battle-1", 99, player, npc);
    expect(
      applyBattleCommand(initial, { type: "timeout", sequence: 1 }),
    ).toMatchObject({
      accepted: true,
      state: { phase: "finished", outcome: "npc_win", winner: "npc" },
      events: [{ type: "battle_finished", reason: "timeout" }],
    });
    expect(
      applyBattleCommand(initial, {
        type: "abandon",
        sequence: 1,
        reason: "disconnect",
      }),
    ).toMatchObject({
      accepted: true,
      state: { phase: "finished", outcome: "abandoned", winner: "npc" },
      events: [{ type: "battle_finished", reason: "disconnect" }],
    });
  });
});
