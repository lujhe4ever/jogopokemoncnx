export type BattleAction = "strike" | "guard";
export type BattleOutcome = "player_win" | "npc_win" | "draw" | "abandoned";
export type BattleFinishReason =
  "health" | "turn_limit" | "timeout" | "abandon" | "disconnect";

export interface Combatant {
  id: string;
  name: string;
  maxHealth: number;
  health: number;
  strength: number;
  guard: number;
  agility: number;
}

export interface BattleState {
  id: string;
  seed: number;
  randomState: number;
  turn: number;
  expectedSequence: number;
  phase: "awaiting_player" | "finished";
  player: Combatant;
  npc: Combatant;
  outcome?: BattleOutcome;
  winner?: "player" | "npc";
}

export type BattleCommand =
  | { type: "choose"; sequence: number; action: BattleAction }
  | { type: "timeout"; sequence: number }
  | { type: "abandon"; sequence: number; reason: "abandon" | "disconnect" };

export type BattleEvent =
  | {
      type: "turn_resolved";
      turn: number;
      playerAction: BattleAction;
      npcAction: BattleAction;
      playerDamage: number;
      npcDamage: number;
    }
  | {
      type: "battle_finished";
      outcome: BattleOutcome;
      winner?: "player" | "npc";
      reason: BattleFinishReason;
    };

export type CommandResult =
  | { accepted: true; state: BattleState; events: BattleEvent[] }
  | {
      accepted: false;
      state: BattleState;
      error: "battle_finished" | "sequence_mismatch";
    };

const MAX_TURNS = 100;

function nextRandom(state: number): { state: number; value: number } {
  const next = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
  return { state: next, value: next / 4_294_967_296 };
}

function npcPolicy(randomValue: number, npc: Combatant): BattleAction {
  return npc.health < npc.maxHealth / 3 && randomValue < 0.35
    ? "guard"
    : "strike";
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

export function createBattle(
  id: string,
  seed: number,
  player: Combatant,
  npc: Combatant,
): BattleState {
  if (!Number.isInteger(seed)) throw new Error("invalid_seed");
  return {
    id,
    seed: seed >>> 0,
    randomState: seed >>> 0,
    turn: 1,
    expectedSequence: 1,
    phase: "awaiting_player",
    player: { ...player, health: player.maxHealth },
    npc: { ...npc, health: npc.maxHealth },
  };
}

function finish(
  state: BattleState,
  outcome: BattleOutcome,
  reason: BattleFinishReason,
  winner?: "player" | "npc",
): CommandResult {
  const finished: BattleState = {
    ...state,
    phase: "finished",
    outcome,
    ...(winner ? { winner } : {}),
  };
  return {
    accepted: true,
    state: finished,
    events: [
      {
        type: "battle_finished",
        outcome,
        ...(winner ? { winner } : {}),
        reason,
      },
    ],
  };
}

export function applyBattleCommand(
  state: BattleState,
  command: BattleCommand,
): CommandResult {
  if (state.phase === "finished")
    return { accepted: false, state, error: "battle_finished" };
  if (command.sequence !== state.expectedSequence)
    return { accepted: false, state, error: "sequence_mismatch" };
  if (command.type === "abandon")
    return finish(state, "abandoned", command.reason, "npc");
  if (command.type === "timeout")
    return finish(state, "npc_win", "timeout", "npc");

  const firstRandom = nextRandom(state.randomState);
  const secondRandom = nextRandom(firstRandom.state);
  const npcAction = npcPolicy(firstRandom.value, state.npc);
  const playerFirst = state.player.agility >= state.npc.agility;
  let playerHealth = state.player.health;
  let npcHealth = state.npc.health;
  let npcDamage = 0;
  let playerDamage = 0;
  const playerStrike = () => {
    if (command.action !== "strike") return;
    npcDamage = damage(
      state.player,
      state.npc,
      npcAction === "guard",
      secondRandom.value,
    );
    npcHealth = Math.max(0, npcHealth - npcDamage);
  };
  const npcStrike = () => {
    if (npcAction !== "strike") return;
    playerDamage = damage(
      state.npc,
      state.player,
      command.action === "guard",
      firstRandom.value,
    );
    playerHealth = Math.max(0, playerHealth - playerDamage);
  };
  if (playerFirst) {
    playerStrike();
    if (npcHealth > 0) npcStrike();
  } else {
    npcStrike();
    if (playerHealth > 0) playerStrike();
  }

  const resolved: BattleState = {
    ...state,
    randomState: secondRandom.state,
    turn: state.turn + 1,
    expectedSequence: state.expectedSequence + 1,
    player: { ...state.player, health: playerHealth },
    npc: { ...state.npc, health: npcHealth },
  };
  const turnEvent: BattleEvent = {
    type: "turn_resolved",
    turn: state.turn,
    playerAction: command.action,
    npcAction,
    playerDamage,
    npcDamage,
  };
  if (playerHealth === 0 || npcHealth === 0) {
    const winner = npcHealth === 0 ? "player" : "npc";
    const completion = finish(
      resolved,
      winner === "player" ? "player_win" : "npc_win",
      "health",
      winner,
    );
    return completion.accepted
      ? { ...completion, events: [turnEvent, ...completion.events] }
      : completion;
  }
  if (state.turn >= MAX_TURNS) {
    const completion = finish(resolved, "draw", "turn_limit");
    return completion.accepted
      ? { ...completion, events: [turnEvent, ...completion.events] }
      : completion;
  }
  return { accepted: true, state: resolved, events: [turnEvent] };
}

export function replayBattle(
  initial: BattleState,
  commands: readonly BattleCommand[],
): BattleState {
  return commands.reduce((state, command) => {
    const result = applyBattleCommand(state, command);
    if (!result.accepted) throw new Error(result.error);
    return result.state;
  }, initial);
}
