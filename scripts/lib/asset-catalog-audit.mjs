import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  PROCEDURAL_ANIMATION_IDS,
  runtimeAssetViolations,
} from "../../packages/content-contracts/src/index.ts";
import { inspectPng } from "./png-inspection.mjs";
import { inspectOggVorbis } from "./ogg-inspection.mjs";

const CATALOG_FILES = {
  sources: "content/assets/source-registry.json",
  static: "content/assets/catalogs/static-sprites.json",
  audio: "content/assets/catalogs/audio.json",
  approved: "content/assets/catalogs/approved-library.json",
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
  if (
    asset.approvedAt &&
    asset.approvedAt === asset.retrievedAt &&
    (!asset.decisionId || !asset.approvedBy)
  )
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

async function validateLocalAsset({
  root,
  file,
  asset,
  violations,
  expectedApproved = false,
}) {
  if (!asset.localPath) {
    addViolation(violations, file, asset, "approved_asset_missing_local_path");
    return;
  }
  const absolutePath = path.join(root, asset.localPath);
  const buffer = await readFile(absolutePath);
  const fileStat = await stat(absolutePath);
  const digest = createHash("sha256").update(buffer).digest("hex");
  if (fileStat.size !== asset.sizeBytes)
    addViolation(violations, file, asset, "size_mismatch");
  if (digest !== asset.sha256)
    addViolation(violations, file, asset, "hash_mismatch");
  if (asset.format === "png") {
    const inspection = inspectPng(buffer, asset.assetId);
    if (
      inspection.width !== asset.width ||
      inspection.height !== asset.height ||
      inspection.frameCount !== asset.frameCount ||
      (typeof asset.hasTransparency === "boolean" &&
        inspection.hasTransparency !== asset.hasTransparency)
    )
      addViolation(violations, file, asset, "png_metadata_mismatch");
  } else if (asset.format === "ogg") {
    const inspection = inspectOggVorbis(buffer, asset.assetId);
    if (
      inspection.durationMs !== asset.durationMs ||
      inspection.sampleRate !== asset.sampleRate ||
      inspection.channels !== asset.channels
    )
      addViolation(violations, file, asset, "ogg_metadata_mismatch");
    if (asset.clippingDetected !== false)
      addViolation(violations, file, asset, "clipped_audio_not_approved");
  }
  if (expectedApproved) {
    if (
      asset.licenseStatus !== "approved" ||
      !asset.approvedBy ||
      !asset.approvedAt ||
      !asset.decisionId
    )
      addViolation(violations, file, asset, "approval_evidence_missing");
    if (asset.runtimeEnabled)
      addViolation(
        violations,
        file,
        asset,
        "new_asset_runtime_requires_separate_review",
      );
    if (asset.transformation?.pixelOrSampleDataChanged !== false)
      addViolation(
        violations,
        file,
        asset,
        "byte_identity_transformation_mismatch",
      );
  }
}

export async function auditAssetCatalogs({
  root = process.cwd(),
  scope = "all",
} = {}) {
  const [
    registry,
    staticCatalog,
    audioCatalog,
    approvedCatalog,
    animations,
    moves,
  ] = await Promise.all([
    readJson(root, CATALOG_FILES.sources),
    readJson(root, CATALOG_FILES.static),
    readJson(root, CATALOG_FILES.audio),
    readJson(root, CATALOG_FILES.approved),
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
      await validateLocalAsset({
        root,
        file: CATALOG_FILES.static,
        asset,
        violations,
      });
    }

    const approvedIds = new Set();
    for (const asset of approvedCatalog.assets) {
      for (const failure of structuralFailures(asset))
        addViolation(violations, CATALOG_FILES.approved, asset, failure);
      if (approvedIds.has(asset.assetId))
        addViolation(
          violations,
          CATALOG_FILES.approved,
          asset,
          "duplicate_asset_id",
        );
      approvedIds.add(asset.assetId);
      const source = sources.get(asset.sourceId);
      if (
        !source ||
        source.status !== "approved" ||
        source.redistributionAllowed !== true ||
        source.modificationAllowed !== true ||
        source.archiveSha256 !== asset.sourceRevision
      )
        addViolation(
          violations,
          CATALOG_FILES.approved,
          asset,
          "approved_source_evidence_mismatch",
        );
      await validateLocalAsset({
        root,
        file: CATALOG_FILES.approved,
        asset,
        violations,
        expectedApproved: true,
      });
    }
    for (const rejected of approvedCatalog.rejectedAssets) {
      if (
        rejected.status !== "rejected" ||
        rejected.runtimeEnabled !== false ||
        rejected.localPath !== null
      )
        addViolation(
          violations,
          CATALOG_FILES.approved,
          rejected,
          "rejected_asset_policy_mismatch",
        );
    }
    for (const supporting of approvedCatalog.supportingFiles) {
      const absolutePath = path.join(root, supporting.path);
      const buffer = await readFile(absolutePath);
      if (
        buffer.length !== supporting.sizeBytes ||
        createHash("sha256").update(buffer).digest("hex") !== supporting.sha256
      )
        addViolation(
          violations,
          CATALOG_FILES.approved,
          { assetId: supporting.path, licenseStatus: "approved" },
          "supporting_file_integrity_mismatch",
        );
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
    for (const asset of approvedCatalog.assets.filter((candidate) =>
      candidate.mimeType.startsWith("audio/"),
    )) {
      await validateLocalAsset({
        root,
        file: CATALOG_FILES.approved,
        asset,
        violations,
        expectedApproved: true,
      });
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

  const productionPackRoot = path.join(
    root,
    "content",
    "packs",
    "production-assets",
  );
  const committedFiles = (
    await readdir(productionPackRoot, {
      recursive: true,
      withFileTypes: true,
    })
  )
    .filter((entry) => entry.isFile())
    .map((entry) =>
      path
        .relative(productionPackRoot, path.join(entry.parentPath, entry.name))
        .replaceAll("\\", "/"),
    );
  const expectedFiles = new Set([
    "import-plan.json",
    "manifest.json",
    "README.md",
    "sources.json",
    "catalogs/assets.json",
    ...approvedCatalog.assets.map((asset) =>
      asset.localPath.replace("content/packs/production-assets/", ""),
    ),
    ...approvedCatalog.supportingFiles.map((file) =>
      file.path.replace("content/packs/production-assets/", ""),
    ),
    ...registry.sources
      .filter(
        (source) => source.sourceId.startsWith("kenney-") && source.licenseFile,
      )
      .map((source) =>
        source.licenseFile.replace("content/packs/production-assets/", ""),
      ),
  ]);
  for (const file of committedFiles) {
    if (!expectedFiles.has(file))
      addViolation(
        violations,
        CATALOG_FILES.approved,
        { assetId: file, licenseStatus: "unknown" },
        "unregistered_production_asset_file",
      );
  }
  for (const file of expectedFiles) {
    if (!committedFiles.includes(file))
      addViolation(
        violations,
        CATALOG_FILES.approved,
        { assetId: file, licenseStatus: "approved" },
        "registered_production_asset_file_missing",
      );
  }

  if (violations.length > 0) throw new AssetCatalogAuditError(violations);
  return {
    scope,
    sources: registry.sources.length,
    staticAssets: shouldAuditAssets
      ? staticAssets.length +
        approvedCatalog.assets.filter((asset) =>
          asset.mimeType.startsWith("image/"),
        ).length
      : 0,
    audioAssets: shouldAuditAudio
      ? audioCatalog.assets.length +
        approvedCatalog.assets.filter((asset) =>
          asset.mimeType.startsWith("audio/"),
        ).length
      : 0,
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
