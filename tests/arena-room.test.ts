import { performance } from "node:perf_hooks";
import { describe, expect, it } from "vitest";
import {
  ArenaRegistry,
  ArenaRoom,
  type ArenaSocket,
} from "../apps/server/src/arena/arena-room.js";

class FakeSocket implements ArenaSocket {
  readyState = 1;
  bufferedAmount = 0;
  sent: string[] = [];
  closed?: { code?: number; reason?: string };
  private messageListener?: (data: { toString(): string }) => void;
  private closeListener?: () => void;

  send(data: string): void {
    this.sent.push(data);
  }
  close(code?: number, reason?: string): void {
    this.closed = {
      ...(code === undefined ? {} : { code }),
      ...(reason === undefined ? {} : { reason }),
    };
    this.readyState = 3;
    this.closeListener?.();
  }
  on(
    _event: "message",
    listener: (data: { toString(): string }) => void,
  ): void {
    this.messageListener = listener;
  }
  once(_event: "close", listener: () => void): void {
    this.closeListener = listener;
  }
  input(value: object): void {
    this.messageListener?.({ toString: () => JSON.stringify(value) });
  }
  messages(type: string): Array<Record<string, unknown>> {
    return this.sent
      .map((data) => JSON.parse(data) as Record<string, unknown>)
      .filter((message) => message.type === type);
  }
}

describe("authoritative arena room", () => {
  it("caps capacity at 20 and emits movement deltas", () => {
    const room = new ArenaRoom("arena-1", false);
    const sockets = Array.from({ length: 20 }, () => new FakeSocket());
    sockets.forEach((socket, index) => {
      expect(
        room.connect(
          socket,
          `account-${String(index)}`,
          `Player ${String(index)}`,
        ),
      ).toBe(true);
    });
    const overflow = new FakeSocket();
    expect(room.connect(overflow, "overflow", "Overflow")).toBe(false);
    expect(overflow.closed).toEqual({ code: 1013, reason: "arena_full" });

    sockets[0]?.input({
      type: "arena_input",
      sequence: 1,
      x: 1,
      y: 0,
    });
    room.step();
    expect(sockets[1]?.messages("arena_delta").at(-1)).toMatchObject({
      roomId: "arena-1",
      players: [{ displayName: "Player 0", x: 328 }],
    });
    expect(
      JSON.stringify(sockets[0]?.messages("arena_snapshot")),
    ).not.toContain("account-0");
    expect(room.size()).toBe(20);
    room.close();
  });

  it("isolates rooms and restores position during reconnect grace", () => {
    let now = 1_000;
    const registry = new ArenaRegistry(false, () => now);
    const first = new FakeSocket();
    const otherRoom = new FakeSocket();
    registry.connect("arena-1", first, "account", "Traveler");
    registry.connect("arena-2", otherRoom, "other", "Other");
    first.input({ type: "arena_input", sequence: 1, x: 1, y: 0 });
    registry.room("arena-1")?.step();
    first.close(1000, "network");

    now += 5_000;
    const reconnected = new FakeSocket();
    registry.connect("arena-1", reconnected, "account", "Traveler");
    const snapshot = reconnected.messages("arena_snapshot").at(-1);
    expect(snapshot?.players).toMatchObject({
      [String(snapshot?.selfId)]: { x: 328, displayName: "Traveler" },
    });
    expect(otherRoom.messages("arena_snapshot").at(-1)?.players).not.toEqual(
      snapshot?.players,
    );
    reconnected.close(1000, "leave");
    otherRoom.close(1000, "leave");
    now += 31_000;
    registry.room("arena-1")?.step();
    registry.room("arena-2")?.step();
    expect(registry.metrics().rooms).toBe(0);
    registry.close();
  });

  it("keeps a 20-avatar tick inside the initial performance budget", () => {
    const room = new ArenaRoom("arena-1", false);
    const sockets = Array.from({ length: 20 }, () => new FakeSocket());
    sockets.forEach((socket, index) =>
      room.connect(socket, `load-${String(index)}`, `Load ${String(index)}`),
    );
    const startedAt = performance.now();
    for (let sequence = 1; sequence <= 100; sequence += 1) {
      sockets.forEach((socket) => {
        socket.input({
          type: "arena_input",
          sequence,
          x: sequence % 2 === 0 ? 1 : -1,
          y: 0,
        });
      });
      room.step();
    }
    const elapsed = performance.now() - startedAt;
    expect(elapsed).toBeLessThan(250);
    expect(room.metrics()).toMatchObject({
      ticks: 100,
      droppedMessages: 0,
    });
    expect(room.metrics().maxTickDurationMs).toBeLessThan(50);
    room.close();
  });

  it("drops broadcasts for a backed-up socket without blocking the tick", () => {
    const room = new ArenaRoom("arena-1", false);
    const slow = new FakeSocket();
    const active = new FakeSocket();
    room.connect(slow, "slow", "Slow");
    room.connect(active, "active", "Active");
    slow.bufferedAmount = 70_000;
    active.input({ type: "arena_input", sequence: 1, x: 1, y: 0 });
    room.step();
    expect(room.metrics().droppedMessages).toBeGreaterThan(0);
    expect(active.messages("arena_delta")).toHaveLength(1);
    room.close();
  });

  it("routes validated social messages inside the same room", () => {
    const room = new ArenaRoom("arena-1", false, () => 10_000);
    const sender = new FakeSocket();
    const receiver = new FakeSocket();
    room.connect(sender, "sender-account", "Sender");
    room.connect(receiver, "receiver-account", "Receiver");
    sender.input({
      type: "social_chat",
      requestId: "chat-1",
      text: "Olá!",
    });
    expect(receiver.messages("social_chat").at(-1)).toMatchObject({
      author: { displayName: "Sender" },
      text: "Olá!",
      sentAt: "1970-01-01T00:00:10.000Z",
    });
    room.close();
  });
});
