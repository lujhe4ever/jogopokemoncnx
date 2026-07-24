import {
  hasAdminPermission,
  validateAdminContentManifest,
  type AdminContentManifest,
  type AdminPermission,
  type AdminRole,
} from "@lt/admin-domain";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type {
  AdminAuditInput,
  AdminCredentials,
  AdminRepository,
} from "./contracts.js";

export class AdminAccessError extends Error {
  constructor(
    readonly code:
      | "admin_unauthorized"
      | "admin_forbidden"
      | "invalid_support_reference"
      | "confirmation_required"
      | "content_invalid"
      | "content_version_conflict",
    readonly status: 400 | 401 | 403 | 409,
  ) {
    super(code);
  }
}

interface AuthorizedAdmin {
  accountId: string;
  role: AdminRole;
}

export class AdminService {
  constructor(
    private readonly repository: AdminRepository,
    private readonly stepUpSecret: string,
    private readonly clock: () => Date = () => new Date(),
  ) {
    if (stepUpSecret.length < 32) throw new Error("weak_admin_step_up_secret");
  }

  async identity(credentials: AdminCredentials) {
    const actor = await this.authorize(credentials, "admin:access");
    await this.audit(credentials, actor, "admin.identity", "admin:access");
    return { role: actor.role };
  }

  async profile(credentials: AdminCredentials, displayName: string) {
    const actor = await this.authorize(credentials, "profile:read");
    const profile = await this.repository.supportProfile(displayName);
    await this.audit(
      credentials,
      actor,
      "admin.profile.read",
      "profile:read",
      profile ? "allowed" : "not_found",
      "profile",
      createHash("sha256").update(displayName).digest("hex").slice(0, 16),
    );
    return profile
      ? {
          supportRef: this.supportReference(profile.accountId),
          displayName: profile.displayName,
          zoneId: profile.zoneId,
          checkpointUpdatedAt: profile.checkpointUpdatedAt,
          creatureCount: profile.creatureCount,
          inventoryStackCount: profile.inventoryStackCount,
          questCount: profile.questCount,
          activeSessionCount: profile.activeSessionCount,
        }
      : null;
  }

  async revokeSessions(
    credentials: AdminCredentials,
    supportRef: string,
    confirmation: string,
    reason: string,
  ) {
    const actor = await this.authorize(credentials, "session:revoke");
    if (confirmation !== "REVOKE_SESSIONS") {
      await this.audit(
        credentials,
        actor,
        "admin.session.revoke",
        "session:revoke",
        "denied",
        "account",
        this.safeReference(supportRef),
        "confirmation_required",
      );
      throw new AdminAccessError("confirmation_required", 400);
    }
    const accountId = this.accountFromSupportReference(supportRef);
    if (!accountId) {
      await this.audit(
        credentials,
        actor,
        "admin.session.revoke",
        "session:revoke",
        "denied",
        "account",
        this.safeReference(supportRef),
        "invalid_support_reference",
      );
      throw new AdminAccessError("invalid_support_reference", 400);
    }
    const targetRef = this.safeReference(supportRef);
    const revoked = await this.repository.revokeSessionsAndAudit(
      accountId,
      this.clock(),
      this.auditInput(
        credentials,
        actor,
        "admin.session.revoke",
        "session:revoke",
        "allowed",
        "account",
        targetRef,
        reason,
      ),
    );
    return { revoked };
  }

  async validateContent(
    credentials: AdminCredentials,
    manifest: AdminContentManifest,
  ) {
    const actor = await this.authorize(credentials, "content:validate");
    const errors = validateAdminContentManifest(manifest);
    await this.audit(
      credentials,
      actor,
      "admin.content.validate",
      "content:validate",
      errors.length === 0 ? "allowed" : "denied",
      "content_pack",
      manifest.packId,
      errors.join(",") || undefined,
    );
    return { valid: errors.length === 0, errors };
  }

