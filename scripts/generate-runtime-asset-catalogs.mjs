import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  PROCEDURAL_ANIMATION_PROFILES,
  mapMovePresentation,
} from "../packages/content-contracts/src/index.ts";

const ROOT = process.cwd();
const CONTENT_ROOT = path.join(ROOT, "content", "assets");
const CATALOG_ROOT = path.join(CONTENT_ROOT, "catalogs");
const PACK_ROOT = path.join(ROOT, "content", "packs", "pokemon-canonical");
const AUDIT_ROOT = path.join(ROOT, "docs", "assets");
const STATIC_SHARD_SIZE = 1_370;

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (row.length > 0 || field.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  const [headers, ...values] = rows;
  return values
    .filter((candidate) => candidate.some((value) => value !== ""))
    .map((candidate) =>
      Object.fromEntries(
        headers.map((header, index) => [header, candidate[index] ?? ""]),
      ),
    );
}

function permission(value) {
  if (value === true || value === "yes") return true;
  if (value === false || value === "no") return false;
  return null;
}

function repositoryFromUrl(url) {
  const match = /^https:\/\/github\.com\/([^/]+\/[^/]+)/.exec(url);
  return match?.[1] ?? null;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, value, pretty = false) {
  await writeFile(
    filePath,
    `${JSON.stringify(value, null, pretty ? 2 : undefined)}\n`,
    "utf8",
  );
}

async function buildSourceRegistry() {
  const audit = await readJson(path.join(AUDIT_ROOT, "source-register.json"));
  return {
    schemaVersion: 1,
    policy:
      "A registered source is not runtime-approved. Every exact asset must also satisfy the unified runtime policy.",
    sources: audit.sources.map((source) => ({
      sourceId: source.sourceId,
      url: source.url,
      repository: repositoryFromUrl(source.url),
      commitSha: source.commitSha,
      version: source.revision && !source.commitSha ? source.revision : null,
      license: source.declaredLicense,
      ownership: source.declaredOwnership,
      attribution:
        source.attributionRequired &&
        source.attributionRequired !== "not required"
          ? [source.attributionRequired]
          : [],
      modificationAllowed: permission(source.modificationAllowed),
      redistributionAllowed: permission(source.redistributionAllowed),
      status: source.legalStatus,
      evidence: source.evidence,
      decisionId: source.relatedDecision,
    })),
  };
}

