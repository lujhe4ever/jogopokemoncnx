import type { Combatant } from "@lt/battle-domain";
import {
  createPvpBattle,
  finishPvpBattle,
  publicPvpProjection,
  submitPvpChoice,
  type PvpBattleState,
} from "@lt/pvp-domain";
import { type PrismaClient } from "@prisma/client";
import { randomInt, randomUUID } from "node:crypto";
import { z } from "zod";

const commandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("pvp_choice"),
    battleId: z.string().min(1),
    sequence: z.number().int().positive(),
    action: z.enum(["strike", "guard"]),
  }),
  z.object({
    type: z.literal("pvp_abandon"),
    battleId: z.string().min(1),
  }),
]);

export interface PvpChallengeParticipant {
  accountId: string;
  playerId: string;
  displayName: string;
}

export type PvpDeliver = (accountId: string, payload: object) => void;

interface ActivePvpBattle {
  state: PvpBattleState;
  accounts: readonly [string, string];
  playerByAccount: Readonly<Record<string, string>>;
  accountByPlayer: Readonly<Record<string, string>>;
  deliver: PvpDeliver;
  timer: NodeJS.Timeout | undefined;
}

const TURN_TIMEOUT_MS = 30_000;

export class PvpService {
  private readonly activeById = new Map<string, ActivePvpBattle>();
  private readonly battleByAccount = new Map<string, string>();

  constructor(
    private readonly prisma: PrismaClient,
    private readonly id: () => string = randomUUID,
    private readonly seed: () => number = () => randomInt(1, 2_147_483_647),
  ) {}

  async start(
    roomId: string,
    first: PvpChallengeParticipant,
    second: PvpChallengeParticipant,
    deliver: PvpDeliver,
  ): Promise<boolean> {
    if (
      first.accountId === second.accountId ||
      this.battleByAccount.has(first.accountId) ||
      this.battleByAccount.has(second.accountId)
    )
      return false;
    const [firstCreature, secondCreature] = await Promise.all([
      this.prisma.creature.findFirst({
        where: { ownerId: first.accountId },
        orderBy: [{ teamSlot: "asc" }, { createdAt: "asc" }],
      }),
      this.prisma.creature.findFirst({
        where: { ownerId: second.accountId },
        orderBy: [{ teamSlot: "asc" }, { createdAt: "asc" }],
      }),
    ]);
    if (!firstCreature || !secondCreature) return false;
    const battleId = this.id();
    const seed = this.seed();
    const state = createPvpBattle(
      battleId,
      seed,
      {
        playerId: first.playerId,
        displayName: first.displayName,
        combatant: this.combatant(
          firstCreature.definitionId,
          firstCreature.level,
        ),
      },
      {
        playerId: second.playerId,
        displayName: second.displayName,
        combatant: this.combatant(
          secondCreature.definitionId,
          secondCreature.level,
        ),
      },
    );
    await this.prisma.pvpBattleRecord.create({
      data: {
        id: battleId,
        roomId,
        seed,
        firstPlayerId: first.accountId,
        secondPlayerId: second.accountId,
      },
    });
    const battle: ActivePvpBattle = {
      state,
      accounts: [first.accountId, second.accountId],
      playerByAccount: {
        [first.accountId]: first.playerId,
        [second.accountId]: second.playerId,
      },
      accountByPlayer: {
        [first.playerId]: first.accountId,
        [second.playerId]: second.accountId,
      },
      deliver,
      timer: undefined,
    };
    battle.timer = this.timeout(battle);
    this.activeById.set(battleId, battle);
    this.battleByAccount.set(first.accountId, battleId);
    this.battleByAccount.set(second.accountId, battleId);
    this.deliverState(battle, "pvp_started");
    return true;
  }

