import {
  applyBattleCommand,
  createBattle,
  type BattleAction,
  type BattleOutcome,
  type BattleState,
  type Combatant,
} from "@lt/battle-domain";
import type { PrismaClient } from "@prisma/client";
import { randomInt, randomUUID } from "node:crypto";
import {
  noopGameplayEvents,
  type GameplayEventSink,
} from "../events/gameplay-events.js";

export interface BattleResultStore {
  start(ownerId: string, battleId: string, seed: number): Promise<void>;
  finish(
    ownerId: string,
    battleId: string,
    outcome: BattleOutcome,
    winner?: "player" | "npc",
  ): Promise<boolean>;
}

export class PrismaBattleResultStore implements BattleResultStore {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly events: GameplayEventSink = noopGameplayEvents,
  ) {}

  async start(ownerId: string, battleId: string, seed: number): Promise<void> {
    await this.prisma.battleRecord.create({
      data: { id: battleId, ownerId, seed },
    });
  }

  async finish(
    ownerId: string,
    battleId: string,
    outcome: BattleOutcome,
    winner?: "player" | "npc",
  ): Promise<boolean> {
    const applied = await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.battleRecord.updateMany({
        where: { id: battleId, ownerId, finishedAt: null },
        data: {
          outcome,
          winner: winner ?? null,
          experienceReward: outcome === "player_win" ? 100 : 0,
          finishedAt: new Date(),
        },
      });
      return updated.count === 1;
    });
    await this.events.publish(ownerId, {
      id: `battle-finished:${battleId}`,
      type: "battle.finished",
      occurredAt: new Date().toISOString(),
      attributes: { outcome },
    });
    return applied;
  }
}

interface ActiveBattle {
  ownerId: string;
  state: BattleState;
  deadline: number;
}

export interface BattleCommandResponse {
  accepted: boolean;
  state: BattleState;
  error?: "battle_finished" | "sequence_mismatch";
  resultApplied?: boolean;
}

const TURN_TIMEOUT_MS = 30_000;
const PLAYER: Combatant = {
  id: "creature:emberbud",
  name: "Broto Âmbar",
  maxHealth: 48,
  health: 48,
  strength: 15,
  guard: 10,
  agility: 12,
};
const NPC: Combatant = {
  id: "creature:nightleaf",
  name: "Folha Noturna",
  maxHealth: 42,
  health: 42,
  strength: 13,
  guard: 9,
  agility: 9,
};

export class BattleService {
  private readonly active = new Map<string, ActiveBattle>();

  constructor(
    private readonly results: BattleResultStore,
    private readonly clock: () => number = Date.now,
    private readonly id: () => string = randomUUID,
    private readonly seed: () => number = () => randomInt(1, 2_147_483_647),
  ) {}

  async start(ownerId: string): Promise<BattleState> {
    const existing = this.active.get(ownerId);
    if (existing && existing.state.phase !== "finished") return existing.state;
    const id = this.id();
    const seed = this.seed();
    const state = createBattle(id, seed, PLAYER, NPC);
    await this.results.start(ownerId, id, seed);
    this.active.set(ownerId, {
      ownerId,
      state,
      deadline: this.clock() + TURN_TIMEOUT_MS,
    });
    return state;
  }

  get(ownerId: string, battleId: string): BattleState | null {
    const battle = this.active.get(ownerId);
    return battle?.state.id === battleId ? battle.state : null;
  }

  async choose(
    ownerId: string,
    battleId: string,
    sequence: number,
    action: BattleAction,
  ): Promise<BattleCommandResponse | null> {
    const battle = this.active.get(ownerId);
    if (!battle || battle.state.id !== battleId) return null;
    if (battle.state.phase !== "finished" && this.clock() >= battle.deadline) {
      return this.finishCommand(battle, {
        type: "timeout",
        sequence: battle.state.expectedSequence,
      });
    }
    return this.finishCommand(battle, { type: "choose", sequence, action });
  }

  async abandon(
    ownerId: string,
    battleId: string,
    reason: "abandon" | "disconnect" = "abandon",
  ): Promise<BattleCommandResponse | null> {
    const battle = this.active.get(ownerId);
    if (!battle || battle.state.id !== battleId) return null;
    return this.finishCommand(battle, {
      type: "abandon",
      sequence: battle.state.expectedSequence,
      reason,
    });
  }

  private async finishCommand(
    battle: ActiveBattle,
    command: Parameters<typeof applyBattleCommand>[1],
  ): Promise<BattleCommandResponse> {
    const result = applyBattleCommand(battle.state, command);
    if (!result.accepted) {
      if (
        battle.state.phase === "finished" &&
        battle.state.outcome !== undefined
      )
        await this.results.finish(
          battle.ownerId,
          battle.state.id,
          battle.state.outcome,
          battle.state.winner,
        );
      return {
        accepted: false,
        state: result.state,
        error: result.error,
      };
    }
    battle.state = result.state;
    battle.deadline = this.clock() + TURN_TIMEOUT_MS;
    if (result.state.phase !== "finished")
      return { accepted: true, state: result.state };
    const resultApplied = await this.results.finish(
      battle.ownerId,
      battle.state.id,
      result.state.outcome ?? "draw",
      result.state.winner,
    );
    return { accepted: true, state: result.state, resultApplied };
  }
}
