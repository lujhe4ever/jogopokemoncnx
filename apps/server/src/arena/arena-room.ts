import {
  ARENA_SPAWN,
  simulateArenaMovement,
  type ArenaMovementInput,
  type ArenaPosition,
} from "@lt/arena-domain";
import { performance } from "node:perf_hooks";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { ArenaSocialService } from "./social-service.js";

const inputSchema = z.object({
  type: z.literal("arena_input"),
  sequence: z.number().int().positive(),
  x: z.number().min(-1).max(1),
  y: z.number().min(-1).max(1),
});

const MAX_PLAYERS = 20;
const MAX_PENDING_INPUTS = 20;
const MAX_BUFFERED_BYTES = 64 * 1024;
const RECONNECT_GRACE_MS = 30_000;

export interface ArenaSocket {
  readyState: number;
  bufferedAmount: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  on(event: "message", listener: (data: { toString(): string }) => void): void;
  once(event: "close", listener: () => void): void;
}

export interface ArenaPresence extends ArenaPosition {
  playerId: string;
  displayName: string;
}

interface ConnectedPresence {
  socket: ArenaSocket;
  presence: ArenaPresence;
  inputs: ArenaMovementInput[];
}

interface RecentPresence {
  presence: ArenaPresence;
  expiresAt: number;
}

export interface ArenaMetrics {
  ticks: number;
  droppedMessages: number;
  lastTickDurationMs: number;
  maxTickDurationMs: number;
}

export class ArenaRoom {
  private readonly players = new Map<string, ConnectedPresence>();
  private readonly recent = new Map<string, RecentPresence>();
  private readonly timer: NodeJS.Timeout;
  private readonly social: ArenaSocialService;
  private revision = 0;
  private metricsState: ArenaMetrics = {
    ticks: 0,
    droppedMessages: 0,
    lastTickDurationMs: 0,
    maxTickDurationMs: 0,
  };

  constructor(
    readonly id: string,
    autoStart = true,
    private readonly clock: () => number = Date.now,
    private readonly onIdle: () => void = () => {},
    private readonly publicId: () => string = randomUUID,
  ) {
    this.social = new ArenaSocialService(id, clock);
    this.timer = setInterval(
      () => {
        this.step();
      },
      autoStart ? 50 : 2_147_483_647,
    );
    this.timer.unref();
  }

  connect(
    socket: ArenaSocket,
    accountId: string,
    displayName: string,
  ): boolean {
    const previous = this.players.get(accountId);
    const previousPresence = previous?.presence;
    if (!previous && this.players.size >= MAX_PLAYERS) {
      socket.close(1013, "arena_full");
      return false;
    }
    if (previous) previous.socket.close(4001, "session_replaced");
    this.purgeRecent(false);
    const restored = previousPresence ?? this.recent.get(accountId)?.presence;
    this.recent.delete(accountId);
    const presence: ArenaPresence = restored
      ? { ...restored, displayName }
      : { ...ARENA_SPAWN, playerId: this.publicId(), displayName };
    this.players.set(accountId, { socket, presence, inputs: [] });
    socket.on("message", (data) => {
      let value: unknown;
      try {
        value = JSON.parse(data.toString());
      } catch {
        return;
      }
      const input = inputSchema.safeParse(value);
      const connected = this.players.get(accountId);
      if (!connected || connected.socket !== socket) return;
      if (input.success) {
        if (
          connected.inputs.length >= MAX_PENDING_INPUTS ||
          input.data.sequence <= connected.presence.lastProcessedSequence
        )
          return;
        connected.inputs.push(input.data);
        return;
      }
      this.social.handle(
        value,
        accountId,
        [...this.players].map(([peerAccountId, peer]) => ({
          accountId: peerAccountId,
          playerId: peer.presence.playerId,
          displayName: peer.presence.displayName,
        })),
        (targetAccountId, payload) => {
          const target = this.players.get(targetAccountId);
          if (target) this.send(target.socket, payload);
        },
        (payload) => {
          this.broadcast(payload);
        },
      );
    });
    socket.once("close", () => {
      this.disconnect(accountId, socket);
    });
    this.send(socket, {
      protocolVersion: 1,
      type: "arena_snapshot",
      roomId: this.id,
      revision: this.revision,
      selfId: presence.playerId,
      players: this.snapshot(),
    });
    this.broadcast(
      {
        protocolVersion: 1,
        type: "presence_joined",
        roomId: this.id,
        revision: ++this.revision,
        player: presence,
      },
      accountId,
    );
    return true;
  }