  handle(raw: unknown, accountId: string): boolean {
    const parsed = commandSchema.safeParse(raw);
    if (!parsed.success) return false;
    const battleId = this.battleByAccount.get(accountId);
    const battle = battleId ? this.activeById.get(battleId) : undefined;
    if (!battle || battle.state.id !== parsed.data.battleId) return true;
    if (parsed.data.type === "pvp_abandon") {
      void this.forceFinish(battle, accountId, "abandon");
      return true;
    }
    if (battle.state.phase === "finished") {
      void this.persistFinish(battle);
      return true;
    }
    const playerId = battle.playerByAccount[accountId];
    if (!playerId) return true;
    const transition = submitPvpChoice(
      battle.state,
      playerId,
      parsed.data.sequence,
      parsed.data.action,
    );
    if (!transition.accepted) {
      battle.deliver(accountId, {
        protocolVersion: 1,
        type: "pvp_error",
        code: transition.error,
        battleId: battle.state.id,
      });
      return true;
    }
    battle.state = transition.state;
    if (!transition.resolved) {
      battle.deliver(accountId, {
        protocolVersion: 1,
        type: "pvp_choice_received",
        battleId: battle.state.id,
        sequence: parsed.data.sequence,
      });
      return true;
    }
    clearTimeout(battle.timer);
    if (battle.state.phase === "finished") void this.persistFinish(battle);
    else {
      battle.timer = this.timeout(battle);
      this.deliverState(battle, "pvp_turn_resolved");
    }
    return true;
  }

  disconnect(accountId: string): void {
    const battleId = this.battleByAccount.get(accountId);
    const battle = battleId ? this.activeById.get(battleId) : undefined;
    if (battle) void this.forceFinish(battle, accountId, "disconnect");
  }

  close(): void {
    for (const battle of this.activeById.values()) clearTimeout(battle.timer);
    this.activeById.clear();
    this.battleByAccount.clear();
  }

  private timeout(battle: ActivePvpBattle): NodeJS.Timeout {
    const timer = setTimeout(() => {
      const pendingAccount = battle.accounts.find((accountId) => {
        const playerId = battle.playerByAccount[accountId];
        return playerId ? !battle.state.choices[playerId] : false;
      });
      void this.forceFinish(
        battle,
        pendingAccount ?? battle.accounts[1],
        "timeout",
      );
    }, TURN_TIMEOUT_MS);
    timer.unref();
    return timer;
  }

  private async forceFinish(
    battle: ActivePvpBattle,
    losingAccountId: string,
    reason: "timeout" | "abandon" | "disconnect",
  ): Promise<void> {
    const losingPlayerId = battle.playerByAccount[losingAccountId];
    if (!losingPlayerId) return;
    if (battle.state.phase === "finished") {
      await this.persistFinish(battle);
      return;
    }
    battle.state = finishPvpBattle(battle.state, losingPlayerId, reason);
    await this.persistFinish(battle);
  }

  private async persistFinish(battle: ActivePvpBattle): Promise<void> {
    clearTimeout(battle.timer);
    const winnerId = battle.state.winnerPlayerId
      ? battle.accountByPlayer[battle.state.winnerPlayerId]
      : undefined;
    const updated = await this.prisma.pvpBattleRecord.updateMany({
      where: { id: battle.state.id, finishedAt: null },
      data: {
        status: "finished",
        outcome: battle.state.outcome ?? "draw",
        finishReason: battle.state.finishReason ?? "turn_limit",
        winnerId: winnerId ?? null,
        finishedAt: new Date(),
      },
    });
    if (updated.count === 1) this.deliverState(battle, "pvp_finished");
    this.activeById.delete(battle.state.id);
    for (const accountId of battle.accounts)
      this.battleByAccount.delete(accountId);
  }

  private deliverState(
    battle: ActivePvpBattle,
    type: "pvp_started" | "pvp_turn_resolved" | "pvp_finished",
  ): void {
    const projection = publicPvpProjection(battle.state);
    for (const accountId of battle.accounts) {
      const playerId = battle.playerByAccount[accountId];
      battle.deliver(accountId, {
        protocolVersion: 1,
        type,
        state: projection,
        selfPlayerId: playerId,
        expectedSequence: playerId
          ? battle.state.expectedSequence[playerId]
          : undefined,
      });
    }
  }

  private combatant(definitionId: string, level: number): Combatant {
    const scaling = Math.min(20, Math.max(0, level - 1));
    return {
      id: definitionId,
      name: definitionId.split(":").at(-1) ?? "Criatura",
      maxHealth: 40 + scaling,
      health: 40 + scaling,
      strength: 13 + Math.floor(scaling / 3),
      guard: 9 + Math.floor(scaling / 4),
      agility: 10 + Math.floor(scaling / 5),
    };
  }
}
