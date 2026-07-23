import type {
  AdminContentManifest,
  AdminRole,
} from "../packages/admin-domain/src/index.js";
import { describe, expect, it } from "vitest";
import type {
  AdminAuditInput,
  SupportProfileRecord,
} from "../apps/server/src/admin/contracts.js";
import { AdminService } from "../apps/server/src/admin/service.js";
import type { AdminAccessError } from "../apps/server/src/admin/service.js";

class MemoryAdminRepository {
  readonly roles = new Map<string, AdminRole>();
  readonly profiles = new Map<string, SupportProfileRecord>();
  readonly audits: AdminAuditInput[] = [];
  readonly releases = new Map<string, string>();
  revoked = 0;

  role(accountId: string): Promise<AdminRole | null> {
    return Promise.resolve(this.roles.get(accountId) ?? null);
  }
  supportProfile(displayName: string): Promise<SupportProfileRecord | null> {
    return Promise.resolve(
      [...this.profiles.values()].find(
        (profile) =>
          profile.displayName.toLowerCase() === displayName.toLowerCase(),
      ) ?? null,
    );
  }
  audit(input: AdminAuditInput): Promise<void> {
    this.audits.push(input);
    return Promise.resolve();
  }
  revokeSessionsAndAudit(
    _targetAccountId: string,
    _now: Date,
    audit: AdminAuditInput,
  ): Promise<number> {
    this.revoked += 2;
    this.audits.push(audit);
    return Promise.resolve(2);
  }
  publishContentAndAudit(
    manifest: AdminContentManifest,
    _actorId: string,
    audit: AdminAuditInput,
  ): Promise<"published" | "existing" | "conflict"> {
    const key = `${manifest.packId}@${manifest.version}`;
    const existing = this.releases.get(key);
    const result =
      existing === manifest.checksum
        ? "existing"
        : existing
          ? "conflict"
          : "published";
    if (!existing) this.releases.set(key, manifest.checksum);
    this.audits.push({
      ...audit,
      outcome: result === "conflict" ? "denied" : "allowed",
    });
    return Promise.resolve(result);
  }
  recentAudits(limit: number) {
    return Promise.resolve(
      this.audits.slice(-limit).map((audit) => ({
        action: audit.action,
        permission: audit.permission,
        outcome: audit.outcome,
        requestId: audit.requestId,
        targetType: audit.targetType ?? null,
        targetRef: audit.targetRef ?? null,
        reason: audit.reason ?? null,
        createdAt: new Date(0),
      })),
    );
  }
}

const secret = "admin-step-up-secret-with-at-least-32-characters";
const manifest: AdminContentManifest = {
  packId: "original:forest",
  version: "1.0.0",
  checksum: "b".repeat(64),
  license: "ORIGINAL",
  entries: [{ id: "original:forest-map", path: "maps/forest.json" }],
};
const credentials = (accountId: string, stepUp = secret) => ({
  accountId,
  stepUp,
  requestId: `request-${accountId}`,
});

function setup() {
  const repository = new MemoryAdminRepository();
  repository.roles.set("support", "SUPPORT");
  repository.roles.set("editor", "CONTENT_EDITOR");
  repository.roles.set("owner", "OWNER");
  repository.profiles.set("player", {
    accountId: "player-account",
    displayName: "Jogadora",
    zoneId: "meadow",
    checkpointUpdatedAt: new Date(0),
    creatureCount: 3,
    inventoryStackCount: 4,
    questCount: 2,
    activeSessionCount: 2,
  });
  return {
    repository,
    service: new AdminService(repository, secret, () => new Date(10)),
  };
}

describe("admin application service", () => {
  it("audits denied elevation without exposing the step-up secret", async () => {
    const { repository, service } = setup();
    await expect(
      service.identity(credentials("support", "wrong-secret")),
    ).rejects.toMatchObject<Partial<AdminAccessError>>({
      code: "admin_unauthorized",
    });
    expect(repository.audits).toMatchObject([
      {
        actorId: "support",
        action: "admin.authorization",
        outcome: "denied",
        reason: "invalid_step_up",
      },
    ]);
    expect(JSON.stringify(repository.audits)).not.toContain("wrong-secret");
  });

  it("returns a minimized profile and requires a signed reference plus confirmation", async () => {
    const { repository, service } = setup();
    const profile = await service.profile(credentials("support"), "Jogadora");
    expect(profile).toMatchObject({
      displayName: "Jogadora",
      zoneId: "meadow",
      creatureCount: 3,
      activeSessionCount: 2,
    });
    expect(profile).not.toHaveProperty("accountId");
    expect(profile).not.toHaveProperty("email");
    await expect(
      service.revokeSessions(
        credentials("support"),
        profile?.supportRef ?? "",
        "WRONG",
        "Conta possivelmente comprometida",
      ),
    ).rejects.toMatchObject({ code: "confirmation_required" });
    await expect(
      service.revokeSessions(
        credentials("support"),
        profile?.supportRef ?? "",
        "REVOKE_SESSIONS",
        "Conta possivelmente comprometida",
      ),
    ).resolves.toEqual({ revoked: 2 });
    expect(repository.revoked).toBe(2);
  });

  it("enforces content RBAC and publishes an immutable version idempotently", async () => {
    const { repository, service } = setup();
    await expect(
      service.validateContent(credentials("support"), manifest),
    ).rejects.toMatchObject({ code: "admin_forbidden" });
    await expect(
      service.validateContent(credentials("editor"), manifest),
    ).resolves.toEqual({ valid: true, errors: [] });
    await expect(
      service.publishContent(
        credentials("editor"),
        manifest,
        "PUBLISH_CONTENT",
      ),
    ).resolves.toEqual({ status: "published" });
    await expect(
      service.publishContent(
        credentials("editor"),
        manifest,
        "PUBLISH_CONTENT",
      ),
    ).resolves.toEqual({ status: "existing" });
    await expect(
      service.publishContent(
        credentials("editor"),
        { ...manifest, checksum: "c".repeat(64) },
        "PUBLISH_CONTENT",
      ),
    ).rejects.toMatchObject({ code: "content_version_conflict" });
    expect(repository.releases.size).toBe(1);
  });

  it("limits audit reading to owners", async () => {
    const { service } = setup();
    await expect(
      service.audits(credentials("support"), 25),
    ).rejects.toMatchObject({ code: "admin_forbidden" });
    await expect(service.audits(credentials("owner"), 25)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "admin.audit.read" }),
      ]),
    );
  });
});
