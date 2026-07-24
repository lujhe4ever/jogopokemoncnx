import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  AssetCatalogAuditError,
  auditAssetCatalogs,
} from "../scripts/lib/asset-catalog-audit.mjs";

const temporaryRoots = [];

async function readJson(relativePath) {
  return JSON.parse(await readFile(relativePath, "utf8"));
}

async function writeJson(root, relativePath, value) {
  const target = path.join(root, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(value)}\n`);
}

async function minimalFixture(mutator) {
  const root = await mkdtemp(path.join(os.tmpdir(), "asset-catalog-"));
  temporaryRoots.push(root);
  const registry = await readJson("content/assets/source-registry.json");
  const staticCatalog = await readJson(
    "content/assets/catalogs/static-sprites.json",
  );
  const firstShard = await readJson(staticCatalog.shards[0].path);
  const first = JSON.parse(JSON.stringify(firstShard.assets[0]));
  mutator(first, registry);
  await writeJson(root, "content/assets/source-registry.json", registry);
  await writeJson(root, "content/assets/catalogs/static-sprites.json", {
    schemaVersion: 1,
    assets: [first],
  });
  await writeJson(root, "content/assets/catalogs/audio.json", {
    schemaVersion: 1,
    assets: [],
  });
  await writeJson(root, "content/assets/catalogs/animations.json", {
    schemaVersion: 1,
    proceduralProfiles: [],
    frameAnimations: [],
  });
  await writeJson(root, "content/assets/catalogs/move-presentations.json", {
    schemaVersion: 1,
    moves: [],
  });
  if (first.localPath) {
    const target = path.join(root, first.localPath);
    await mkdir(path.dirname(target), { recursive: true });
    await cp(first.localPath, target);
  }
  return root;
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("asset catalog audit", () => {
  it("validates the complete generated catalogs", async () => {
    await expect(auditAssetCatalogs()).resolves.toMatchObject({
      sources: 14,
      staticAssets: 4_100,
      audioAssets: 2_000,
      proceduralProfiles: 20,
      frameAnimations: 0,
      movePresentations: 937,
      violations: 0,
    });
  }, 15_000);

  it("fails closed when doubtful D-023 media is toggled at runtime", async () => {
    const root = await minimalFixture((asset) => {
      asset.runtimeEnabled = true;
    });
    await expect(
      auditAssetCatalogs({ root, scope: "assets" }),
    ).rejects.toMatchObject({
      name: "AssetCatalogAuditError",
      violations: expect.arrayContaining([
        expect.objectContaining({
          assetId: "pokemon:0001-bulbasaur:battle-sprite:front-normal",
          status: "doubtful",
          policy: "asset-license-not-approved",
        }),
      ]),
    });
  });

  it("reports the file, asset, status, and missing evidence", async () => {
    const root = await minimalFixture((asset, registry) => {
      asset.runtimeEnabled = true;
      asset.licenseStatus = "approved";
      asset.replacementRequired = false;
      asset.approvedBy = "owner";
      asset.approvedAt = "2026-07-23";
      asset.decisionId = "D-024";
      registry.sources.find(
        (source) => source.sourceId === asset.sourceId,
      ).redistributionAllowed = null;
    });

    try {
      await auditAssetCatalogs({ root, scope: "assets" });
      throw new Error("audit_should_fail");
    } catch (error) {
      expect(error).toBeInstanceOf(AssetCatalogAuditError);
      expect(error.message).toContain(
        "content/assets/catalogs/static-sprites.json",
      );
      expect(error.message).toContain("source-redistribution-not-approved");
    }
  });
});
