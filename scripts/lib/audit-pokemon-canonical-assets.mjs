import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import {
  D023_DECISION_ID,
  D023_OWNER_AUTHORIZED_AT,
  D023_SCOPE,
  EXPECTED_BATTLE_VARIANTS,
  validateGitSha,
} from "./pokemon-canonical-policy.mjs";
import { inspectPng } from "./png-inspection.mjs";

const SHA256 = /^[0-9a-f]{64}$/;
const SAFE_REPOSITORY_PATH =
  /^sprites\/\d{4}-[a-z0-9-]+--pokeapi-default--(front|back)--(normal|shiny)\.png$/;

function relativePathIsSafe(value) {
  if (
    typeof value !== "string" ||
    value.includes("\\") ||
    value.includes("\0") ||
    path.posix.isAbsolute(value) ||
    /^[a-zA-Z]:/.test(value)
  ) {
    return false;
  }
  const normalized = path.posix.normalize(value);
  return (
    normalized === value && normalized !== ".." && !normalized.startsWith("../")
  );
}

function pathIsInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return (
    relative !== "" &&
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

async function readJson(filePath, context) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    throw new Error(`${context}: cannot read valid JSON at ${filePath}`, {
      cause: error,
    });
  }
}

function assertEqual(failures, context, label, actual, expected) {
  if (actual !== expected) {
    failures.push(
      `${context}: ${label} expected ${JSON.stringify(expected)}, found ${JSON.stringify(actual)}`,
    );
  }
}

function decisionDate(document) {
  const section = document.match(
    /### D-023\b[\s\S]*?(?=\n### |\n## |\s*$)/,
  )?.[0];
  return section?.match(/- \*\*Data:\*\* (\d{4}-\d{2}-\d{2})/)?.[1];
}

