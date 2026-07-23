import type { BattleAction, Combatant } from "@lt/battle-domain";

export interface PvpParticipant {
  playerId: string;
  displayName: string;
  combatant: Combatant;
}

export interface PvpBattleState {
  id: string;
  seed: number;
  randomState: number;
  turn: number;
  phase: "choosing" | "finished";
  participants: readonly [PvpParticipant, PvpParticipant];
  health: Readonly<Record<string, number>>;
  expectedSequence: Readonly<Record<string, number>>;
  choices: Readonly<Partial<Record<string, BattleAction>>>;
  winnerPlayerId?: string;
  outcome?: "win" | "draw" | "abandoned";
  finishReason?: "health" | "turn_limit" | "timeout" | "abandon" | "disconnect";
}

export type PvpTransition =
  | {
      accepted: true;
      resolved: boolean;
      state: PvpBattleState;
    }
  | {
      accepted: false;
      state: PvpBattleState;
      error:
        | "battle_finished"
        | "not_participant"
        | "sequence_mismatch"
        | "choice_already_submitted";
    };

function nextRandom(state: number): { state: number; value: number } {
  const next = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
  return { state: next, value: next / 4_294_967_296 };
}

function damage(
  attacker: Combatant,
  defender: Combatant,
  defending: boolean,
  randomValue: number,
): number {
  const variance = Math.floor(randomValue * 5);
  const raw = Math.max(1, attacker.strength + variance - defender.guard / 2);
  return Math.max(1, Math.floor(defending ? raw / 2 : raw));
}

export function createPvpBattle(
  id: string,
  seed: number,
  first: PvpParticipant,
  second: PvpParticipant,
): PvpBattleState {
  if (
    !id ||
    !Number.isInteger(seed) ||
    !first.playerId ||
    !second.playerId ||
    first.playerId === second.playerId
  )
    throw new Error("invalid_pvp_battle");
  return {
    id,
    seed: seed >>> 0,
    randomState: seed >>> 0,
    turn: 1,
    phase: "choosing",
    participants: [
      { ...first, combatant: { ...first.combatant } },
      { ...second, combatant: { ...second.combatant } },
    ],
    health: {
      [first.playerId]: first.combatant.maxHealth,
      [second.playerId]: second.combatant.maxHealth,
    },
    expectedSequence: { [first.playerId]: 1, [second.playerId]: 1 },
    choices: {},
  };
}

export function submitPvpChoice(
  state: PvpBattleState,
  playerId: string,
  sequence: number,
  action: BattleAction,
): PvpTransition {
  if (state.phase === "finished")
    return { accepted: false, state, error: "battle_finished" };
  if (
    !state.participants.some((participant) => participant.playerId === playerId)
  )
    return { accepted: false, state, error: "not_participant" };
  if (sequence !== state.expectedSequence[playerId])
    return { accepted: false, state, error: "sequence_mismatch" };
  if (state.choices[playerId])
    return { accepted: false, state, error: "choice_already_submitted" };
  const choices = { ...state.choices, [playerId]: action };
  const [first, second] = state.participants;
  const firstAction = choices[first.playerId];
  const secondAction = choices[second.playerId];
  if (!firstAction || !secondAction)
    return {
      accepted: true,
      resolved: false,
      state: { ...state, choices },
    };

  const firstRandom = nextRandom(state.randomState);
  const secondRandom = nextRandom(firstRandom.state);
  let firstHealth = state.health[first.playerId] ?? 0;
  let secondHealth = state.health[second.playerId] ?? 0;
  const strikeFirst = () => {
    if (firstAction !== "strike") return;
    secondHealth = Math.max(
      0,
      secondHealth -
        damage(
          first.combatant,
          second.combatant,
          secondAction === "guard",
          secondRandom.value,
        ),
    );
  };
  const strikeSecond = () => {
    if (secondAction !== "strike") return;
    firstHealth = Math.max(
      0,
      firstHealth -
        damage(
          second.combatant,
          first.combatant,
          firstAction === "guard",
          firstRandom.value,
        ),
    );
  };
  if (first.combatant.agility >= second.combatant.agility) {
    strikeFirst();
    if (secondHealth > 0) strikeSecond();
  } else {
    strikeSecond();
    if (firstHealth > 0) strikeFirst();
  }
  const next: PvpBattleState = {
    ...state,
    randomState: secondRandom.state,
    turn: state.turn + 1,
    health: {
      [first.playerId]: firstHealth,
      [second.playerId]: secondHealth,
    },
    expectedSequence: {
      [first.playerId]: (state.expectedSequence[first.playerId] ?? 0) + 1,
      [second.playerId]: (state.expectedSequence[second.playerId] ?? 0) + 1,
    },
    choices: {},
  };
  if (firstHealth === 0 || secondHealth === 0)
    return {
      accepted: true,
      resolved: true,
      state: {
        ...next,
        phase: "finished",
        outcome: "win",
        winnerPlayerId: firstHealth > 0 ? first.playerId : second.playerId,
        finishReason: "health",
      },
    };
  if (state.turn >= 100)
    return {
      accepted: true,
      resolved: true,
      state: {
        ...next,
        phase: "finished",
        outcome: "draw",
        finishReason: "turn_limit",
      },
    };
  return { accepted: true, resolved: true, state: next };
}

export function finishPvpBattle(
  state: PvpBattleState,
  losingPlayerId: string,
  reason: "timeout" | "abandon" | "disconnect",
): PvpBattleState {
  if (state.phase === "finished") return state;
  const winner = state.participants.find(
    ({ playerId }) => playerId !== losingPlayerId,
  );
  if (!winner) throw new Error("not_participant");
  return {
    ...state,
    phase: "finished",
    outcome: reason === "timeout" ? "win" : "abandoned",
    winnerPlayerId: winner.playerId,
    finishReason: reason,
    choices: {},
  };
}

export function publicPvpProjection(state: PvpBattleState) {
  return {
    id: state.id,
    turn: state.turn,
    phase: state.phase,
    participants: state.participants.map(
      ({ playerId, displayName, combatant }) => ({
        playerId,
        displayName,
        combatant: {
          id: combatant.id,
          name: combatant.name,
          health: state.health[playerId] ?? 0,
          maxHealth: combatant.maxHealth,
        },
      }),
    ),
    ...(state.winnerPlayerId ? { winnerPlayerId: state.winnerPlayerId } : {}),
    ...(state.outcome ? { outcome: state.outcome } : {}),
    ...(state.finishReason ? { finishReason: state.finishReason } : {}),
  };
}
