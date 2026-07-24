import { describe, expect, it } from "vitest";
import {
  hasAdminPermission,
  validateAdminContentManifest,
} from "../packages/admin-domain/src/index.js";

const validManifest = {
  packId: "original:meadow",
  version: "1.0.0",
  checksum: "a".repeat(64),
  license: "ORIGINAL" as const,
  entries: [{ id: "original:map", path: "maps/meadow.json" }],
};

describe("admin domain policy", () => {
  it("keeps support, content and owner permissions separated", () => {
    expect(hasAdminPermission("CONTENT_EDITOR", "admin:access")).toBe(true);
    expect(hasAdminPermission("SUPPORT", "profile:read")).toBe(true);
    expect(hasAdminPermission("SUPPORT", "content:publish")).toBe(false);
    expect(hasAdminPermission("CONTENT_EDITOR", "content:publish")).toBe(true);
    expect(hasAdminPermission("CONTENT_EDITOR", "session:revoke")).toBe(false);
    expect(hasAdminPermission("OWNER", "audit:read")).toBe(true);
  });

  it("accepts declarative original content and rejects traversal or scripts", () => {
    expect(validateAdminContentManifest(validManifest)).toEqual([]);
    expect(
      validateAdminContentManifest({
        ...validManifest,
        entries: [
          { id: "original:unsafe", path: "../scripts/payload.js" },
          { id: "original:unsafe", path: "scripts/payload.js" },
        ],
      }),
    ).toEqual(
      expect.arrayContaining(["invalid_entry_path", "duplicate_entry_id"]),
    );
  });
});
