import { describe, expect, it } from "vitest";
import {
  HouseRoom,
  type CheckpointStore,
  type WorldSocket,
  type ZonePlayerState,
} from "../apps/server/src/world/house-room.js";
import {
  canAddReward,
  type InteractionStore,
  type Reward,
  type RewardResult,
} from "../apps/server/src/world/interaction-store.js";

class MemoryCheckpoints implements CheckpointStore {
  constructor(private readonly state: ZonePlayerState) {}
  load() {
    return Promise.resolve({ ...this.state });
  }
  save(_accountId: string, state: ZonePlayerState) {
    this.state = { ...state };
    return Promise.resolve();
  }
}

class MemoryInteractions implements InteractionStore {
  calls = 0;
  private readonly claims = new Set<string>();
  claim(accountId: string, interactionId: string, reward: Reward) {
    this.calls += 1;
    const key = `${accountId}:${interactionId}`;
    const result: RewardResult = this.claims.has(key)
      ? { status: "already_claimed" }
      : {
          status: "granted",
          itemId: reward.itemId,
          quantity: reward.quantity,
          total: reward.quantity,
        };
    this.claims.add(key);
    return Promise.resolve(result);
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
  result() {
    return JSON.parse(this.sent.at(-1) ?? "{}") as {
      type: string;
      status: string;
      dialogue?: string[];
    };
  }
}

const state = (zoneId: string, x: number, y: number): ZonePlayerState => ({
  zoneId,
  x,
  y,
  lastProcessedSequence: 0,
});

describe("contextual interactions", () => {
  it("serves declarative NPC dialogue without infrastructure rules", async () => {
    const socket = new FakeSocket();
    const room = new HouseRoom(
      new MemoryCheckpoints(state("house", 270, 190)),
      false,
    );
    await room.connect(socket, "player");
    socket.input({
      type: "interact",
      requestId: "dialogue-1",
      interactionId: "npc:caretaker",
    });
    await new Promise((resolve) => setImmediate(resolve));
    expect(socket.result()).toMatchObject({
      type: "interaction_result",
      status: "dialogue",
    });
    expect(socket.result().dialogue?.length).toBeGreaterThan(0);
    await room.close();
  });

  it("validates distance and makes reward retries idempotent", async () => {
    const store = new MemoryInteractions();
    const socket = new FakeSocket();
    const room = new HouseRoom(
      new MemoryCheckpoints(state("meadow", 250, 170)),
      false,
      store,
    );
    await room.connect(socket, "player");
    const request = {
      type: "interact",
      requestId: "pickup-1",
      interactionId: "pickup:herb-01",
    };
    socket.input(request);
    await new Promise((resolve) => setImmediate(resolve));
    expect(socket.result().status).toBe("granted");
    socket.input({ ...request, requestId: "pickup-retry" });
    await new Promise((resolve) => setImmediate(resolve));
    expect(socket.result().status).toBe("already_claimed");
    expect(store.calls).toBe(2);
    await room.close();

    const distantStore = new MemoryInteractions();
    const distant = new FakeSocket();
    const distantRoom = new HouseRoom(
      new MemoryCheckpoints(state("meadow", 500, 350)),
      false,
      distantStore,
    );
    await distantRoom.connect(distant, "player");
    distant.input(request);
    await new Promise((resolve) => setImmediate(resolve));
    expect(distant.result().status).toBe("unavailable");
    expect(distantStore.calls).toBe(0);
    await distantRoom.close();
  });

  it("preserves slot and stack limits", () => {
    expect(canAddReward(null, 19, 1)).toBe(true);
    expect(canAddReward(null, 20, 1)).toBe(false);
    expect(canAddReward(98, 20, 1)).toBe(true);
    expect(canAddReward(99, 1, 1)).toBe(false);
    expect(canAddReward(null, 0, 100)).toBe(false);
    expect(canAddReward(null, 0, 0)).toBe(false);
  });

  it("issues a short-lived encounter authorization only from proximity", async () => {
    const socket = new FakeSocket();
    const room = new HouseRoom(
      new MemoryCheckpoints(state("meadow", 540, 130)),
      false,
    );
    await room.connect(socket, "player");
    socket.input({
      type: "interact",
      requestId: "encounter-1",
      interactionId: "encounter:nightleaf-01",
    });
    await new Promise((resolve) => setImmediate(resolve));
    const result = JSON.parse(socket.sent.at(-1) ?? "{}") as {
      status?: string;
      authorization?: string;
    };
    expect(result.status).toBe("encounter_available");
    expect(result.authorization).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
    );
    expect(
      room.consumeEncounterAuthorization("player", result.authorization ?? ""),
    ).toBe("meadow");
    expect(
      room.consumeEncounterAuthorization("player", result.authorization ?? ""),
    ).toBeNull();
    await room.close();
  });
});