async function buildStaticSpriteCatalog() {
  const creaturesRoot = path.join(PACK_ROOT, "creatures");
  const directories = (await readdir(creaturesRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const assets = [];
  for (const directory of directories) {
    const inventory = await readJson(
      path.join(creaturesRoot, directory, "sprites", "inventory.json"),
    );
    const speciesId = Number.parseInt(directory.slice(0, 4), 10);
    for (const entry of inventory.entries) {
      const published = entry.repositoryAsset;
      if (!published) continue;
      const orientation = published.variantId.startsWith("back")
        ? "back"
        : "front";
      const shiny = published.variantId.endsWith("shiny");
      assets.push({
        schemaVersion: 1,
        assetId: `${inventory.pokemonId}:battle-sprite:${published.variantId}`,
        assetType: "battle-sprite",
        speciesId,
        pokemonId: speciesId,
        formId: null,
        variantId: published.variantId,
        gender: "unspecified",
        orientation,
        shiny,
        animated: false,
        animationType: "procedural",
        sourceId: "pokeapi-sprites",
        sourceRevision: inventory.source.sourceRevision,
        sourcePath: entry.sourceRepositoryPath,
        localPath: path
          .join(
            "content",
            "packs",
            "pokemon-canonical",
            "creatures",
            directory,
            published.repositoryPath,
          )
          .replaceAll("\\", "/"),
        format: "png",
        mimeType: "image/png",
        width: published.width,
        height: published.height,
        frameCount: published.frameCount,
        durationMs: null,
        frameDurations: [],
        loop: false,
        sampleRate: null,
        channels: null,
        loudness: null,
        sizeBytes: published.bytes,
        sha256: published.sha256,
        licenseStatus: published.rightsStatus,
        runtimeEnabled: false,
        replacementRequired: true,
        approvedBy: null,
        approvedAt: null,
        decisionId: published.decisionId,
        retrievedAt: inventory.source.retrievedAt,
      });
    }
  }
  return {
    schemaVersion: 1,
    catalogId: "temporary-pokemon-static-sprites",
    familyId: "pokeapi-default",
    runtimeEnabled: false,
    replacementRequired: true,
    assets,
  };
}

async function buildAudioCatalog() {
  const rows = parseCsv(
    await readFile(path.join(AUDIT_ROOT, "audio-availability.csv"), "utf8"),
  );
  return {
    schemaVersion: 1,
    catalogId: "pokemon-cry-candidates",
    runtimeEnabled: false,
    approvedRuntimeAssetCount: 0,
    assets: rows.map((row) => ({
      schemaVersion: 1,
      assetId: `pokemon:${row.pokemon_id}:cry:${row.set}`,
      assetType: "cry",
      speciesId: Number.parseInt(row.species_id, 10),
      pokemonId: Number.parseInt(row.pokemon_id, 10),
      formId: null,
      variantId: row.set,
      gender: "unspecified",
      orientation: "not-applicable",
      shiny: false,
      animated: false,
      animationType: "none",
      sourceId: "pokeapi-cries",
      sourceRevision: row.source_revision,
      sourcePath: row.source_path,
      localPath: null,
      format: "ogg",
      mimeType: "audio/ogg",
      width: null,
      height: null,
      frameCount: null,
      durationMs: null,
      frameDurations: [],
      loop: false,
      sampleRate: null,
      channels: null,
      loudness: null,
      sizeBytes: Number.parseInt(row.bytes, 10),
      sha256: null,
      licenseStatus: row.legal_status,
      runtimeEnabled: false,
      replacementRequired: true,
      approvedBy: null,
      approvedAt: null,
      decisionId: null,
      retrievedAt: "2026-07-23",
    })),
    originalSoundEffects: [],
  };
}

async function buildMovePresentations() {
  const catalog = await readJson(
    path.join(PACK_ROOT, "catalogs", "moves.json"),
  );
  return {
    schemaVersion: 1,
    sourceRevision: catalog.source.sourceRevision,
    rule: "Presentation only. Mechanical effects remain server-authoritative and are not inferred here.",
    moves: catalog.moves.map((move) => mapMovePresentation(move)),
  };
}

async function main() {
  await mkdir(CATALOG_ROOT, { recursive: true });
  const [sourceRegistry, staticSprites, audio, movePresentations] =
    await Promise.all([
      buildSourceRegistry(),
      buildStaticSpriteCatalog(),
      buildAudioCatalog(),
      buildMovePresentations(),
    ]);
  const animations = {
    schemaVersion: 1,
    catalogId: "procedural-and-approved-frame-animations",
    proceduralProfiles: Object.values(PROCEDURAL_ANIMATION_PROFILES),
    frameAnimations: [],
    blockedCandidateCount: 11_855,
    policy:
      "Remote GIF is never a runtime format. Frame assets require exact approval and deterministic conversion.",
  };
  const staleStaticShards = (await readdir(CATALOG_ROOT))
    .filter((name) => /^static-sprites-\d{3}\.json$/.test(name))
    .map((name) => rm(path.join(CATALOG_ROOT, name), { force: true }));
  await Promise.all(staleStaticShards);
  const staticShards = [];
  for (
    let offset = 0;
    offset < staticSprites.assets.length;
    offset += STATIC_SHARD_SIZE
  ) {
    const assets = staticSprites.assets.slice(
      offset,
      offset + STATIC_SHARD_SIZE,
    );
    const shardNumber = staticShards.length + 1;
    const fileName = `static-sprites-${String(shardNumber).padStart(3, "0")}.json`;
    staticShards.push({
      path: `content/assets/catalogs/${fileName}`,
      count: assets.length,
      firstAssetId: assets[0]?.assetId ?? null,
      lastAssetId: assets.at(-1)?.assetId ?? null,
      assets,
    });
  }
  const staticIndex = {
    schemaVersion: 1,
    catalogId: staticSprites.catalogId,
    familyId: staticSprites.familyId,
    runtimeEnabled: false,
    replacementRequired: true,
    assetCount: staticSprites.assets.length,
    shards: staticShards.map((shard) => ({
      path: shard.path,
      count: shard.count,
      firstAssetId: shard.firstAssetId,
      lastAssetId: shard.lastAssetId,
    })),
  };
  await Promise.all([
    writeJson(
      path.join(CONTENT_ROOT, "source-registry.json"),
      sourceRegistry,
      true,
    ),
    writeJson(
      path.join(CATALOG_ROOT, "static-sprites.json"),
      staticIndex,
      true,
    ),
    ...staticShards.map((shard, index) =>
      writeJson(
        path.join(
          CATALOG_ROOT,
          `static-sprites-${String(index + 1).padStart(3, "0")}.json`,
        ),
        {
          schemaVersion: 1,
          catalogId: staticSprites.catalogId,
          shardIndex: index + 1,
          assets: shard.assets,
        },
      ),
    ),
    writeJson(path.join(CATALOG_ROOT, "audio.json"), audio),
    writeJson(path.join(CATALOG_ROOT, "animations.json"), animations, true),
    writeJson(
      path.join(CATALOG_ROOT, "move-presentations.json"),
      movePresentations,
    ),
    writeJson(
      path.join(CONTENT_ROOT, "manifest.json"),
      {
        schemaVersion: 1,
        generatedFrom: {
          pokemonPack: "content/packs/pokemon-canonical",
          audit: "docs/assets",
        },
        sourceCount: sourceRegistry.sources.length,
        staticAssetCount: staticSprites.assets.length,
        audioCandidateCount: audio.assets.length,
        proceduralProfileCount: animations.proceduralProfiles.length,
        frameAnimationCount: animations.frameAnimations.length,
        movePresentationCount: movePresentations.moves.length,
        runtimeEnabledPokemonAssetCount: 0,
      },
      true,
    ),
  ]);
  process.stdout.write(
    `${JSON.stringify(
      {
        sources: sourceRegistry.sources.length,
        staticAssets: staticSprites.assets.length,
        audioCandidates: audio.assets.length,
        proceduralProfiles: animations.proceduralProfiles.length,
        frameAnimations: animations.frameAnimations.length,
        movePresentations: movePresentations.moves.length,
        runtimeEnabledPokemonAssets: 0,
      },
      null,
      2,
    )}\n`,
  );
}

await main();
