import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { format as formatWithPrettier } from "prettier";
import { inspectOggVorbis } from "./lib/ogg-inspection.mjs";
import { inspectPng } from "./lib/png-inspection.mjs";

const ROOT = process.cwd();
const PACK_ROOT = path.join(ROOT, "content", "packs", "production-assets");
const PRIVATE_ROOT = path.join(ROOT, ".private", "production-assets");
const ARCHIVE_ROOT = path.join(PRIVATE_ROOT, "source-archives");
const EXTRACTED_ROOT = path.join(PRIVATE_ROOT, "extracted");
const PLAN_PATH = path.join(PACK_ROOT, "import-plan.json");
const ANALYSIS_PATH = path.join(PRIVATE_ROOT, "audio-analysis.json");

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const content = await formatWithPrettier(JSON.stringify(value), {
    parser: "json",
  });
  await writeFile(filePath, content, "utf8");
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function repoPath(relativePath) {
  return path
    .join("content", "packs", "production-assets", relativePath)
    .replaceAll("\\", "/");
}

function sourceFilePath(source, sourcePath) {
  return path.join(EXTRACTED_ROOT, source.pack, ...sourcePath.split("/"));
}

async function verifySources(plan) {
  const records = [];
  for (const source of plan.sources) {
    const archivePath = path.join(ARCHIVE_ROOT, source.archivePath);
    const archive = await readFile(archivePath);
    const archiveStat = await stat(archivePath);
    if (archiveStat.size !== source.archiveSizeBytes) {
      throw new Error(`${source.sourceId}: archive size mismatch`);
    }
    if (sha256(archive) !== source.archiveSha256) {
      throw new Error(`${source.sourceId}: archive SHA-256 mismatch`);
    }

    const licenseSource = sourceFilePath(source, source.licensePath);
    const license = await readFile(licenseSource);
    const licenseText = license.toString("utf8");
    if (!/creative commons (zero|cc0)|cc0/i.test(licenseText)) {
      throw new Error(`${source.sourceId}: CC0 license evidence not found`);
    }
    const licenseTarget = path.join(
      PACK_ROOT,
      "licenses",
      `${source.sourceId}.txt`,
    );
    await mkdir(path.dirname(licenseTarget), { recursive: true });
    await copyFile(licenseSource, licenseTarget);

    records.push({
      sourceId: source.sourceId,
      url: source.pageUrl,
      downloadUrl: source.downloadUrl,
      repository: null,
      commitSha: null,
      version: source.version,
      archiveSha256: source.archiveSha256,
      archiveSizeBytes: source.archiveSizeBytes,
      retrievedAt: plan.retrievedAt,
      license: "CC0-1.0",
      ownership: `Created and distributed by Kenney; exact pack: ${source.title}.`,
      attribution: [
        "Attribution is not mandatory under CC0; credit Kenney (kenney.nl) when practical.",
      ],
      modificationAllowed: true,
      redistributionAllowed: true,
      status: "approved",
      evidence: [
        source.pageUrl,
        "https://creativecommons.org/publicdomain/zero/1.0/",
      ],
      licenseFile: repoPath(`licenses/${source.sourceId}.txt`),
      decisionId: plan.decisionId,
    });
  }
  return records;
}

function baseAsset(plan, source, asset) {
  return {
    schemaVersion: 1,
    assetId: asset.assetId,
    assetType: asset.assetType,
    category: asset.category,
    speciesId: null,
    pokemonId: null,
    formId: null,
    variantId: asset.variantId,
    gender: "unspecified",
    orientation: "not-applicable",
    shiny: false,
    animated: false,
    animationType: "none",
    sourceId: source.sourceId,
    sourceRevision: source.archiveSha256,
    sourcePath: asset.sourcePath,
    localPath: repoPath(asset.localPath),
    originalName: path.posix.basename(asset.sourcePath),
    format: path.extname(asset.localPath).slice(1),
    mimeType: asset.localPath.endsWith(".png") ? "image/png" : "audio/ogg",
    frameDurations: [],
    loop: false,
    licenseStatus: "approved",
    runtimeEnabled: false,
    replacementRequired: false,
    approvedBy: plan.approvedBy,
    approvedAt: plan.approvedAt,
    decisionId: plan.decisionId,
    retrievedAt: plan.retrievedAt,
    requiredCredits: [],
    recommendedCredits: ["Kenney (kenney.nl)"],
    transformation: {
      operation: "byte-identical-copy-and-rename",
      pixelOrSampleDataChanged: false,
    },
  };
}

