import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  PROCEDURAL_ANIMATION_IDS,
  runtimeAssetViolations,
} from "../../packages/content-contracts/src/index.ts";
import { inspectPng } from "./png-inspection.mjs";

const CATALOG_FILES = {
  sources: "content/assets/source-registry.json",
  static: "content/assets/catalogs/static-sprites.json",
  audio: "content/assets/catalogs/audio.json",
  animations: "content/assets/catalogs/animations.json",
  moves: "content/assets/catalogs/move-presentations.json",
};

async function readJson(root, relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

async function readAssetShards(root, catalog) {
  if (Array.isArray(catalog.assets)) return catalog.assets;
  const shards = await Promise.all(
    (catalog.shards ?? []).map((shard) => readJson(root, shard.path)),
  );
  return shards.flatMap((shard) => shard.assets ?? []);
}

function structuralFailures(asset) {
  const failures = [];
  const requiredStrings = [
    "assetId",
    "assetType",
    "variantId",
    "gender",
    "orientation",
    "animationType",
    "sourceId",
    "format",
    "mimeType",
    "licenseStatus",
    "retrievedAt",
  ];
  for (const field of requiredStrings) {
    if (typeof asset[field] !== "string" || asset[field].length === 0)
      failures.push(`missing_${field}`);
  }
  if (asset.schemaVersion !== 1) failures.push("invalid_schema_version");
  if (!Number.isInteger(asset.sizeBytes) || asset.sizeBytes <= 0)
    failures.push("invalid_size_bytes");
  if (!Array.isArray(asset.frameDurations))
    failures.push("invalid_frame_durations");
  if (
    !["approved", "pending", "doubtful", "rejected", "quarantined"].includes(
      asset.licenseStatus,
    )
  )
    failures.push("invalid_license_status");
  if (asset.approvedAt && asset.approvedAt === asset.retrievedAt)
    failures.push("approval_date_must_not_derive_from_retrieval");
  return failures;
}

export class AssetCatalogAuditError extends Error {
  constructor(violations) {
    super(
      `asset catalog audit failed:\n${violations
        .map(
          (violation) =>
            `${violation.file}:${violation.assetId}: ${violation.status}: ${violation.policy}`,
        )
        .join("\n")}`,
    );
    this.name = "AssetCatalogAuditError";
    this.violations = violations;
  }
}

function addViolation(violations, file, asset, policy) {
  violations.push({
    file,
    assetId: asset.assetId ?? "unknown",
    status: asset.licenseStatus ?? "unknown",
    policy,
  });
}

export async function auditAssetCatalogs({
  root = process.cwd(),
  scope = "all",
} = {}) {
  const [registry, staticCatalog, audioCatalog, animations, moves] =
    await Promise.all([
      readJson(root, CATALOG_FILES.sources),
      readJson(root, CATALOG_FILES.static),
      readJson(root, CATALOG_FILES.audio),
      readJson(root, CATALOG_FILES.animations),
      readJson(root, CATALOG_FILES.moves),
    ]);
  const sources = new Map(
    registry.sources.map((source) => [source.sourceId, source]),
  );
  const staticAssets = await readAssetShards(root, staticCatalog);
  const violations = [];
  const shouldAuditAssets = scope === "all" || scope === "assets";
  const shouldAuditAudio = scope === "all" || scope === "audio";
  const shouldAuditAnimations = scope === "all" || scope === "animations";

  if (shouldAuditAssets) {
    const seen = new Set();
    for (const asset of staticAssets) {
      for (const failure of structuralFailures(asset))
        addViolation(violations, CATALOG_FILES.static, asset, failure);
      if (seen.has(asset.assetId))
        addViolation(
          violations,
          CATALOG_FILES.static,
          asset,
          "duplicate_asset_id",
        );
      seen.add(asset.assetId);
      const source = sources.get(asset.sourceId);
      if (!source)
        addViolation(violations, CATALOG_FILES.static, asset, "unknown_source");
      if (asset.runtimeEnabled) {
        for (const failure of runtimeAssetViolations(asset, source))
          addViolation(violations, CATALOG_FILES.static, asset, failure.policy);
      }
      if (!asset.localPath) {
        addViolation(
          violations,
          CATALOG_FILES.static,
          asset,
          "published_sprite_missing_local_path",
        );
        continue;
      }
      const absolutePath = path.join(root, asset.localPath);
      const buffer = await readFile(absolutePath);
      const fileStat = await stat(absolutePath);
      const digest = createHash("sha256").update(buffer).digest("hex");
      if (fileStat.size !== asset.sizeBytes)
        addViolation(violations, CATALOG_FILES.static, asset, "size_mismatch");
      if (digest !== asset.sha256)
        addViolation(violations, CATALOG_FILES.static, asset, "hash_mismatch");
      if (asset.format === "png") {
        const inspection = inspectPng(buffer, asset.assetId);
        if (
          inspection.width !== asset.width ||
          inspection.height !== asset.height ||
          inspection.frameCount !== asset.frameCount
        )
          addViolation(
            violations,
            CATALOG_FILES.static,
            asset,
            "png_metadata_mismatch",
          );
      }
    }
  }

  if (shouldAuditAudio) {
    for (const asset of audioCatalog.assets) {
      for (const failure of structuralFailures(asset))
        addViolation(violations, CATALOG_FILES.audio, asset, failure);
      if (asset.runtimeEnabled)
        for (const failure of runtimeAssetViolations(
          asset,
          sources.get(asset.sourceId),
        ))
          addViolation(violations, CATALOG_FILES.audio, asset, failure.policy);
      if (asset.localPath !== null)
        addViolation(
          violations,
          CATALOG_FILES.audio,
          asset,
          "unapproved_audio_must_not_be_local",
        );
      if (asset.sha256 !== null)
        addViolation(
          violations,
          CATALOG_FILES.audio,
          asset,
          "unretrieved_audio_must_not_claim_sha256",
        );
    }
  }

  if (shouldAuditAnimations) {
    const profileIds = animations.proceduralProfiles.map(
      (profile) => profile.id,
    );
    if (
      profileIds.length !== PROCEDURAL_ANIMATION_IDS.length ||
      PROCEDURAL_ANIMATION_IDS.some((id) => !profileIds.includes(id))
    )
      violations.push({
        file: CATALOG_FILES.animations,
        assetId: "procedural-profiles",
        status: "approved",
        policy: "procedural_profile_coverage",
      });
    for (const animation of animations.frameAnimations) {
      if (animation.asset?.format === "gif")
        addViolation(
          violations,
          CATALOG_FILES.animations,
          animation.asset,
          "remote_gif_forbidden_at_runtime",
        );
      for (const failure of runtimeAssetViolations(
        animation.asset,
        sources.get(animation.asset?.sourceId),
      ))
        addViolation(
          violations,
          CATALOG_FILES.animations,
          animation.asset,
          failure.policy,
        );
    }
    const knownProfiles = new Set(profileIds);
    for (const move of moves.moves) {
      if (!knownProfiles.has(move.animationProfile))
        violations.push({
          file: CATALOG_FILES.moves,
          assetId: `move:${String(move.moveId)}`,
          status: "approved",
          policy: "unknown_animation_profile",
        });
    }
  }

  if (violations.length > 0) throw new AssetCatalogAuditError(violations);
  return {
    scope,
    sources: registry.sources.length,
    staticAssets: shouldAuditAssets ? staticAssets.length : 0,
    audioAssets: shouldAuditAudio ? audioCatalog.assets.length : 0,
    proceduralProfiles: shouldAuditAnimations
      ? animations.proceduralProfiles.length
      : 0,
    frameAnimations: shouldAuditAnimations
      ? animations.frameAnimations.length
      : 0,
    movePresentations: shouldAuditAnimations ? moves.moves.length : 0,
    violations: 0,
  };
}
