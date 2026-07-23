import type { MovementInput, PlayerState } from "@lt/engine-core";
import {
  SAFE_SPAWN,
  isSafeHousePosition,
  simulateHouseMovement,
} from "@lt/game-simulation";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";

const inputSchema = z.object({
  type: z.literal("input"),
  sequence: z.number().int().positive(),
  x: z.number().min(-1).max(1),
  y: z.number().min(-1).max(1),
});

export interface CheckpointStore {
  load(accountId: string): Promise<PlayerState | null>;
  save(accountId: string, state: PlayerState): Promise<void>;
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
      ? { x: checkpoint.x, y: checkpoint.y, lastProcessedSequence: 0 }
      : null;
  }

  async save(accountId: string, state: PlayerState) {
    await this.prisma.playerCheckpoint.upsert({
      where: { accountId },
      create: { accountId, x: state.x, y: state.y },
      update: { x: state.x, y: state.y },
    });
  }
}

interface ConnectedPlayer {
  socket: WorldSocket;
  state: PlayerState;
  inputs: MovementInput[];
}

export class HouseRoom {
  private readonly players = new Map<string, ConnectedPlayer>();
  private readonly timer: NodeJS.Timeout;

  constructor(
    private readonly checkpoints: CheckpointStore,
    autoStart = true,
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
    const state =
      checkpoint && isSafeHousePosition(checkpoint)
        ? checkpoint
        : { ...SAFE_SPAWN };
    this.players.set(accountId, { socket, state, inputs: [] });
    socket.on("message", (data) => {
      const raw: unknown = JSON.parse(data.toString());
      const input = inputSchema.safeParse(raw);
      const player = this.players.get(accountId);
      if (
        input.success &&
        player &&
        input.data.sequence > player.state.lastProcessedSequence &&
        player.inputs.length < 20
      ) {
        player.inputs.push(input.data);
      }
    });
    socket.once("close", () => {
      void this.disconnect(accountId);
    });
    this.broadcast();
  }

  step(): void {
    for (const player of this.players.values()) {
      const inputs = player.inputs.splice(0, 10);
      for (const input of inputs) {
        player.state = simulateHouseMovement(player.state, input, 0.05);
      }
    }
    this.broadcast();
  }

  snapshot(): Record<string, PlayerState> {
    return Object.fromEntries(
      [...this.players.entries()].map(([accountId, player]) => [
        accountId,
        { ...player.state },
      ]),
    );
  }

  async close(): Promise<void> {
    clearInterval(this.timer);
    await Promise.all(
      [...this.players.entries()].map(([accountId, player]) =>
        this.checkpoints.save(accountId, player.state),
      ),
    );
    this.players.clear();
  }

  private broadcast(): void {
    const payload = JSON.stringify({
      protocolVersion: 1,
      type: "world_snapshot",
      serverTime: Date.now(),
      players: this.snapshot(),
    });
    for (const player of this.players.values()) {
      if (player.socket.readyState === 1) player.socket.send(payload);
    }
  }

  private async disconnect(accountId: string): Promise<void> {
    const player = this.players.get(accountId);
    if (!player) return;
    this.players.delete(accountId);
    await this.checkpoints.save(accountId, player.state);
    this.broadcast();
  }
}
