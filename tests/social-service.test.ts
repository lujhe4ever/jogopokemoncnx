import { describe, expect, it } from "vitest";
import {
  ArenaSocialService,
  type SocialPeer,
} from "../apps/server/src/arena/social-service.js";

const peers: SocialPeer[] = [
  { accountId: "internal-a", playerId: "public-a", displayName: "Ana" },
  { accountId: "internal-b", playerId: "public-b", displayName: "Beto" },
];

function harness(now = 10_000) {
  let id = 0;
  let currentTime = now;
  const direct: Array<{ accountId: string; payload: Record<string, unknown> }> =
    [];
  const broadcasts: Array<Record<string, unknown>> = [];
  const service = new ArenaSocialService(
    "arena-1",
    () => currentTime,
    () => `generated-${String(++id)}`,
  );
  return {
    service,
    direct,
    broadcasts,
    setTime: (value: number) => {
      currentTime = value;
    },
    send: (accountId: string, payload: object) => {
      direct.push({
        accountId,
        payload: payload as Record<string, unknown>,
      });
    },
    broadcast: (payload: object) => {
      broadcasts.push(payload as Record<string, unknown>);
    },
  };
}

describe("arena social service", () => {
  it("adds server authorship/time, deduplicates requests and rate limits flood", () => {
    const test = harness();
    const chat = (requestId: string) => ({
      type: "social_chat",
      requestId,
      text: "Olá arena",
    });
    test.service.handle(
      chat("chat-1"),
      "internal-a",
      peers,
      test.send,
      test.broadcast,
    );
    test.service.handle(
      chat("chat-1"),
      "internal-a",
      peers,
      test.send,
      test.broadcast,
    );
    test.service.handle(
      chat("chat-2"),
      "internal-a",
      peers,
      test.send,
      test.broadcast,
    );
    test.service.handle(
      chat("chat-3"),
      "internal-a",
      peers,
      test.send,
      test.broadcast,
    );
    test.service.handle(
      chat("chat-4"),
      "internal-a",
      peers,
      test.send,
      test.broadcast,
    );

    expect(test.broadcasts).toHaveLength(3);
    expect(test.broadcasts[0]).toMatchObject({
      type: "social_chat",
      id: "generated-1",
      author: { playerId: "public-a", displayName: "Ana" },
      text: "Olá arena",
      sentAt: "1970-01-01T00:00:10.000Z",
    });
    expect(JSON.stringify(test.broadcasts)).not.toContain("internal-a");
    expect(test.direct.at(-1)).toMatchObject({
      accountId: "internal-a",
      payload: { type: "social_error", code: "rate_limited" },
    });
  });

  it("accepts a targeted invite exactly once and revalidates presence", () => {
    const test = harness();
    test.service.handle(
      {
        type: "social_invite",
        requestId: "invite-request",
        targetPlayerId: "public-b",
      },
      "internal-a",
      peers,
      test.send,
      test.broadcast,
    );
    const invite = test.direct.find(
      ({ accountId }) => accountId === "internal-b",
    )?.payload;
    expect(invite).toMatchObject({
      type: "social_invite",
      inviteId: "generated-1",
      from: { playerId: "public-a", displayName: "Ana" },
    });

    const accept = {
      type: "social_invite_accept",
      requestId: "accept-1",
      inviteId: "generated-1",
    };
    test.service.handle(accept, "internal-b", peers, test.send, test.broadcast);
    expect(
      test.direct.filter(
        ({ payload }) => payload.type === "social_challenge_ready",
      ),
    ).toHaveLength(2);
    test.service.handle(
      { ...accept, requestId: "accept-2" },
      "internal-b",
      peers,
      test.send,
      test.broadcast,
    );
    expect(test.direct.at(-1)).toMatchObject({
      accountId: "internal-b",
      payload: { type: "social_error", code: "invite_unavailable" },
    });

    test.service.handle(
      {
        type: "social_invite",
        requestId: "invite-missing",
        targetPlayerId: "public-b",
      },
      "internal-a",
      peers,
      test.send,
      test.broadcast,
    );
    test.setTime(50_001);
    test.service.handle(
      {
        type: "social_invite_accept",
        requestId: "accept-expired",
        inviteId: "generated-2",
      },
      "internal-b",
      peers.slice(1),
      test.send,
      test.broadcast,
    );
    expect(test.direct.at(-1)).toMatchObject({
      payload: { type: "social_error", code: "invite_unavailable" },
    });
  });

  it("rejects unknown emotes without broadcasting", () => {
    const test = harness();
    test.service.handle(
      {
        type: "social_emote",
        requestId: "emote-1",
        emoteId: "script",
      },
      "internal-a",
      peers,
      test.send,
      test.broadcast,
    );
    expect(test.broadcasts).toEqual([]);
    expect(test.direct[0]).toMatchObject({
      payload: { type: "social_error", code: "unknown_emote" },
    });
  });
});
