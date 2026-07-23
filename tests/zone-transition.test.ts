import { describe, expect, it } from "vitest";
import {
  HouseRoom,
  type CheckpointStore,
  type WorldSocket,
  type ZonePlayerState,
} from "../apps/server/src/world/house-room.js";

class MemoryCheckpoints implements CheckpointStore {
  saved = new Map<string, ZonePlayerState>();
  load(accountId: string) {
    return Promise.resolve(this.saved.get(accountId) ?? null);
  }
  save(accountId: string, state: ZonePlayerState) {
    this.saved.set(accountId, { ...state });
    return Promise.resolve();
  }
}

class FakeSocket implements WorldSocket {
  readyState = 1;
  sent: string[] = [];
  private message?: (data: { toString(): string }) => void;
  send(data: string) {
    this.sent.push(data);
  }
  on(_event: "message", listener: (data: { toString(): string }) => void) {
    this.message = listener;
  }
  once(event: "close", listener: () => void) {
    void event;
    void listener;
  }
  input(value: object) {
    this.message?.({ toString: () => JSON.stringify(value) });
  }
  latest() {
    return JSON.parse(this.sent.at(-1) ?? "{}") as {
      zoneId: string;
      players: Record<string, ZonePlayerState>;
    };
  }
}

describe("authoritative zone transitions", () => {
  it("rejects a portal request away from its trigger", async () => {
    const room = new HouseRoom(new MemoryCheckpoints(), false);
    const socket = new FakeSocket();
    await room.connect(socket, "player");
    socket.input({ type: "transition", portalId: "front-door" });
    expect(room.snapshot().player?.zoneId).toBe("house");
    await room.close();
  });

  it("moves once, persists the zone and isolates area-of-interest snapshots", async () => {
    const checkpoints = new MemoryCheckpoints();
    checkpoints.saved.set("traveler", {
      x: 320,
      y: 350,
      zoneId: "house",
      lastProcessedSequence: 0,
    });
    const room = new HouseRoom(checkpoints, false);
    const traveler = new FakeSocket();
    const resident = new FakeSocket();
    await room.connect(traveler, "traveler");
    await room.connect(resident, "resident");

    traveler.input({ type: "transition", portalId: "front-door" });
    expect(room.snapshot().traveler).toMatchObject({
      zoneId: "meadow",
      x: 320,
      y: 72,
    });
    expect(traveler.latest().players.resident).toBeUndefined();
    expect(resident.latest().players.traveler).toBeUndefined();
    await new Promise((resolve) => setImmediate(resolve));
    expect(checkpoints.saved.get("traveler")?.zoneId).toBe("meadow");

    traveler.input({ type: "transition", portalId: "front-door" });
    expect(room.snapshot().traveler?.zoneId).toBe("meadow");
    await room.close();
  });
});
