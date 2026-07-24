import {
  DEFAULT_ASSET_FEATURE_FLAGS,
  PROCEDURAL_ANIMATION_IDS,
  PROCEDURAL_ANIMATION_PROFILES,
  RuntimeAssetPolicyError,
  assertAssetUsable,
  mapMovePresentation,
  requiredFeatureForAsset,
  runtimeAssetViolations,
  sampleProceduralAnimation,
  validateFrameAnimation,
  type AssetSourceRecord,
  type UnifiedAssetRecord,
} from "../packages/content-contracts/src/index.js";
import { describe, expect, it } from "vitest";

const revision = "a".repeat(40);
const digest = "b".repeat(64);

function source(overrides: Partial<AssetSourceRecord> = {}): AssetSourceRecord {
  return {
    sourceId: "approved-source",
    url: "https://example.test/assets",
    repository: "example/assets",
    commitSha: revision,
    version: null,
    license: "CC0-1.0",
    ownership: "Original work",
    attribution: [],
    modificationAllowed: true,
    redistributionAllowed: true,
    status: "approved",
    evidence: ["https://example.test/license"],
    decisionId: "D-024",
    ...overrides,
  };
}

function asset(
  overrides: Partial<UnifiedAssetRecord> = {},
): UnifiedAssetRecord {
  return {
    schemaVersion: 1,
    assetId: "pokemon:0001-bulbasaur:battle-sprite:front-normal",
    assetType: "battle-sprite",
    speciesId: 1,
    pokemonId: 1,
    formId: null,
    variantId: "front-normal",
    gender: "unspecified",
    orientation: "front",
    shiny: false,
    animated: false,
    animationType: "none",
    sourceId: "approved-source",
    sourceRevision: revision,
    sourcePath: "sprites/1.png",
    localPath: "content/assets/approved/1.png",
    format: "png",
    mimeType: "image/png",
    width: 96,
    height: 96,
    frameCount: 1,
    durationMs: null,
    frameDurations: [],
    loop: false,
    sampleRate: null,
    channels: null,
    loudness: null,
    sizeBytes: 128,
    sha256: digest,
    licenseStatus: "approved",
    runtimeEnabled: true,
    replacementRequired: false,
    approvedBy: "owner",
    approvedAt: "2026-07-23",
    decisionId: "D-024",
    retrievedAt: "2026-07-22",
    ...overrides,
  };
}

describe("runtime asset policy", () => {
  it("keeps every Pokemon media feature disabled by default", () => {
    expect(DEFAULT_ASSET_FEATURE_FLAGS).toMatchObject({
      pokemonStaticSprites: false,
      pokemonProceduralAnimations: false,
      pokemonFrameAnimations: false,
      pokemonCries: false,
      battleSfx: false,
      worldSfx: false,
      uiSfx: false,
    });
  });

  it("requires approval, redistribution evidence, and the exact feature flag", () => {
    const approvedAsset = asset();
    const approvedSource = source();

    expect(runtimeAssetViolations(approvedAsset, approvedSource)).toEqual([]);
    expect(requiredFeatureForAsset(approvedAsset)).toBe("pokemonStaticSprites");
    expect(() => {
      assertAssetUsable(
        approvedAsset,
        approvedSource,
        DEFAULT_ASSET_FEATURE_FLAGS,
      );
    }).toThrow(RuntimeAssetPolicyError);
    expect(() => {
      assertAssetUsable(approvedAsset, approvedSource, {
        ...DEFAULT_ASSET_FEATURE_FLAGS,
        pokemonStaticSprites: true,
      });
    }).not.toThrow();
  });

  it("rejects D-023 media even when a broad feature is enabled", () => {
    const temporary = asset({
      licenseStatus: "doubtful",
      runtimeEnabled: false,
      replacementRequired: true,
      approvedBy: null,
      approvedAt: null,
      decisionId: "D-023",
    });

    expect(() => {
      assertAssetUsable(temporary, source(), {
        ...DEFAULT_ASSET_FEATURE_FLAGS,
        pokemonStaticSprites: true,
      });
    }).toThrow(/asset-license-not-approved/);
  });

  it("rejects an approved-looking asset when redistribution is unconfirmed", () => {
    expect(
      runtimeAssetViolations(
        asset(),
        source({ redistributionAllowed: null }),
      ).map((violation) => violation.policy),
    ).toContain("source-redistribution-not-approved");
  });
});

describe("procedural and frame animation contracts", () => {
  it("covers all profiles deterministically and completes non-looping profiles", () => {
    expect(Object.keys(PROCEDURAL_ANIMATION_PROFILES).sort()).toEqual(
      [...PROCEDURAL_ANIMATION_IDS].sort(),
    );
    for (const profile of Object.values(PROCEDURAL_ANIMATION_PROFILES)) {
      expect(sampleProceduralAnimation(profile, 125)).toEqual(
        sampleProceduralAnimation(profile, 125),
      );
      expect(
        sampleProceduralAnimation(profile, profile.durationMs).completed,
      ).toBe(!profile.loop);
    }
  });

  it("emits the damage presentation marker once when crossing its timestamp", () => {
    const profile = PROCEDURAL_ANIMATION_PROFILES["physical-attack"];
    expect(sampleProceduralAnimation(profile, 220, 219).damageEvent).toBe(true);
    expect(sampleProceduralAnimation(profile, 221, 220).damageEvent).toBe(
      false,
    );
  });

  it("maps canonical move metadata without changing battle mechanics", () => {
    expect(
      mapMovePresentation({
        id: 33,
        slug: "tackle",
        type: "normal",
        category: "physical",
        target: "selected-pokemon",
        meta: { ailment: "none", healingPercent: 0 },
        statChanges: [],
      }),
    ).toMatchObject({
      moveId: 33,
      moveSlug: "tackle",
      animationProfile: "physical-attack",
      fallback: "generic-physical",
    });
  });

  it("requires editable, approved frame sources and rejects runtime GIFs", () => {
    const frameAsset = asset({
      assetId: "animation:test",
      assetType: "animation",
      speciesId: null,
      pokemonId: null,
      animationType: "frame",
      animated: true,
      format: "webp",
      mimeType: "image/webp",
      frameCount: 2,
      frameDurations: [100, 100],
      durationMs: 200,
    });
    const definition = {
      asset: frameAsset,
      frameWidth: 32,
      frameHeight: 32,
      pivotX: 16,
      pivotY: 24,
      pingPong: false,
    };

    expect(validateFrameAnimation(definition, source())).toEqual([]);
    expect(
      validateFrameAnimation(
        {
          ...definition,
          asset: {
            ...frameAsset,
            format: "gif" as UnifiedAssetRecord["format"],
          },
        },
        source({ modificationAllowed: null }),
      ),
    ).toEqual(
      expect.arrayContaining([
        "runtime_frame_format_must_be_png_or_webp",
        "source_modification_not_approved",
      ]),
    );
  });
});
