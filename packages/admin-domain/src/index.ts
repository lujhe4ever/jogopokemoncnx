export type AdminRole = "SUPPORT" | "CONTENT_EDITOR" | "OWNER";

export type AdminPermission =
  | "admin:access"
  | "profile:read"
  | "session:revoke"
  | "content:validate"
  | "content:publish"
  | "audit:read";

const ROLE_PERMISSIONS: Readonly<
  Record<AdminRole, ReadonlySet<AdminPermission>>
> = {
  SUPPORT: new Set(["admin:access", "profile:read", "session:revoke"]),
  CONTENT_EDITOR: new Set([
    "admin:access",
    "content:validate",
    "content:publish",
  ]),
  OWNER: new Set([
    "admin:access",
    "profile:read",
    "session:revoke",
    "content:validate",
    "content:publish",
    "audit:read",
  ]),
};

export function hasAdminPermission(
  role: AdminRole,
  permission: AdminPermission,
): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}

export interface AdminContentManifest {
  packId: string;
  version: string;
  checksum: string;
  license: "ORIGINAL" | "CC0";
  entries: ReadonlyArray<{
    id: string;
    path: string;
  }>;
}

const PACK_ID = /^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/;
const VERSION = /^[0-9]+\.[0-9]+\.[0-9]+$/;
const CHECKSUM = /^[a-f0-9]{64}$/;
const ENTRY_PATH = /^[a-zA-Z0-9_./-]+\.(json|png|webp|ogg)$/;

export function validateAdminContentManifest(
  manifest: AdminContentManifest,
): readonly string[] {
  const errors: string[] = [];
  if (!PACK_ID.test(manifest.packId)) errors.push("invalid_pack_id");
  if (!VERSION.test(manifest.version)) errors.push("invalid_version");
  if (!CHECKSUM.test(manifest.checksum)) errors.push("invalid_checksum");
  if (manifest.entries.length < 1 || manifest.entries.length > 200)
    errors.push("invalid_entry_count");
  const ids = new Set<string>();
  for (const entry of manifest.entries) {
    if (!PACK_ID.test(entry.id)) errors.push("invalid_entry_id");
    if (
      !ENTRY_PATH.test(entry.path) ||
      entry.path.includes("..") ||
      entry.path.startsWith("/")
    )
      errors.push("invalid_entry_path");
    if (ids.has(entry.id)) errors.push("duplicate_entry_id");
    ids.add(entry.id);
  }
  return [...new Set(errors)];
}
