import { createHash, randomBytes } from "node:crypto";
import argon2 from "argon2";
import type {
  AccountRecord,
  AuthRepository,
  PasswordHasher,
  SessionRecord,
} from "./contracts.js";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TICKET_TTL_MS = 30 * 1000;

export class AuthenticationError extends Error {}

export const argonPasswordHasher: PasswordHasher = {
  hash: (password) =>
    argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    }),
  verify: (hash, password) => argon2.verify(hash, password),
};

function opaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly passwords: PasswordHasher = argonPasswordHasher,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async register(
    email: string,
    password: string,
    displayName: string,
  ): Promise<AccountRecord> {
    const normalizedEmail = email.trim().toLowerCase();
    if (await this.repository.findAccountByEmail(normalizedEmail)) {
      throw new AuthenticationError("Unable to create account");
    }
    return this.repository.createAccount({
      email: normalizedEmail,
      passwordHash: await this.passwords.hash(password),
      displayName: displayName.trim(),
    });
  }

  async login(email: string, password: string, ipHash?: string) {
    const account = await this.repository.findAccountByEmail(
      email.trim().toLowerCase(),
    );
    const valid = account
      ? await this.passwords.verify(account.passwordHash, password)
      : false;
    await this.repository.audit("login", valid, ipHash);
    if (!account || !valid)
      throw new AuthenticationError("Invalid credentials");
    const token = opaqueToken();
    await this.repository.createSession(
      account.id,
      tokenHash(token),
      new Date(this.clock().getTime() + SESSION_TTL_MS),
    );
    return {
      token,
      profile: {
        id: account.id,
        email: account.email,
        displayName: account.displayName,
      },
    };
  }

  getSession(token: string): Promise<SessionRecord | null> {
    return this.repository.findActiveSession(tokenHash(token), this.clock());
  }

  async logout(token: string): Promise<void> {
    await this.repository.revokeSession(tokenHash(token), this.clock());
  }

  async createWebSocketTicket(accountId: string): Promise<string> {
    const ticket = opaqueToken();
    await this.repository.createTicket(
      accountId,
      tokenHash(ticket),
      new Date(this.clock().getTime() + TICKET_TTL_MS),
    );
    return ticket;
  }

  consumeWebSocketTicket(ticket: string): Promise<string | null> {
    return this.repository.consumeTicket(tokenHash(ticket), this.clock());
  }
}
