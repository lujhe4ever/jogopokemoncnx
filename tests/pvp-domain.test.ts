import { describe, expect, it } from "vitest";
import {
  createPvpBattle,
  finishPvpBattle,
  publicPvpProjection,
  submitPvpChoice,
  type PvpParticipant,
} from "../packages/pvp-domain/src/index.js";

const first: PvpParticipant = {
  playerId: "player-a",
  displayName: "Ana",
  combatant: {
    id: "creature:a",
    name: "Broto",
    maxHealth: 40,
    health: 40,
    strength: 14,
    guard: 10,
    agility: 12,
  },
};
const second: PvpParticipant = {
  playerId: "player-b",
  displayName: "Beto",
  combatant: {
    id: "creature:b",
    name: "Folha",
    maxHealth: 42,
    health: 42,
    strength: 13,
    guard: 9,
    agility: 10,
  },
};

describe("private-choice PvP domain", () => {
  it("keeps the first choice private until both players submit", () => {
    const initial = createPvpBattle("pvp-1", 77, first, second);
    const waiting = submitPvpChoice(initial, first.playerId, 1, "strike");
    expect(waiting).toMatchObject({ accepted: true, resolved: false });
    if (!waiting.accepted) throw new Error("choice rejected");
    expect(publicPvpProjection(waiting.state)).not.toHaveProperty("choices");
    expect(
      submitPvpChoice(waiting.state, first.playerId, 1, "guard"),
    ).toMatchObject({
      accepted: false,
      error: "choice_already_submitted",
    });
    const resolved = submitPvpChoice(
      waiting.state,
      second.playerId,
      1,
      "guard",
    );
    expect(resolved).toMatchObject({
      accepted: true,
      resolved: true,
      state: { turn: 2, choices: {} },
    });
  });

  it("is deterministic and rejects commands for the opponent", () => {
    const play = () => {
      let state = createPvpBattle("pvp-1", 123, first, second);
      for (let turn = 0; turn < 20 && state.phase !== "finished"; turn += 1) {
        const one = submitPvpChoice(
          state,
          first.playerId,
          state.expectedSequence[first.playerId] ?? 0,
          "strike",
        );
        if (!one.accepted) throw new Error(one.error);
        const two = submitPvpChoice(
          one.state,
          second.playerId,
          one.state.expectedSequence[second.playerId] ?? 0,
          "strike",
        );
        if (!two.accepted) throw new Error(two.error);
        state = two.state;
      }
      return state;
    };
    expect(play()).toEqual(play());
    expect(
      submitPvpChoice(
        createPvpBattle("pvp-2", 1, first, second),
        "intruder",
        1,
        "strike",
      ),
    ).toMatchObject({ accepted: false, error: "not_participant" });
  });

  it("assigns timeout, abandon and disconnect to the opponent", () => {
    const initial = createPvpBattle("pvp-1", 1, first, second);
    expect(finishPvpBattle(initial, first.playerId, "timeout")).toMatchObject({
      phase: "finished",
      winnerPlayerId: second.playerId,
      finishReason: "timeout",
    });
    expect(
      finishPvpBattle(initial, second.playerId, "disconnect"),
    ).toMatchObject({
      winnerPlayerId: first.playerId,
      finishReason: "disconnect",
    });
  });
});