async function auditSpecies({
  packRoot,
  creature,
  spriteRevision,
  globalPaths,
  failures,
}) {
  const context = `${creature.id} (${creature.path})`;
  if (!relativePathIsSafe(creature.path)) {
    failures.push(`${context}: unsafe creature path`);
    return {
      sprites: 0,
      hashes: 0,
      pngs: 0,
      bytes: 0,
      paths: [],
    };
  }
  const creatureRoot = path.resolve(packRoot, creature.path);
  if (!pathIsInside(packRoot, creatureRoot)) {
    failures.push(`${context}: creature path escapes pack root`);
    return {
      sprites: 0,
      hashes: 0,
      pngs: 0,
      bytes: 0,
      paths: [],
    };
  }

  const inventoryPath = path.join(creatureRoot, "sprites", "inventory.json");
  const inventory = await readJson(inventoryPath, context);
  assertEqual(
    failures,
    context,
    "inventory pokemonId",
    inventory.pokemonId,
    creature.id,
  );
  const published = inventory.entries.filter((entry) => entry.repositoryAsset);
  assertEqual(failures, context, "published sprite count", published.length, 4);
  assertEqual(
    failures,
    context,
    "mediaImportedCount",
    inventory.mediaImportedCount,
    published.length,
  );

  const variants = new Set();
  const localPaths = [];
  let hashes = 0;
  let pngs = 0;
  let bytes = 0;

  for (const entry of published) {
    const asset = entry.repositoryAsset;
    const quarantine = entry.localQuarantine;
    const variantContext = `${context} ${asset.variantId ?? "unknown-variant"}`;
    if (!EXPECTED_BATTLE_VARIANTS.includes(asset.variantId)) {
      failures.push(`${variantContext}: unknown variantId`);
    }
    if (variants.has(asset.variantId)) {
      failures.push(`${variantContext}: duplicate variantId`);
    }
    variants.add(asset.variantId);
    const [perspective, variation] = String(asset.variantId).split("-");
    const speciesFolder = path.posix.basename(creature.path);
    const fileName = `${speciesFolder}--pokeapi-default--${perspective}--${variation}.png`;
    const expectedRepositoryPath = `sprites/${fileName}`;
    const expectedPrivatePath =
      `.private/pokemon-canonical/sprite-revisions/${spriteRevision}/` +
      `${speciesFolder}/sprites/${fileName}`;
    assertEqual(
      failures,
      variantContext,
      "entry status",
      entry.status,
      "doubtful",
    );
    assertEqual(
      failures,
      variantContext,
      "repositoryPath",
      asset.repositoryPath,
      expectedRepositoryPath,
    );
    assertEqual(
      failures,
      variantContext,
      "local variantId",
      quarantine?.variantId,
      asset.variantId,
    );
    assertEqual(
      failures,
      variantContext,
      "localOnly",
      quarantine?.localOnly,
      true,
    );
    assertEqual(
      failures,
      variantContext,
      "private revision path",
      quarantine?.relativePrivatePath,
      expectedPrivatePath,
    );
    if (
      !relativePathIsSafe(asset.repositoryPath) ||
      !SAFE_REPOSITORY_PATH.test(asset.repositoryPath)
    ) {
      failures.push(
        `${variantContext}: unsafe or unexpected repositoryPath ${asset.repositoryPath}`,
      );
      continue;
    }

    const absolutePath = path.resolve(creatureRoot, asset.repositoryPath);
    if (!pathIsInside(packRoot, absolutePath)) {
      failures.push(
        `${variantContext}: repository path escapes pack root: ${asset.repositoryPath}`,
      );
      continue;
    }
    const packRelativePath = path
      .relative(packRoot, absolutePath)
      .replaceAll("\\", "/");
    if (globalPaths.has(packRelativePath)) {
      failures.push(
        `${variantContext}: duplicate repository file reference ${packRelativePath}`,
      );
    }
    globalPaths.add(packRelativePath);
    localPaths.push(packRelativePath);

    let fileStat;
    let buffer;
    try {
      fileStat = await stat(absolutePath);
      buffer = await readFile(absolutePath);
    } catch (error) {
      failures.push(
        `${variantContext}: missing file ${packRelativePath}: ${error.message}`,
      );
      continue;
    }
    if (!fileStat.isFile()) {
      failures.push(`${variantContext}: ${packRelativePath} is not a file`);
      continue;
    }
    if (path.extname(absolutePath).toLowerCase() !== ".png") {
      failures.push(`${variantContext}: file extension is not .png`);
    }

    const actualHash = createHash("sha256").update(buffer).digest("hex");
    if (!SHA256.test(asset.sha256)) {
      failures.push(`${variantContext}: inventory SHA-256 is malformed`);
    }
    assertEqual(failures, variantContext, "SHA-256", actualHash, asset.sha256);
    assertEqual(
      failures,
      variantContext,
      "private SHA-256",
      quarantine?.sha256,
      asset.sha256,
    );
    hashes += 1;
    assertEqual(
      failures,
      variantContext,
      "byte count",
      buffer.length,
      asset.bytes,
    );
    assertEqual(
      failures,
      variantContext,
      "private byte count",
      quarantine?.bytes,
      asset.bytes,
    );
    bytes += buffer.length;

    try {
      const image = inspectPng(buffer, `${variantContext} ${packRelativePath}`);
      pngs += 1;
      assertEqual(failures, variantContext, "width", image.width, asset.width);
      assertEqual(
        failures,
        variantContext,
        "private width",
        quarantine?.width,
        asset.width,
      );
      assertEqual(
        failures,
        variantContext,
        "height",
        image.height,
        asset.height,
      );
      assertEqual(
        failures,
        variantContext,
        "private height",
        quarantine?.height,
        asset.height,
      );
      assertEqual(
        failures,
        variantContext,
        "hasTransparency",
        image.hasTransparency,
        asset.hasTransparency,
      );
      assertEqual(
        failures,
        variantContext,
        "private hasTransparency",
        quarantine?.hasTransparency,
        asset.hasTransparency,
      );
      assertEqual(
        failures,
        variantContext,
        "animated",
        image.animated,
        asset.animated,
      );
      assertEqual(
        failures,
        variantContext,
        "private animated",
        quarantine?.animated,
        asset.animated,
      );
      assertEqual(
        failures,
        variantContext,
        "frameCount",
        image.frameCount,
        asset.frameCount,
      );
      assertEqual(
        failures,
        variantContext,
        "private frameCount",
        quarantine?.frameCount,
        asset.frameCount,
      );
    } catch (error) {
      failures.push(error.message);
    }

    assertEqual(
      failures,
      variantContext,
      "rightsStatus",
      asset.rightsStatus,
      "doubtful",
    );
    assertEqual(
      failures,
      variantContext,
      "decisionId",
      asset.decisionId,
      D023_DECISION_ID,
    );
    assertEqual(
      failures,
      variantContext,
      "ownerAuthorizedAt",
      asset.ownerAuthorizedAt,
      D023_OWNER_AUTHORIZED_AT,
    );
  }

  for (const expected of EXPECTED_BATTLE_VARIANTS) {
    if (!variants.has(expected)) {
      failures.push(`${context}: missing variant ${expected}`);
    }
  }
  return {
    sprites: published.length,
    hashes,
    pngs,
    bytes,
    paths: localPaths,
  };
}

async function publishedPngPaths(packRoot, creatures) {
  const paths = [];
  for (const creature of creatures) {
    const spritesDirectory = path.resolve(packRoot, creature.path, "sprites");
    let entries;
    try {
      entries = await readdir(spritesDirectory, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.isFile() && entry.name.toLowerCase().endsWith(".png")) {
        paths.push(
          path
            .relative(packRoot, path.join(spritesDirectory, entry.name))
            .replaceAll("\\", "/"),
        );
      }
    }
  }
  return paths.sort();
}

export class PokemonCanonicalAuditError extends Error {
  constructor(failures) {
    const displayed = failures.slice(0, 30);
    const suffix =
      failures.length > displayed.length
        ? `\n... ${failures.length - displayed.length} additional errors`
        : "";
    super(
      `pokemon canonical asset audit failed:\n${displayed.join("\n")}${suffix}`,
    );
    this.name = "PokemonCanonicalAuditError";
    this.failures = failures;
  }
}

