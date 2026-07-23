import type { MovementInput, PlayerState } from "@lt/engine-core";
import {
  findAvailableInteraction,
  findAvailablePortal,
  getZone,
  simulateZoneMovement,
} from "@lt/game-simulation";
import type { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { InteractionStore } from "./interaction-store.js";
import {
  noopGameplayEvents,
  type GameplayEventSink,
} from "../events/gameplay-events.js";

const messageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("input"),
    sequence: z.number().int().positive(),
    x: z.number().min(-1).max(1),
    y: z.number().min(-1).max(1),
  }),
  z.object({ type: z.literal("transition"), portalId: z.string().min(1) }),
  z.object({
    type: z.literal("interact"),
    requestId: z.string().min(1).max(80),
    interactionId: z.string().min(1).max(120),
  }),
]);

export interface ZonePlayerState extends PlayerState {
  zoneId: string;
}

export interface CheckpointStore {
  load(accountId: string): Promise<ZonePlayerState | PlayerState | null>;
  save(accountId: string, state: ZonePlayerState): Promise<void>;
}

export interface WorldSocket {
  readyState: number;
  send(data: string): void;
  on(event: "message", listener: (data: { toString(): string }) => void): void;
  once(event: "close", listener: () => void): void;
}

export class PrismaCheckpointStore implements CheckpointStore {
  constructor(private readonly prisma: PrismaClient) {}

  async load(accountId: string) {
    const checkpoint = await this.prisma.playerCheckpoint.findUnique({
      where: { accountId },
    });
    return checkpoint
      ? {
          x: checkpoint.x,
          y: checkpoint.y,
          zoneId: checkpoint.zoneId,
          lastProcessedSequence: 0,
        }
      : null;
  }

  async save(accountId: string, state: ZonePlayerState) {
    await this.prisma.playerCheckpoint.upsert({
      where: { accountId },
      create: {
        accountId,
        x: state.x,
        y: state.y,
        zoneId: state.zoneId,
      },
      update: { x: state.x, y: state.y, zoneId: state.zoneId },
    });
  }
}

interface ConnectedPlayer {
  socket: WorldSocket;
  state: ZonePlayerState;
  inputs: MovementInput[];
}

export class HouseRoom {
  private readonly players = new Map<string, ConnectedPlayer>();
  private readonly encounterAuthorizations = new Map<
    string,
    { token: string; zoneId: string; expiresAt: number }
  >();
  private readonly timer: NodeJS.Timeout;

  constructor(
    private readonly checkpoints: CheckpointStore,
    autoStart = true,
    private readonly interactions?: InteractionStore,
    private readonly events: GameplayEventSink = noopGameplayEvents,
  ) {
    this.timer = setInterval(
      () => {
        this.step();
      },
      autoStart ? 50 : 2_147_483_647,
    );
    this.timer.unref();
  }

  async connect(socket: WorldSocket, accountId: string): Promise<void> {
    const checkpoint = await this.checkpoints.load(accountId);
    const requestedZone =
      checkpoint && "zoneId" in checkpoint ? checkpoint.zoneId : "house";
    const zone = getZone(requestedZone) ?? getZone("house");
    if (!zone) throw new Error("default_zone_missing");
    const safe =
      checkpoint &&
      checkpoint.x >= zone.collision.bounds.x &&
      checkpoint.y >= zone.collision.bounds.y;
    const state: ZonePlayerState = {
      ...(safe ? checkpoint : zone.spawn),
      zoneId: zone.id,
      lastProcessedSequence: 0,
    };
    this.players.set(accountId, { socket, state, inputs: [] });
    socket.on("message", (data) => {
      let raw: unknown;
      try {
        raw = JSON.parse(data.toString());
      } catch {
        return;
      }
      const message = messageSchema.safeParse(raw);
      const player = this.players.get(accountId);
      if (!message.success || !player) return;
      if (message.data.type === "transition") {
        void this.transition(accountId, message.data.portalId);
      } else if (message.data.type === "interact") {
        const { requestId, interactionId } = message.data;
        void this.interact(accountId, requestId, interactionId).catch(() => {
          const connected = this.players.get(accountId);
          if (connected)
            this.sendInteraction(
              connected,
              requestId,
              interactionId,
              "unavailable",
            );
        });
      } else if (
        message.data.sequence > player.state.lastProcessedSequence &&
        player.inputs.length < 20
      ) {
        player.inputs.push(message.data);
      }
    });
    socket.once("close", () => void this.disconnect(accountId));
    this.sendSnapshot(accountId);
    void this.publish(
      accountId,
      `zone-visited:${state.zoneId}`,
      "world.zone_entered",
      { zoneId: state.zoneId },
    );
  }

  step(): void {
    for (const player of this.players.values()) {
      for (const input of player.inputs.splice(0, 10)) {
        player.state = {
          ...simulateZoneMovement(
            player.state.zoneId,
            player.state,
            input,
            0.05,
          ),
          zoneId: player.state.zoneId,
        };
      }
    }
    for (const accountId of this.players.keys()) this.sendSnapshot(accountId);
  }

  snapshot(zoneId?: string): Record<string, ZonePlayerState> {
    return Object.fromEntries(
      [...this.players.entries()]
        .filter(([, player]) => !zoneId || player.state.zoneId === zoneId)
        .map(([id, player]) => [id, { ...player.state }]),
    );
  }

