export interface BattleBroadcastSource {
  id: string;
  turn: number;
  phase: "choosing" | "finished";
  participants: ReadonlyArray<{
    playerId: string;
    displayName: string;
    combatant: {
      name: string;
      health: number;
      maxHealth: number;
    };
  }>;
  winnerPlayerId?: string;
  outcome?: "win" | "draw" | "abandoned";
  finishReason?: string;
}

export interface PublicBattleProjection {
  battleId: string;
  turn: number;
  phase: "choosing" | "finished";
  competitors: ReadonlyArray<{
    playerId: string;
    displayName: string;
    creatureName: string;
    health: number;
    maxHealth: number;
  }>;
  winnerPlayerId?: string;
  outcome?: "win" | "draw" | "abandoned";
  finishReason?: string;
}

export type BattleBroadcastEvent = "started" | "turn_resolved" | "finished";

export interface BattleBroadcastUpdate {
  revision: number;
  event: BattleBroadcastEvent;
  battle: PublicBattleProjection;
}

export type BattleBroadcastResume =
  | {
      mode: "deltas";
      roomId: string;
      revision: number;
      updates: readonly BattleBroadcastUpdate[];
    }
  | {
      mode: "snapshot";
      roomId: string;
      revision: number;
      battles: readonly PublicBattleProjection[];
    };

export function toPublicBattleProjection(
  source: BattleBroadcastSource,
): PublicBattleProjection {
  return {
    battleId: source.id,
    turn: source.turn,
    phase: source.phase,
    competitors: source.participants.map(
      ({ playerId, displayName, combatant }) => ({
        playerId,
        displayName,
        creatureName: combatant.name,
        health: combatant.health,
        maxHealth: combatant.maxHealth,
      }),
    ),
    ...(source.winnerPlayerId ? { winnerPlayerId: source.winnerPlayerId } : {}),
    ...(source.outcome ? { outcome: source.outcome } : {}),
    ...(source.finishReason ? { finishReason: source.finishReason } : {}),
  };
}

export class BattleBroadcastChannel {
  private readonly history: BattleBroadcastUpdate[] = [];
  private readonly visible = new Map<string, PublicBattleProjection>();
  private revision = 0;

  constructor(
    readonly roomId: string,
    private readonly historyLimit = 64,
    private readonly visibleLimit = 20,
  ) {
    if (!roomId || historyLimit < 1 || visibleLimit < 1)
      throw new Error("invalid_broadcast_channel");
  }

  publish(
    event: BattleBroadcastEvent,
    source: BattleBroadcastSource,
  ): BattleBroadcastUpdate {
    const battle = toPublicBattleProjection(source);
    this.visible.delete(battle.battleId);
    this.visible.set(battle.battleId, battle);
    while (this.visible.size > this.visibleLimit) {
      const oldest = this.visible.keys().next().value;
      if (!oldest) break;
      this.visible.delete(oldest);
    }
    const update = { revision: ++this.revision, event, battle } as const;
    this.history.push(update);
    if (this.history.length > this.historyLimit) this.history.shift();
    return update;
  }

  resume(afterRevision: number): BattleBroadcastResume {
    const earliest = this.history[0]?.revision ?? this.revision + 1;
    if (
      Number.isInteger(afterRevision) &&
      afterRevision >= earliest - 1 &&
      afterRevision <= this.revision
    )
      return {
        mode: "deltas",
        roomId: this.roomId,
        revision: this.revision,
        updates: this.history.filter(
          ({ revision }) => revision > afterRevision,
        ),
      };
    return this.snapshot();
  }

  snapshot(): Extract<BattleBroadcastResume, { mode: "snapshot" }> {
    return {
      mode: "snapshot",
      roomId: this.roomId,
      revision: this.revision,
      battles: [...this.visible.values()],
    };
  }
}
