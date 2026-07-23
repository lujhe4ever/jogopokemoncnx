export interface AccountRecord {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
}

export interface SessionRecord {
  accountId: string;
  email: string;
  displayName: string;
}

export interface AuthRepository {
  createAccount(input: {
    email: string;
    passwordHash: string;
    displayName: string;
  }): Promise<AccountRecord>;
  findAccountByEmail(email: string): Promise<AccountRecord | null>;
  createSession(
    accountId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void>;
  findActiveSession(
    tokenHash: string,
    now: Date,
  ): Promise<SessionRecord | null>;
  revokeSession(tokenHash: string, now: Date): Promise<void>;
  createTicket(
    accountId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void>;
  consumeTicket(tokenHash: string, now: Date): Promise<string | null>;
  audit(event: string, success: boolean, ipHash?: string): Promise<void>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
}
