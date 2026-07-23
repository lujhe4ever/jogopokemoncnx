import { describe, expect, it } from "vitest";
import type {
  AccountRecord,
  AuthRepository,
  PasswordHasher,
  SessionRecord,
} from "../apps/server/src/auth/contracts.js";
import {
  AuthenticationError,
  AuthService,
  argonPasswordHasher,
  tokenHash,
} from "../apps/server/src/auth/service.js";

class MemoryAuthRepository implements AuthRepository {
  accounts = new Map<string, AccountRecord>();
  sessions = new Map<
    string,
    { accountId: string; expiresAt: Date; revokedAt?: Date }
  >();
  tickets = new Map<
    string,
    { accountId: string; expiresAt: Date; used: boolean }
  >();
  audits: boolean[] = [];

  createAccount(input: {
    email: string;
    passwordHash: string;
    displayName: string;
  }): Promise<AccountRecord> {
    const account = {
      id: `account-${String(this.accounts.size + 1)}`,
      ...input,
    };
    this.accounts.set(input.email, account);
    return Promise.resolve(account);
  }

  findAccountByEmail(email: string): Promise<AccountRecord | null> {
    return Promise.resolve(this.accounts.get(email) ?? null);
  }

  createSession(
    accountId: string,
    hash: string,
    expiresAt: Date,
  ): Promise<void> {
    this.sessions.set(hash, { accountId, expiresAt });
    return Promise.resolve();
  }

  findActiveSession(hash: string, now: Date): Promise<SessionRecord | null> {
    const session = this.sessions.get(hash);
    const account = [...this.accounts.values()].find(
      (item) => item.id === session?.accountId,
    );
    return Promise.resolve(
      session && !session.revokedAt && session.expiresAt > now && account
        ? {
            accountId: account.id,
            email: account.email,
            displayName: account.displayName,
          }
        : null,
    );
  }

  revokeSession(hash: string, now: Date): Promise<void> {
    const session = this.sessions.get(hash);
    if (session) session.revokedAt = now;
    return Promise.resolve();
  }

  createTicket(
    accountId: string,
    hash: string,
    expiresAt: Date,
  ): Promise<void> {
    this.tickets.set(hash, { accountId, expiresAt, used: false });
    return Promise.resolve();
  }

  consumeTicket(hash: string, now: Date): Promise<string | null> {
    const ticket = this.tickets.get(hash);
    if (!ticket || ticket.used || ticket.expiresAt <= now)
      return Promise.resolve(null);
    ticket.used = true;
    return Promise.resolve(ticket.accountId);
  }

  audit(_event: string, success: boolean): Promise<void> {
    this.audits.push(success);
    return Promise.resolve();
  }
}

const passwords: PasswordHasher = {
  hash: (password) => Promise.resolve(`hashed:${password}`),
  verify: (hash, password) => Promise.resolve(hash === `hashed:${password}`),
};

describe("authentication service", () => {
  it("hashes passwords with Argon2id instead of storing plaintext", async () => {
    const hash = await argonPasswordHasher.hash("a-secure-password");
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toContain("a-secure-password");
    await expect(
      argonPasswordHasher.verify(hash, "a-secure-password"),
    ).resolves.toBe(true);
  });

  it("registers, logs in, resolves and revokes an opaque session", async () => {
    const repository = new MemoryAuthRepository();
    const auth = new AuthService(
      repository,
      passwords,
      () => new Date("2026-07-23T00:00:00Z"),
    );
    await auth.register("USER@example.com", "long-password", "Player");
    const login = await auth.login("user@example.com", "long-password");

    expect(login.token).not.toContain("user@example.com");
    expect(repository.sessions.has(tokenHash(login.token))).toBe(true);
    expect(await auth.getSession(login.token)).toMatchObject({
      displayName: "Player",
    });
    await auth.logout(login.token);
    expect(await auth.getSession(login.token)).toBeNull();
  });

  it("uses a generic error and audits invalid credentials", async () => {
    const repository = new MemoryAuthRepository();
    const auth = new AuthService(repository, passwords);
    await expect(
      auth.login("missing@example.com", "wrong-password"),
    ).rejects.toBeInstanceOf(AuthenticationError);
    expect(repository.audits).toEqual([false]);
  });

  it("consumes a WebSocket ticket only once", async () => {
    const repository = new MemoryAuthRepository();
    const auth = new AuthService(repository, passwords);
    const account = await auth.register(
      "user@example.com",
      "long-password",
      "Player",
    );
    const ticket = await auth.createWebSocketTicket(account.id);
    await expect(auth.consumeWebSocketTicket(ticket)).resolves.toBe(account.id);
    await expect(auth.consumeWebSocketTicket(ticket)).resolves.toBeNull();
  });
});
