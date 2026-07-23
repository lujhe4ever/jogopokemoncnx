import {
  applySlidingWindow,
  isSocialEmote,
  validateChatText,
} from "@lt/social-domain";
import { randomUUID } from "node:crypto";
import { z } from "zod";

const socialMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("social_chat"),
    requestId: z.string().min(1).max(80),
    text: z.string().max(400),
  }),
  z.object({
    type: z.literal("social_emote"),
    requestId: z.string().min(1).max(80),
    emoteId: z.string().min(1).max(40),
  }),
  z.object({
    type: z.literal("social_invite"),
    requestId: z.string().min(1).max(80),
    targetPlayerId: z.string().min(1).max(80),
  }),
  z.object({
    type: z.literal("social_invite_accept"),
    requestId: z.string().min(1).max(80),
    inviteId: z.string().min(1).max(80),
  }),
]);

export interface SocialPeer {
  accountId: string;
  playerId: string;
  displayName: string;
}

interface SocialLimits {
  chat: number[];
  emote: number[];
  invite: number[];
  requests: Set<string>;
}

interface SocialInvite {
  id: string;
  inviterAccountId: string;
  targetAccountId: string;
  inviterPlayerId: string;
  targetPlayerId: string;
  expiresAt: number;
  used: boolean;
}

export type SendSocial = (accountId: string, payload: object) => void;
export type BroadcastSocial = (payload: object) => void;

export class ArenaSocialService {
  private readonly limits = new Map<string, SocialLimits>();
  private readonly invites = new Map<string, SocialInvite>();

  constructor(
    private readonly roomId: string,
    private readonly clock: () => number = Date.now,
    private readonly id: () => string = randomUUID,
  ) {}

  handle(
    raw: unknown,
    senderAccountId: string,
    peers: readonly SocialPeer[],
    send: SendSocial,
    broadcast: BroadcastSocial,
  ): boolean {
    const parsed = socialMessageSchema.safeParse(raw);
    if (!parsed.success) return false;
    const sender = peers.find(({ accountId }) => accountId === senderAccountId);
    if (!sender) return true;
    const limits = this.getLimits(senderAccountId);
    if (limits.requests.has(parsed.data.requestId)) return true;
    this.rememberRequest(limits.requests, parsed.data.requestId);
    const now = this.clock();

    if (parsed.data.type === "social_chat") {
      const rate = applySlidingWindow(limits.chat, now, 3, 5_000);
      limits.chat = rate.timestamps;
      if (!rate.allowed) {
        this.error(send, senderAccountId, "rate_limited", rate.retryAfterMs);
        return true;
      }
      const chat = validateChatText(parsed.data.text);
      if (!chat.accepted) {
        this.error(send, senderAccountId, "invalid_message");
        return true;
      }
      broadcast({
        protocolVersion: 1,
        type: "social_chat",
        roomId: this.roomId,
        id: this.id(),
        author: {
          playerId: sender.playerId,
          displayName: sender.displayName,
        },
        text: chat.text,
        sentAt: new Date(now).toISOString(),
      });
      return true;
    }

    if (parsed.data.type === "social_emote") {
      const rate = applySlidingWindow(limits.emote, now, 5, 10_000);
      limits.emote = rate.timestamps;
      if (!rate.allowed) {
        this.error(send, senderAccountId, "rate_limited", rate.retryAfterMs);
        return true;
      }
      if (!isSocialEmote(parsed.data.emoteId)) {
        this.error(send, senderAccountId, "unknown_emote");
        return true;
      }
      broadcast({
        protocolVersion: 1,
        type: "social_emote",
        roomId: this.roomId,
        id: this.id(),
        playerId: sender.playerId,
        emoteId: parsed.data.emoteId,
        expiresAt: new Date(now + 4_000).toISOString(),
      });
      return true;
    }

    if (parsed.data.type === "social_invite") {
      const rate = applySlidingWindow(limits.invite, now, 3, 30_000);
      limits.invite = rate.timestamps;
      if (!rate.allowed) {
        this.error(send, senderAccountId, "rate_limited", rate.retryAfterMs);
        return true;
      }
      const targetPlayerId = parsed.data.targetPlayerId;
      const target = peers.find(({ playerId }) => playerId === targetPlayerId);
      if (!target || target.accountId === senderAccountId) {
        this.error(send, senderAccountId, "target_unavailable");
        return true;
      }
      const invite: SocialInvite = {
        id: this.id(),
        inviterAccountId: senderAccountId,
        targetAccountId: target.accountId,
        inviterPlayerId: sender.playerId,
        targetPlayerId: target.playerId,
        expiresAt: now + 30_000,
        used: false,
      };
      this.invites.set(invite.id, invite);
      send(target.accountId, {
        protocolVersion: 1,
        type: "social_invite",
        roomId: this.roomId,
        inviteId: invite.id,
        from: {
          playerId: sender.playerId,
          displayName: sender.displayName,
        },
        expiresAt: new Date(invite.expiresAt).toISOString(),
      });
      send(senderAccountId, {
        protocolVersion: 1,
        type: "social_invite_sent",
        inviteId: invite.id,
        targetPlayerId: target.playerId,
      });
      return true;
    }

    const invite = this.invites.get(parsed.data.inviteId);
    const inviterPresent = invite
      ? peers.some(({ accountId }) => accountId === invite.inviterAccountId)
      : false;
    const targetPresent = invite
      ? peers.some(({ accountId }) => accountId === invite.targetAccountId)
      : false;
    if (
      !invite ||
      invite.targetAccountId !== senderAccountId ||
      invite.used ||
      invite.expiresAt < now ||
      !inviterPresent ||
      !targetPresent
    ) {
      this.error(send, senderAccountId, "invite_unavailable");
      return true;
    }
    invite.used = true;
    const payload = {
      protocolVersion: 1,
      type: "social_challenge_ready",
      roomId: this.roomId,
      inviteId: invite.id,
      participants: [invite.inviterPlayerId, invite.targetPlayerId],
      acceptedAt: new Date(now).toISOString(),
    };
    send(invite.inviterAccountId, payload);
    send(invite.targetAccountId, payload);
    return true;
  }

  remove(accountId: string): void {
    this.limits.delete(accountId);
    for (const [id, invite] of this.invites)
      if (
        invite.inviterAccountId === accountId ||
        invite.targetAccountId === accountId
      )
        this.invites.delete(id);
  }

  purge(): void {
    const now = this.clock();
    for (const [id, invite] of this.invites)
      if (invite.used || invite.expiresAt < now) this.invites.delete(id);
  }

  private getLimits(accountId: string): SocialLimits {
    const limits = this.limits.get(accountId) ?? {
      chat: [],
      emote: [],
      invite: [],
      requests: new Set<string>(),
    };
    this.limits.set(accountId, limits);
    return limits;
  }

  private rememberRequest(requests: Set<string>, requestId: string): void {
    requests.add(requestId);
    if (requests.size <= 100) return;
    const oldest = requests.values().next().value;
    if (oldest) requests.delete(oldest);
  }

  private error(
    send: SendSocial,
    accountId: string,
    code:
      | "rate_limited"
      | "invalid_message"
      | "unknown_emote"
      | "target_unavailable"
      | "invite_unavailable",
    retryAfterMs?: number,
  ): void {
    send(accountId, {
      protocolVersion: 1,
      type: "social_error",
      code,
      ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
    });
  }
}