  step(): void {
    const startedAt = performance.now();
    const changed: ArenaPresence[] = [];
    for (const connected of this.players.values()) {
      const before = connected.presence;
      let next = before;
      for (const input of connected.inputs.splice(0, 10))
        next = {
          ...simulateArenaMovement(next, input, 0.05),
          playerId: before.playerId,
          displayName: before.displayName,
        };
      connected.presence = next;
      if (next !== before) changed.push(next);
    }
    if (changed.length > 0)
      this.broadcast({
        protocolVersion: 1,
        type: "arena_delta",
        roomId: this.id,
        revision: ++this.revision,
        players: changed,
      });
    const duration = performance.now() - startedAt;
    this.metricsState = {
      ...this.metricsState,
      ticks: this.metricsState.ticks + 1,
      lastTickDurationMs: duration,
      maxTickDurationMs: Math.max(
        this.metricsState.maxTickDurationMs,
        duration,
      ),
    };
    this.purgeRecent(true);
    this.social.purge();
  }

  snapshot(): Record<string, ArenaPresence> {
    return Object.fromEntries(
      [...this.players.values()].map((player) => [
        player.presence.playerId,
        { ...player.presence },
      ]),
    );
  }

  size(): number {
    return this.players.size;
  }

  metrics(): ArenaMetrics {
    return { ...this.metricsState };
  }

  close(): void {
    clearInterval(this.timer);
    for (const player of this.players.values())
      player.socket.close(1001, "server_shutdown");
    this.players.clear();
    this.recent.clear();
  }

  private disconnect(accountId: string, socket: ArenaSocket): void {
    const connected = this.players.get(accountId);
    if (!connected || connected.socket !== socket) return;
    this.players.delete(accountId);
    this.social.remove(accountId);
    this.recent.set(accountId, {
      presence: connected.presence,
      expiresAt: this.clock() + RECONNECT_GRACE_MS,
    });
    this.broadcast({
      protocolVersion: 1,
      type: "presence_left",
      roomId: this.id,
      revision: ++this.revision,
      playerId: connected.presence.playerId,
    });
  }

  private purgeRecent(notifyIdle: boolean): void {
    const now = this.clock();
    for (const [id, presence] of this.recent)
      if (presence.expiresAt < now) this.recent.delete(id);
    if (notifyIdle && this.players.size === 0 && this.recent.size === 0)
      this.onIdle();
  }

  private broadcast(payload: object, excludedId?: string): void {
    for (const [id, player] of this.players)
      if (id !== excludedId) this.send(player.socket, payload);
  }

  private send(socket: ArenaSocket, payload: object): void {
    if (socket.readyState !== 1 || socket.bufferedAmount > MAX_BUFFERED_BYTES) {
      this.metricsState = {
        ...this.metricsState,
        droppedMessages: this.metricsState.droppedMessages + 1,
      };
      return;
    }
    socket.send(JSON.stringify(payload));
  }
}

export class ArenaRegistry {
  private readonly rooms = new Map<string, ArenaRoom>();

  constructor(
    private readonly autoStart = true,
    private readonly clock: () => number = Date.now,
  ) {}

  connect(
    roomId: string,
    socket: ArenaSocket,
    accountId: string,
    displayName: string,
  ): boolean {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = new ArenaRoom(roomId, this.autoStart, this.clock, () => {
        if (this.rooms.get(roomId) !== room) return;
        room?.close();
        this.rooms.delete(roomId);
      });
    }
    this.rooms.set(roomId, room);
    return room.connect(socket, accountId, displayName);
  }

  room(roomId: string): ArenaRoom | undefined {
    return this.rooms.get(roomId);
  }

  metrics() {
    return {
      rooms: this.rooms.size,
      players: [...this.rooms.values()].reduce(
        (total, room) => total + room.size(),
        0,
      ),
      droppedMessages: [...this.rooms.values()].reduce(
        (total, room) => total + room.metrics().droppedMessages,
        0,
      ),
      maxTickDurationMs: Math.max(
        0,
        ...[...this.rooms.values()].map(
          (room) => room.metrics().maxTickDurationMs,
        ),
      ),
    };
  }

  close(): void {
    for (const room of this.rooms.values()) room.close();
    this.rooms.clear();
  }
}
