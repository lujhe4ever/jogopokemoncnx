import { describe, expect, it } from "vitest";
import { PvpService } from "../apps/server/src/battles/pvp-service.js";

class MemoryPvpDatabase {
  readonly creatures = new Set(["account-a", "account-b"]);
  readonly records = new Map<
    string,
    {
      id: string;
      status: string;
      winnerId: string | null;
      finishedAt: Date | null;
    }
  >();

  readonly creature = {
    findFirst: ({ where }: { where: { ownerId: string } }) =>
      Promise.resolve(
        this.creatures.has(where.ownerId)
          ? {
              definitionId: `creature:${where.ownerId}`,
              level: 5,
              teamSlot: 1,
              createdAt: new Date(0),
            }
          : null,
      ),
  };

  readonly pvpBattleRecord = {
    create: ({ data }: { data: { id: string } }) => {
      const record = {
        id: data.id,
        status: "active",
        winnerId: null,
        finishedAt: null,
      };
      this.records.set(data.id, record);
      return Promise.resolve(record);
    },
    updateMany: ({
      where,
      data,
    }: {
      where: { id: string; finishedAt: null };
      data: { status: string; winnerId: string | null; finishedAt: Date };
    }) => {
      const current = this.records.get(where.id);
      if (!current || current.finishedAt) return Promise.resolve({ count: 0 });
      this.records.set(where.id, {
        ...current,
        status: data.status,
        winnerId: data.winnerId,
        finishedAt: data.finishedAt,
      });
      return Promise.resolve({ count: 1 });
    },
  };
}

const participants = [
  {
    accountId: "account-a",
    playerId: "public-a",
    displayName: "Ana",
  },
  {
    accountId: "account-b",
    playerId: "public-b",
    displayName: "Beto",
  },
] as const;

describe("PvP application service", () => {
  it("requires owned creatures and persists disconnect once", async () => {
    const database = new MemoryPvpDatabase();
    const delivered: Array<{
      accountId: string;
      payload: Record<string, unknown>;
    }> = [];
    const broadcasts: string[] = [];
    const service = new PvpService(
      database as never,
      () => "pvp-1",
      () => 42,
    );
    const deliver = (accountId: string, payload: object) => {
      delivered.push({
        accountId,
        payload: payload as Record<string, unknown>,
      });
    };
    expect(
      await service.start(
        "arena-1",
        participants[0],
        participants[1],
        deliver,
        (event) => {
          broadcasts.push(event);
        },
      ),
    ).toBe(true);
    expect(
      delivered.filter(({ payload }) => payload.type === "pvp_started"),
    ).toHaveLength(2);
    expect(
      JSON.stringify(delivered.map(({ payload }) => payload)),
    ).not.toContain('"accountId"');
    service.handle(
      {
        type: "pvp_choice",
        battleId: "pvp-1",
        sequence: 1,
        action: "strike",
      },
      "spectator-account",
    );
    expect(delivered.at(-1)).toMatchObject({
      accountId: "spectator-account",
      payload: { type: "pvp_error", code: "spectator_read_only" },
    });

    service.disconnect("account-a");
    await new Promise((resolve) => setImmediate(resolve));
    expect(database.records.get("pvp-1")).toMatchObject({
      status: "finished",
      winnerId: "account-b",
    });
    expect(
      delivered.filter(({ payload }) => payload.type === "pvp_finished"),
    ).toHaveLength(2);
    expect(
      delivered.find(
        ({ accountId, payload }) =>
          accountId === "account-b" && payload.type === "pvp_finished",
      )?.payload,
    ).toMatchObject({ state: { winnerPlayerId: "public-b" } });
    expect(broadcasts).toEqual(["started", "finished"]);
    service.disconnect("account-a");
    expect(database.records.size).toBe(1);
    expect(broadcasts).toHaveLength(2);
    service.close();
  });

  it("keeps each choice private until both players have submitted", async () => {
    const database = new MemoryPvpDatabase();
    const delivered: Array<{
      accountId: string;
      payload: Record<string, unknown>;
    }> = [];
    const service = new PvpService(
      database as never,
      () => "pvp-private",
      () => 42,
    );
    await service.start(
      "arena-1",
      participants[0],
      participants[1],
      (accountId, payload) => {
        delivered.push({
          accountId,
          payload: payload as Record<string, unknown>,
        });
      },
    );
    delivered.length = 0;

    expect(
      service.handle(
        {
          type: "pvp_choice",
          battleId: "pvp-private",
          sequence: 1,
          action: "strike",
        },
        "account-a",
      ),
    ).toBe(true);
    expect(delivered).toEqual([
      {
        accountId: "account-a",
        payload: {
          protocolVersion: 1,
          type: "pvp_choice_received",
          battleId: "pvp-private",
          sequence: 1,
        },
      },
    ]);

    service.handle(
      {
        type: "pvp_choice",
        battleId: "pvp-private",
        sequence: 1,
        action: "guard",
      },
      "account-b",
    );
    expect(
      delivered.filter(({ payload }) => payload.type === "pvp_turn_resolved"),
    ).toHaveLength(2);
    expect(JSON.stringify(delivered)).not.toContain('"action"');
    service.close();
  });

  it("rejects a challenge when either participant has no creature", async () => {
    const database = new MemoryPvpDatabase();
    database.creatures.delete("account-b");
    const service = new PvpService(database as never);
    expect(
      await service.start(
        "arena-1",
        participants[0],
        participants[1],
        () => {},
      ),
    ).toBe(false);
    expect(database.records.size).toBe(0);
    service.close();
  });
});