  async close(): Promise<void> {
    clearInterval(this.timer);
    await Promise.all(
      [...this.players].map(([id, player]) =>
        this.checkpoints.save(id, player.state),
      ),
    );
    this.players.clear();
    this.encounterAuthorizations.clear();
  }

  consumeEncounterAuthorization(
    accountId: string,
    token: string,
  ): string | null {
    const authorization = this.encounterAuthorizations.get(accountId);
    this.encounterAuthorizations.delete(accountId);
    return authorization &&
      authorization.token === token &&
      authorization.expiresAt >= Date.now()
      ? authorization.zoneId
      : null;
  }

  private async transition(accountId: string, portalId: string): Promise<void> {
    const player = this.players.get(accountId);
    if (!player) return;
    const previousZoneId = player.state.zoneId;
    const portal = findAvailablePortal(player.state.zoneId, player.state);
    if (!portal || portal.id !== portalId) return;
    player.state = {
      ...portal.targetSpawn,
      zoneId: portal.targetZoneId,
      lastProcessedSequence: player.state.lastProcessedSequence,
    };
    player.inputs.length = 0;
    for (const [id, connected] of this.players) {
      if (
        connected.state.zoneId === previousZoneId ||
        connected.state.zoneId === player.state.zoneId
      ) {
        this.sendSnapshot(id, id === accountId);
      }
    }
    await this.checkpoints.save(accountId, player.state);
    await this.publish(
      accountId,
      `zone-visited:${player.state.zoneId}`,
      "world.zone_entered",
      { zoneId: player.state.zoneId },
    );
  }

  private sendSnapshot(accountId: string, transitioned = false): void {
    const player = this.players.get(accountId);
    if (!player || player.socket.readyState !== 1) return;
    const zone = getZone(player.state.zoneId);
    if (!zone) return;
    player.socket.send(
      JSON.stringify({
        protocolVersion: 1,
        type: "world_snapshot",
        serverTime: Date.now(),
        zoneId: zone.id,
        packId: zone.packId,
        transitioned,
        interactions: zone.interactions,
        players: this.snapshot(zone.id),
      }),
    );
  }

  private async interact(
    accountId: string,
    requestId: string,
    interactionId: string,
  ): Promise<void> {
    const player = this.players.get(accountId);
    if (!player || player.socket.readyState !== 1) return;
    const interaction = findAvailableInteraction(
      player.state.zoneId,
      interactionId,
      player.state,
    );
    if (!interaction) {
      this.sendInteraction(player, requestId, interactionId, "unavailable");
      return;
    }
    if (interaction.capability === "dialogue") {
      player.socket.send(
        JSON.stringify({
          protocolVersion: 1,
          type: "interaction_result",
          requestId,
          interactionId,
          status: "dialogue",
          label: interaction.label,
          dialogue: interaction.dialogue,
        }),
      );
      void this.publish(
        accountId,
        `interaction:${requestId}`,
        "interaction.completed",
        { interactionId },
      );
      return;
    }
    if (interaction.capability === "encounter") {
      const authorization = randomUUID();
      this.encounterAuthorizations.set(accountId, {
        token: authorization,
        zoneId: player.state.zoneId,
        expiresAt: Date.now() + 15_000,
      });
      player.socket.send(
        JSON.stringify({
          protocolVersion: 1,
          type: "interaction_result",
          requestId,
          interactionId,
          status: "encounter_available",
          authorization,
          definitionId: interaction.definitionId,
        }),
      );
      void this.publish(
        accountId,
        `interaction:${requestId}`,
        "interaction.completed",
        { interactionId },
      );
      return;
    }
    if (!this.interactions) {
      this.sendInteraction(player, requestId, interactionId, "unavailable");
      return;
    }
    const result = await this.interactions.claim(
      accountId,
      interaction.id,
      interaction.reward,
    );
    player.socket.send(
      JSON.stringify({
        protocolVersion: 1,
        type: "interaction_result",
        requestId,
        interactionId,
        ...result,
      }),
    );
    if (result.status === "granted")
      void this.publish(
        accountId,
        `interaction:${requestId}`,
        "interaction.completed",
        { interactionId },
      );
  }

  private async publish(
    ownerId: string,
    id: string,
    type: "world.zone_entered" | "interaction.completed",
    attributes: Record<string, string>,
  ): Promise<void> {
    try {
      await this.events.publish(ownerId, {
        id,
        type,
        occurredAt: new Date().toISOString(),
        attributes,
      });
    } catch {
      // The gameplay action remains authoritative. Deterministic event IDs
      // allow a later reconnect or command retry to repair quest progress.
    }
  }

  private sendInteraction(
    player: ConnectedPlayer,
    requestId: string,
    interactionId: string,
    status: "unavailable",
  ): void {
    player.socket.send(
      JSON.stringify({
        protocolVersion: 1,
        type: "interaction_result",
        requestId,
        interactionId,
        status,
      }),
    );
  }

  private async disconnect(accountId: string): Promise<void> {
    const player = this.players.get(accountId);
    if (!player) return;
    this.players.delete(accountId);
    await this.checkpoints.save(accountId, player.state);
  }
}