  async publishContent(
    credentials: AdminCredentials,
    manifest: AdminContentManifest,
    confirmation: string,
  ) {
    const actor = await this.authorize(credentials, "content:publish");
    const errors = validateAdminContentManifest(manifest);
    if (errors.length > 0) {
      await this.audit(
        credentials,
        actor,
        "admin.content.publish",
        "content:publish",
        "denied",
        "content_pack",
        manifest.packId,
        errors.join(","),
      );
      throw new AdminAccessError("content_invalid", 400);
    }
    if (confirmation !== "PUBLISH_CONTENT") {
      await this.audit(
        credentials,
        actor,
        "admin.content.publish",
        "content:publish",
        "denied",
        "content_pack",
        manifest.packId,
        "confirmation_required",
      );
      throw new AdminAccessError("confirmation_required", 400);
    }
    const result = await this.repository.publishContentAndAudit(
      manifest,
      actor.accountId,
      this.auditInput(
        credentials,
        actor,
        "admin.content.publish",
        "content:publish",
        "allowed",
        "content_pack",
        manifest.packId,
      ),
    );
    if (result === "conflict")
      throw new AdminAccessError("content_version_conflict", 409);
    return { status: result };
  }

  async audits(credentials: AdminCredentials, limit: number) {
    const actor = await this.authorize(credentials, "audit:read");
    await this.audit(credentials, actor, "admin.audit.read", "audit:read");
    return this.repository.recentAudits(limit);
  }

  private async authorize(
    credentials: AdminCredentials,
    permission: AdminPermission,
  ): Promise<AuthorizedAdmin> {
    const role = credentials.accountId
      ? await this.repository.role(credentials.accountId)
      : null;
    const secretMatches = this.matchesSecret(credentials.stepUp);
    if (!credentials.accountId || !role || !secretMatches) {
      await this.repository.audit({
        actorId: credentials.accountId,
        action: "admin.authorization",
        permission,
        outcome: "denied",
        requestId: credentials.requestId,
        reason: !credentials.accountId
          ? "missing_session"
          : !role
            ? "missing_role"
            : "invalid_step_up",
      });
      throw new AdminAccessError("admin_unauthorized", 401);
    }
    if (!hasAdminPermission(role, permission)) {
      await this.repository.audit({
        actorId: credentials.accountId,
        action: "admin.authorization",
        permission,
        outcome: "denied",
        requestId: credentials.requestId,
        reason: "missing_permission",
      });
      throw new AdminAccessError("admin_forbidden", 403);
    }
    return { accountId: credentials.accountId, role };
  }

  private audit(
    credentials: AdminCredentials,
    actor: AuthorizedAdmin,
    action: string,
    permission: AdminPermission,
    outcome: AdminAuditInput["outcome"] = "allowed",
    targetType?: string,
    targetRef?: string,
    reason?: string,
  ): Promise<void> {
    return this.repository.audit(
      this.auditInput(
        credentials,
        actor,
        action,
        permission,
        outcome,
        targetType,
        targetRef,
        reason,
      ),
    );
  }

  private auditInput(
    credentials: AdminCredentials,
    actor: AuthorizedAdmin,
    action: string,
    permission: AdminPermission,
    outcome: AdminAuditInput["outcome"],
    targetType?: string,
    targetRef?: string,
    reason?: string,
  ): AdminAuditInput {
    return {
      actorId: actor.accountId,
      action,
      permission,
      outcome,
      requestId: credentials.requestId,
      ...(targetType ? { targetType } : {}),
      ...(targetRef ? { targetRef } : {}),
      ...(reason ? { reason } : {}),
    };
  }

  private matchesSecret(candidate: string): boolean {
    const expected = createHash("sha256").update(this.stepUpSecret).digest();
    const actual = createHash("sha256").update(candidate).digest();
    return timingSafeEqual(expected, actual);
  }

  private supportReference(accountId: string): string {
    const encoded = Buffer.from(accountId).toString("base64url");
    const signature = createHmac("sha256", this.stepUpSecret)
      .update(encoded)
      .digest("base64url");
    return `${encoded}.${signature}`;
  }

  private accountFromSupportReference(reference: string): string | null {
    const [encoded, signature] = reference.split(".");
    if (!encoded || !signature) return null;
    const expected = createHmac("sha256", this.stepUpSecret)
      .update(encoded)
      .digest();
    let actual: Buffer;
    try {
      actual = Buffer.from(signature, "base64url");
    } catch {
      return null;
    }
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      return null;
    return Buffer.from(encoded, "base64url").toString();
  }

  private safeReference(reference: string): string {
    return createHash("sha256").update(reference).digest("hex").slice(0, 16);
  }
}
