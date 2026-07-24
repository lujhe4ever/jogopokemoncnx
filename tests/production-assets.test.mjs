import { Buffer } from "node:buffer";
import { access, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { inspectOggVorbis } from "../scripts/lib/ogg-inspection.mjs";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

describe("approved production asset library", () => {
  it("records exact approved sources and keeps every asset disabled", async () => {
    const [manifest, sourceRegistry, catalog] = await Promise.all([
      readJson("content/packs/production-assets/manifest.json"),
      readJson("content/packs/production-assets/sources.json"),
      readJson("content/packs/production-assets/catalogs/assets.json"),
    ]);

    expect(manifest).toMatchObject({
      sourceCount: 8,
      assetCount: 54,
      imageCount: 15,
      audioCount: 39,
      rejectedCount: 9,
      runtimeEnabled: false,
      license: "CC0-1.0",
    });
    expect(sourceRegistry.sources).toHaveLength(8);
    expect(
      sourceRegistry.sources.every(
        (source) =>
          source.status === "approved" &&
          source.redistributionAllowed === true &&
          source.modificationAllowed === true &&
          /^[0-9a-f]{64}$/.test(source.archiveSha256) &&
          source.decisionId === "D-025",
      ),
    ).toBe(true);
    expect(catalog.assets).toHaveLength(54);
    expect(new Set(catalog.assets.map((asset) => asset.assetId)).size).toBe(54);
    expect(
      catalog.assets.every(
        (asset) =>
          asset.licenseStatus === "approved" &&
          asset.runtimeEnabled === false &&
          asset.replacementRequired === false &&
          asset.transformation.pixelOrSampleDataChanged === false &&
          /^[0-9a-f]{64}$/.test(asset.sha256),
      ),
    ).toBe(true);
    expect(catalog.rejectedAssets).toHaveLength(9);
    expect(
      catalog.rejectedAssets.every(
        (asset) =>
          asset.status === "rejected" &&
          asset.localPath === null &&
          asset.runtimeEnabled === false,
      ),
    ).toBe(true);
    await Promise.all(catalog.assets.map((asset) => access(asset.localPath)));
  });

  it("decodes committed Ogg metadata and records no approved clipping", async () => {
    const catalog = await readJson(
      "content/packs/production-assets/catalogs/assets.json",
    );
    const audio = catalog.assets.filter((asset) =>
      asset.mimeType.startsWith("audio/"),
    );
    expect(audio).toHaveLength(39);
    for (const asset of audio) {
      const inspection = inspectOggVorbis(
        await readFile(asset.localPath),
        asset.assetId,
      );
      expect(inspection).toMatchObject({
        durationMs: asset.durationMs,
        sampleRate: asset.sampleRate,
        channels: asset.channels,
      });
      expect(asset.clippingDetected).toBe(false);
      expect(asset.peakAmplitude).toBeLessThan(1);
    }
  });

  it("rejects malformed Ogg data and exposes coverage gaps", async () => {
    expect(() =>
      inspectOggVorbis(Buffer.from("not an ogg"), "fixture"),
    ).toThrow(/truncated Ogg input/);

    const coverage = await readJson("content/assets/coverage.json");
    expect(coverage).toMatchObject({
      pokemon: {
        species: 1_025,
        formsCataloged: 1_579,
        temporaryBattleSprites: 4_100,
        approvedPokemonImages: 0,
        runtimeEnabledPokemonAssets: 0,
      },
      approvedLibrary: {
        assets: 54,
        images: 15,
        audio: 39,
        characterCandidateFrames: 18,
        rejected: 9,
        runtimeEnabledAssets: 0,
      },
    });
  });
});
