import { describe, expect, it } from "vitest";
import {
  HouseRoom,
  type CheckpointStore,
  type WorldSocket,
} from "../apps/server/src/world/house-room.js";
import type { PlayerState } from "../packages/engine-core/src/index.js";

class MemoryCheckpoints implements CheckpointStore {
  saved = new Map<string, PlayerState>();
  load(accountId: string) {
    return Promise.resolve(this.saved.get(accountId) ?? null);
  }
  save(accountId: string, state: PlayerState) {
    this.saved.set(accountId, { ...state });
    return Promise.resolve();
  }
}

class FakeSocket implements WorldSocket {
  readyState = 1;
  sent: string[] = [];
  private message?: (data: { toString(): string }) => void;
  private close?: () => void;

  send(data: string) {
    this.sent.push(data);
  }
  on(_event: "message", listener: (data: { toString(): string }) => void) {
    this.message = listener;
  }
  once(_event: "close", listener: () => void) {
    this.close = listener;
  }
  input(value: object) {
    this.message?.({ toString: () => JSON.stringify(value) });
  }
  disconnect() {
    this.close?.();
  }
}

describe("authoritative house room", () => {
  it("produces one consistent snapshot for connected clients", async () => {
    const checkpoints = new MemoryCheckpoints();
    const room = new HouseRoom(checkpoints, false);
    const first = new FakeSocket();
    const second = new FakeSocket();
    await room.connect(first, "first");
    await room.connect(second, "second");
    first.input({ type: "input", sequence: 1, x: 1, y: 0 });
    room.step();

    const snapshot = room.snapshot();
    expect(snapshot.first?.x).toBeGreaterThan(320);
    expect(JSON.parse(first.sent.at(-1) ?? "{}")).toEqual(
      JSON.parse(second.sent.at(-1) ?? "{}"),
    );
    await room.close();
  });

  it("loads only safe checkpoints and persists outside the tick", async () => {
    const checkpoints = new MemoryCheckpoints();
    checkpoints.saved.set("player", {
      x: -999,
      y: -999,
      lastProcessedSequence: 0,
    });
    const room = new HouseRoom(checkpoints, false);
    const socket = new FakeSocket();
    await room.connect(socket, "player");
    expect(room.snapshot().player).toMatchObject({ x: 320, y: 200 });
    socket.input({ type: "input", sequence: 1, x: 1, y: 0 });
    room.step();
    expect(checkpoints.saved.get("player")?.x).toBe(-999);
    socket.disconnect();
    await new Promise((resolve) => setImmediate(resolve));
    expect(checkpoints.saved.get("player")?.x).toBeGreaterThan(320);
    await room.close();
  });
});
