import { Buffer } from "node:buffer";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateGitSha } from "./pokemon-canonical-policy.mjs";

const SPECIES_FOLDER = /^\d{4}-[a-z0-9-]+$/;
const PNG_FILE =
  /^\d{4}-[a-z0-9-]+--pokeapi-default--(front|back)--(normal|shiny)\.png$/;

function validateSegment(value, pattern, label) {
  if (
    typeof value !== "string" ||
    !pattern.test(value) ||
    path.basename(value) !== value
  ) {
    throw new Error(`${label} is not a safe cache path segment: ${value}`);
  }
  return value;
}

function assertWithin(parent, candidate) {
  const relative = path.relative(parent, candidate);
  if (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  ) {
    return;
  }
  throw new Error(`sprite cache path escapes revision root: ${candidate}`);
}

export function revisionedSpriteCachePath({
  root,
  spritesSha,
  speciesFolder,
  fileName,
}) {
  const revision = validateGitSha(spritesSha, "sprites revision");
  const safeSpecies = validateSegment(
    speciesFolder,
    SPECIES_FOLDER,
    "species folder",
  );
  const safeFile = validateSegment(fileName, PNG_FILE, "sprite file");
  const revisionRoot = path.resolve(
    root,
    ".private",
    "pokemon-canonical",
    "sprite-revisions",
    revision,
  );
  const absolutePath = path.resolve(
    revisionRoot,
    safeSpecies,
    "sprites",
    safeFile,
  );
  assertWithin(revisionRoot, absolutePath);
  return {
    absolutePath,
    relativePath: path
      .relative(path.resolve(root), absolutePath)
      .replaceAll("\\", "/"),
    revision,
  };
}

export async function loadRevisionedSprite({
  root,
  spritesSha,
  speciesFolder,
  fileName,
  refresh = false,
  fetchBuffer,
}) {
  const cachePath = revisionedSpriteCachePath({
    root,
    spritesSha,
    speciesFolder,
    fileName,
  });

  if (!refresh) {
    try {
      return {
        ...cachePath,
        buffer: await readFile(cachePath.absolutePath),
        cacheHit: true,
      };
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }

  const buffer = await fetchBuffer();
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error(
      `sprite fetch returned no bytes for revision ${cachePath.revision}, species ${speciesFolder}, file ${fileName}`,
    );
  }
  await mkdir(path.dirname(cachePath.absolutePath), { recursive: true });
  await writeFile(cachePath.absolutePath, buffer);
  return { ...cachePath, buffer, cacheHit: false };
}
