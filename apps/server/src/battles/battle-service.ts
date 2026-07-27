import {
  applyBattleCommand,
  createBattle,
  type BattleAction,
  type BattleEvent,
  type BattleOutcome,
  type BattleState,
  type Combatant,
} from "@lt/battle-domain";
import { applyExperience } from "@lt/creature-domain";
import type { PrismaClient } from "@prisma/client";
import { randomInt, randomUUID } from "node:crypto";
import {
  noopGameplayEvents,
  type GameplayEventSink,
} from "../events/gameplay-events.js";
import { ORIGINAL_CREATURE_CATALOG } from "../game/catalog.js";

export interface BattleProgression {
  creatureId: string;
  definitionId: string;
  experienceGained: number;
  experience: number;
  level: number;
  leveledUp: boolean;
  evolved: boolean;
}

export interface BattleFinishResult {
  applied: boolean;
  progression?: BattleProgression;
}

export interface BattleResultStore {
  start(ownerId: string, battleId: string, seed: number): Promise<void>;
  finish(
    ownerId: string,
    battleId: string,
    outcome: BattleOutcome,
    winner?: "player" | "npc",
    participantCreatureId?: string,
  ): Promise<boolean | BattleFinishResult>;
}

export interface BattleRosterEntry {
  creatureId: string;
  combatant: Combatant;
}

export interface BattleRoster {
  playerCombatant(ownerId: string): Promise<BattleRosterEntry | null>;
}

const CREATURE_COMBATANTS: Readonly<Record<string, Omit<Combatant, "health">>> =
  {
    "creature:emberbud": {
      id: "creature:emberbud",
      name: "Broto Âmbar",
      maxHealth: 48,
      strength: 15,
      guard: 10,
      agility: 12,
    },
    "creature:mosscalf": {
      id: "creature:mosscalf",
      name: "Musgote",
      maxHealth: 54,
      strength: 12,
      guard: 14,
      agility: 8,
    },
    "creature:tidefin": {
      id: "creature:tidefin",
      name: "Maréu",
      maxHealth: 44,
      strength: 13,
      guard: 9,
      agility: 15,
    },
    "creature:nightleaf": {
      id: "creature:nightleaf",
      name: "Folha Noturna",
      maxHealth: 42,
      strength: 13,
      guard: 9,
      agility: 9,
    },
  };

export function playerCombatant(definitionId: string, level = 1): Combatant {
  const base = CREATURE_COMBATANTS[definitionId];
  if (!base) throw new Error("unknown_combatant_definition");
  const growth = Math.max(0, Math.min(20, level - 1));
  const maxHealth = base.maxHealth + growth;
  return {
    ...base,
    level,
    maxHealth,
    health: maxHealth,
    strength: base.strength + Math.floor(growth / 3),
    guard: base.guard + Math.floor(growth / 4),
    agility: base.agility + Math.floor(growth / 5),
  };
}

export class PrismaBattleRoster implements BattleRoster {
  constructor(private readonly prisma: PrismaClient) {}

