import type {
  AdminContentManifest,
  AdminPermission,
  AdminRole,
} from "@lt/admin-domain";

export interface AdminCredentials {
  accountId: string | null;
  stepUp: string;
  requestId: string;
}

export interface AdminAuditInput {
  actorId: string | null;
  action: string;
  permission: AdminPermission;
  outcome: "allowed" | "denied" | "not_found";
  requestId: string;
  targetType?: string;
  targetRef?: string;
  reason?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface SupportProfileRecord {
  accountId: string;
  displayName: string;
  zoneId: string | null;
  checkpointUpdatedAt: Date | null;
  creatureCount: number;
  inventoryStackCount: number;
  questCount: number;
  activeSessionCount: number;
}

export interface AdminRepository {
  role(accountId: string): Promise<AdminRole | null>;
  supportProfile(displayName: string): Promise<SupportProfileRecord | null>;
  audit(input: AdminAuditInput): Promise<void>;
  revokeSessionsAndAudit(
    targetAccountId: string,
    now: Date,
    audit: AdminAuditInput,
  ): Promise<number>;
  publishContentAndAudit(
    manifest: AdminContentManifest,
    actorId: string,
    audit: AdminAuditInput,
  ): Promise<"published" | "existing" | "conflict">;
  recentAudits(limit: number): Promise<
    Array<{
      action: string;
      permission: string;
      outcome: string;
      requestId: string;
      targetType: string | null;
      targetRef: string | null;
      reason: string | null;
      createdAt: Date;
    }>
  >;
}