function atlasFor(asset, inspection) {
  if (!asset.grid) return null;
  const frames = {};
  let index = 0;
  for (let row = 0; row < asset.grid.rows; row += 1) {
    for (let column = 0; column < asset.grid.columns; column += 1) {
      frames[`frame-${String(index).padStart(4, "0")}`] = {
        frame: {
          x: column * asset.grid.frameWidth,
          y: row * asset.grid.frameHeight,
          w: asset.grid.frameWidth,
          h: asset.grid.frameHeight,
        },
        rotated: false,
        trimmed: false,
      };
      index += 1;
    }
  }
  if (
    index !== asset.frameCount ||
    inspection.width !== asset.grid.columns * asset.grid.frameWidth ||
    inspection.height !== asset.grid.rows * asset.grid.frameHeight
  ) {
    throw new Error(`${asset.assetId}: grid does not match PNG dimensions`);
  }
  return {
    frames,
    meta: {
      app: "Projeto LT deterministic atlas generator",
      version: "1",
      image: path.posix.basename(asset.localPath),
      format: "RGBA8888",
      size: { w: inspection.width, h: inspection.height },
      scale: "1",
      frameCount: index,
      semanticMappingStatus: "pending",
      groups: asset.atlasGroups ?? {},
    },
  };
}

async function importVisualAssets(plan, sources) {
  const records = [];
  const supportingFiles = [];
  for (const asset of plan.visualAssets) {
    const source = sources.get(asset.sourceId);
    if (!source) throw new Error(`${asset.assetId}: unknown source`);
    const sourcePath = sourceFilePath(source, asset.sourcePath);
    const bytes = await readFile(sourcePath);
    const inspection = inspectPng(bytes, asset.assetId);
    const targetPath = path.join(PACK_ROOT, ...asset.localPath.split("/"));
    await mkdir(path.dirname(targetPath), { recursive: true });
    await copyFile(sourcePath, targetPath);

    records.push({
      ...baseAsset(plan, source, asset),
      width: inspection.width,
      height: inspection.height,
      frameCount: 1,
      atlasFrameCount: asset.frameCount ?? null,
      atlasGroups: asset.atlasGroups ?? {},
      durationMs: null,
      sampleRate: null,
      channels: null,
      loudness: null,
      hasTransparency: inspection.hasTransparency,
      sizeBytes: bytes.length,
      sha256: sha256(bytes),
      compatibilityScore: asset.compatibilityScore,
      compatibilityClass: asset.compatibilityClass,
      notes: asset.notes,
    });

    const atlas = atlasFor(asset, inspection);
    if (atlas) {
      const atlasRelative = asset.localPath.replace(/\.png$/, ".atlas.json");
      const atlasPath = path.join(PACK_ROOT, ...atlasRelative.split("/"));
      await writeJson(atlasPath, atlas);
      const atlasBytes = await readFile(atlasPath);
      supportingFiles.push({
        path: repoPath(atlasRelative),
        role: "atlas",
        sourceAssetId: asset.assetId,
        sizeBytes: atlasBytes.length,
        sha256: sha256(atlasBytes),
      });
    }
  }
  return { records, supportingFiles };
}

async function importAudioAssets(plan, sources, analysis) {
  const records = [];
  for (const tuple of plan.audioAssets) {
    const [variantId, sourceId, sourcePathValue, localPath, category] = tuple;
    const source = sources.get(sourceId);
    if (!source) throw new Error(`${variantId}: unknown source`);
    const sourcePath = sourceFilePath(source, sourcePathValue);
    const bytes = await readFile(sourcePath);
    const inspection = inspectOggVorbis(bytes, variantId);
    const measured = analysis[variantId];
    if (!measured) throw new Error(`${variantId}: decoded analysis missing`);
    if (
      measured.sha256 !== sha256(bytes) ||
      measured.sampleRate !== inspection.sampleRate ||
      measured.channels !== inspection.channels ||
      Math.abs(measured.durationMs - inspection.durationMs) > 1
    ) {
      throw new Error(`${variantId}: decoded analysis mismatch`);
    }
    if (measured.clippingDetected) {
      throw new Error(`${variantId}: clipped audio cannot be approved`);
    }

    const targetPath = path.join(PACK_ROOT, ...localPath.split("/"));
    await mkdir(path.dirname(targetPath), { recursive: true });
    await copyFile(sourcePath, targetPath);
    const assetType = category === "music" ? "music" : "sound-effect";
    const asset = {
      assetId: `licensed:kenney:${variantId}`,
      assetType,
      category,
      variantId,
      sourcePath: sourcePathValue,
      localPath,
    };
    records.push({
      ...baseAsset(plan, source, asset),
      width: null,
      height: null,
      frameCount: null,
      durationMs: inspection.durationMs,
      sampleRate: inspection.sampleRate,
      channels: inspection.channels,
      loudness:
        measured.rmsAmplitude > 0
          ? Number((20 * Math.log10(measured.rmsAmplitude)).toFixed(3))
          : null,
      peakAmplitude: measured.peakAmplitude,
      clippingDetected: false,
      analysisTool: measured.decoder,
      sizeBytes: bytes.length,
      sha256: sha256(bytes),
      compatibilityScore: category === "music" ? 72 : 88,
      compatibilityClass:
        category === "music" ? "compatible-only-isolated" : "compatible",
      notes:
        category === "music"
          ? "Short licensed jingle; not a replacement for a complete music loop."
          : "Generic CC0 sound effect suitable for prototyping and production review.",
    });
  }
  return records;
}