  async playerCombatant(ownerId: string): Promise<BattleRosterEntry | null> {
    const creature = await this.prisma.creature.findFirst({
      where: { ownerId, teamSlot: { not: null } },
      orderBy: [{ teamSlot: "asc" }, { createdAt: "asc" }],
      select: { id: true, definitionId: true, level: true },
    });
    return creature
      ? {
          creatureId: creature.id,
          combatant: playerCombatant(creature.definitionId, creature.level),
        }
      : null;
  }
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
    participantCreatureId?: string,
  ): Promise<BattleFinishResult> {
    const result = await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.battleRecord.updateMany({
        where: { id: battleId, ownerId, finishedAt: null },
        data: {
          outcome,
          winner: winner ?? null,
          experienceReward: outcome === "player_win" ? 100 : 0,
          finishedAt: new Date(),
        },
      });
      if (updated.count !== 1) return { applied: false };
      if (outcome !== "player_win") return { applied: true };
      const creature = await transaction.creature.findFirst({
        where: participantCreatureId
          ? { id: participantCreatureId, ownerId }
          : { ownerId, teamSlot: { not: null } },
        orderBy: [{ teamSlot: "asc" }, { createdAt: "asc" }],
      });
      if (!creature) return { applied: true };
      const progression = applyExperience(
        {
          id: creature.id,
          ownerId: creature.ownerId,
          definitionId: creature.definitionId,
          definitionVersion: creature.definitionVersion,
          catalogVersion: creature.catalogVersion,
          experience: creature.experience,
          level: creature.level,
        },
        100,
        ORIGINAL_CREATURE_CATALOG,
      );
      await transaction.creature.update({
        where: { id: creature.id },
        data: {
          definitionId: progression.instance.definitionId,
          definitionVersion: progression.instance.definitionVersion,
          catalogVersion: progression.instance.catalogVersion,
          experience: progression.instance.experience,
          level: progression.instance.level,
        },
      });
      await transaction.creatureProgressionEvent.create({
        data: {
          ownerId,
          creatureId: creature.id,
          requestId: `battle:${battleId}`,
          amount: 100,
        },
      });
      return {
        applied: true,
        progression: {
          creatureId: creature.id,
          definitionId: progression.instance.definitionId,
          experienceGained: 100,
          experience: progression.instance.experience,
          level: progression.instance.level,
          leveledUp: progression.instance.level > creature.level,
          evolved: progression.evolved,
        },
      };
    });
    await this.events.publish(ownerId, {
      id: `battle-finished:${battleId}`,
      type: "battle.finished",
      occurredAt: new Date().toISOString(),
      attributes: { outcome },
    });
    return result;
  }
}

interface ActiveBattle {
  ownerId: string;
  state: BattleState;
  deadline: number;
  participantCreatureId?: string;
}

export interface BattleCommandResponse {
  accepted: boolean;
  state: BattleState;
  error?: "battle_finished" | "sequence_mismatch";
  resultApplied?: boolean;
  events?: readonly BattleEvent[];
  progression?: BattleProgression;
}

const TURN_TIMEOUT_MS = 30_000;
const PLAYER = playerCombatant("creature:emberbud");

export class BattleService {
  private readonly active = new Map<string, ActiveBattle>();

  constructor(
    private readonly results: BattleResultStore,
    private readonly clock: () => number = Date.now,
    private readonly id: () => string = randomUUID,
    private readonly seed: () => number = () => randomInt(1, 2_147_483_647),
    private readonly roster?: BattleRoster,
  ) {}

  async start(
    ownerId: string,
    npcDefinitionId = "creature:nightleaf",
  ): Promise<BattleState> {
    const existing = this.active.get(ownerId);
    if (existing && existing.state.phase !== "finished") return existing.state;
    const id = this.id();
    const seed = this.seed();
    const rosterEntry = await this.roster?.playerCombatant(ownerId);
    if (this.roster && !rosterEntry) throw new Error("creature_required");
    const combatant = rosterEntry?.combatant ?? PLAYER;
    const state = createBattle(
      id,
      seed,
      combatant,
      playerCombatant(npcDefinitionId),
    );
    await this.results.start(ownerId, id, seed);
    this.active.set(ownerId, {
      ownerId,
      state,
      deadline: this.clock() + TURN_TIMEOUT_MS,
      ...(rosterEntry ? { participantCreatureId: rosterEntry.creatureId } : {}),
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
          battle.participantCreatureId,
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
      return { accepted: true, state: result.state, events: result.events };
    const finishResult = await this.results.finish(
      battle.ownerId,
      battle.state.id,
      result.state.outcome ?? "draw",
      result.state.winner,
      battle.participantCreatureId,
    );
    const resultApplied =
      typeof finishResult === "boolean" ? finishResult : finishResult.applied;
    const progression =
      typeof finishResult === "boolean" ? undefined : finishResult.progression;
    return {
      accepted: true,
      state: result.state,
      events: result.events,
      resultApplied,
      ...(progression ? { progression } : {}),
    };
  }
}