export async function auditPokemonCanonicalAssets({
  packRoot = path.resolve("content", "packs", "pokemon-canonical"),
  decisionsPath = path.resolve("docs", "decisions.md"),
  expectedSpeciesCount = 1025,
  expectedSpriteCount = expectedSpeciesCount * 4,
} = {}) {
  const startedAt = performance.now();
  const absolutePackRoot = path.resolve(packRoot);
  const manifest = await readJson(
    path.join(absolutePackRoot, "manifest.json"),
    "pack manifest",
  );
  const failures = [];
  const globalPaths = new Set();

  assertEqual(
    failures,
    "manifest",
    "speciesCount",
    manifest.scope?.speciesCount,
    expectedSpeciesCount,
  );
  assertEqual(
    failures,
    "manifest",
    "creature entry count",
    manifest.creatures?.length,
    expectedSpeciesCount,
  );
  assertEqual(
    failures,
    "manifest",
    "mediaImportedCount",
    manifest.scope?.mediaImportedCount,
    expectedSpriteCount,
  );
  assertEqual(
    failures,
    "manifest",
    "localPrivateSpriteCount",
    manifest.scope?.localPrivateSpriteCount,
    expectedSpriteCount,
  );
  assertEqual(
    failures,
    "manifest",
    "runtimeEnabled",
    manifest.runtimeEnabled,
    false,
  );
  assertEqual(
    failures,
    "manifest",
    "replacementRequired",
    manifest.replacementRequired,
    true,
  );
  assertEqual(
    failures,
    "manifest",
    "licenseStatus",
    manifest.licenseStatus,
    "doubtful",
  );
  assertEqual(
    failures,
    "manifest",
    "publicationPolicy",
    manifest.publicationPolicy,
    "temporary-owner-authorized-reference",
  );
  assertEqual(
    failures,
    "manifest",
    "sprite licenseStatus",
    manifest.spriteSource?.licenseStatus,
    "doubtful",
  );
  assertEqual(
    failures,
    "manifest",
    "authorization decision",
    manifest.ownerAuthorization?.decisionId,
    D023_DECISION_ID,
  );
  assertEqual(
    failures,
    "manifest",
    "authorization date",
    manifest.ownerAuthorization?.authorizedAt,
    D023_OWNER_AUTHORIZED_AT,
  );
  assertEqual(
    failures,
    "manifest",
    "authorization scope",
    manifest.ownerAuthorization?.scope,
    D023_SCOPE,
  );
  let spriteRevision = manifest.spriteSource?.sourceRevision;
  try {
    spriteRevision = validateGitSha(spriteRevision, "manifest sprite revision");
  } catch (error) {
    failures.push(error.message);
  }

  const decisions = await readFile(decisionsPath, "utf8");
  assertEqual(
    failures,
    "D-023",
    "decision document date",
    decisionDate(decisions),
    D023_OWNER_AUTHORIZED_AT,
  );

  let sprites = 0;
  let hashes = 0;
  let pngs = 0;
  let bytes = 0;
  for (const creature of manifest.creatures ?? []) {
    const result = await auditSpecies({
      packRoot: absolutePackRoot,
      creature,
      spriteRevision,
      globalPaths,
      failures,
    });
    sprites += result.sprites;
    hashes += result.hashes;
    pngs += result.pngs;
    bytes += result.bytes;
  }

  const actualPngs = await publishedPngPaths(
    absolutePackRoot,
    manifest.creatures ?? [],
  );
  const inventoriedPngs = [...globalPaths].sort();
  assertEqual(
    failures,
    "global",
    "published sprite entries",
    sprites,
    expectedSpriteCount,
  );
  assertEqual(
    failures,
    "global",
    "unique inventory paths",
    globalPaths.size,
    expectedSpriteCount,
  );
  assertEqual(
    failures,
    "global",
    "published PNG files",
    actualPngs.length,
    expectedSpriteCount,
  );
  const missingFiles = inventoriedPngs.filter(
    (entry) => !actualPngs.includes(entry),
  );
  const extraFiles = actualPngs.filter((entry) => !globalPaths.has(entry));
  if (missingFiles.length > 0) {
    failures.push(`global: missing PNG files ${missingFiles.join(", ")}`);
  }
  if (extraFiles.length > 0) {
    failures.push(`global: untracked extra PNG files ${extraFiles.join(", ")}`);
  }

  if (failures.length > 0) {
    throw new PokemonCanonicalAuditError(failures);
  }
  return {
    speciesAudited: manifest.creatures.length,
    spritesAudited: sprites,
    hashesVerified: hashes,
    pngsDecoded: pngs,
    uniquePaths: globalPaths.size,
    bytes,
    errors: 0,
    durationMs: Math.round(performance.now() - startedAt),
  };
}