function rejectedAudioRecords(plan, sources, analysis) {
  return plan.rejectedAudioAssets.map(
    ([variantId, sourceId, sourcePathValue, reason]) => {
      const source = sources.get(sourceId);
      const measured = analysis[variantId];
      if (!source || !measured) {
        throw new Error(`${variantId}: rejected record evidence missing`);
      }
      return {
        assetId: `licensed:kenney:${variantId}`,
        sourceId,
        sourceRevision: source.archiveSha256,
        sourcePath: sourcePathValue,
        localPath: null,
        status: "rejected",
        reason,
        peakAmplitude: measured.peakAmplitude,
        sha256: measured.sha256,
        runtimeEnabled: false,
      };
    },
  );
}

async function main() {
  const [plan, analysis] = await Promise.all([
    readJson(PLAN_PATH),
    readJson(ANALYSIS_PATH),
  ]);
  const sourceRecords = await verifySources(plan);
  const sourcePlans = new Map(
    plan.sources.map((source) => [source.sourceId, source]),
  );
  const { records: visualAssets, supportingFiles } = await importVisualAssets(
    plan,
    sourcePlans,
  );
  const audioAssets = await importAudioAssets(plan, sourcePlans, analysis);
  const rejectedAssets = rejectedAudioRecords(plan, sourcePlans, analysis);
  const assets = [...visualAssets, ...audioAssets].sort((left, right) =>
    left.assetId.localeCompare(right.assetId),
  );
  const totalBytes = assets.reduce((sum, asset) => sum + asset.sizeBytes, 0);
  const counts = Object.fromEntries(
    [...new Set(assets.map((asset) => asset.category))]
      .sort()
      .map((category) => [
        category,
        assets.filter((asset) => asset.category === category).length,
      ]),
  );

  await Promise.all([
    writeJson(path.join(PACK_ROOT, "sources.json"), {
      schemaVersion: 1,
      sources: sourceRecords,
    }),
    writeJson(path.join(PACK_ROOT, "catalogs", "assets.json"), {
      schemaVersion: 1,
      catalogId: "production-assets-kenney-cc0",
      generatedAt: plan.retrievedAt,
      runtimeEnabled: false,
      assets,
      supportingFiles,
      rejectedAssets,
    }),
    writeJson(path.join(PACK_ROOT, "manifest.json"), {
      schemaVersion: 1,
      id: "production-assets",
      version: "1.0.0",
      author: "Kenney",
      license: "CC0-1.0",
      licenseStatus: "approved",
      publicationPolicy: "approved-third-party-assets",
      runtimeEnabled: false,
      replacementRequired: false,
      decisionId: plan.decisionId,
      provenanceFile: "sources.json",
      catalogFile: "catalogs/assets.json",
      sourceCount: sourceRecords.length,
      assetCount: assets.length,
      imageCount: visualAssets.length,
      audioCount: audioAssets.length,
      rejectedCount: rejectedAssets.length,
      supportingFileCount: supportingFiles.length,
      totalBytes,
      counts,
    }),
  ]);

  process.stdout.write(
    `${JSON.stringify(
      {
        sources: sourceRecords.length,
        assets: assets.length,
        images: visualAssets.length,
        audio: audioAssets.length,
        rejected: rejectedAssets.length,
        supportingFiles: supportingFiles.length,
        totalBytes,
      },
      null,
      2,
    )}\n`,
  );
}

await main();
