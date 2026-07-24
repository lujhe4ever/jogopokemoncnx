import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const RUNTIME_ROOTS = ["apps", "packages"];
const RUNTIME_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".mjs",
  ".ts",
  ".tsx",
]);
const EXCLUDED_DIRECTORIES = new Set([
  ".cache",
  ".git",
  ".private",
  "build",
  "coverage",
  "dist",
  "fixtures",
  "node_modules",
  "test",
  "tests",
]);
const FORBIDDEN_REFERENCES = [
  /pokemon-canonical/i,
  /content[\\/]+packs[\\/]+pokemon-canonical/i,
  /--pokeapi-default--/i,
  /raw\.githubusercontent\.com[\\/]PokeAPI[\\/](sprites|cries)/i,
  /https?:\/\/[^\s"'`]+\.gif(?:[?#][^\s"'`]*)?/i,
];

function runtimeApproved(manifest) {
  return (
    manifest.runtimeEnabled === true &&
    manifest.replacementRequired === false &&
    manifest.licenseStatus === "approved" &&
    manifest.publicationPolicy === "approved-runtime-content" &&
    manifest.ownerAuthorization?.decisionId !== "D-023"
  );
}

async function collectRuntimeFiles(directory) {
  const found = [];
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return found;
    throw error;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRECTORIES.has(entry.name)) {
        found.push(
          ...(await collectRuntimeFiles(path.join(directory, entry.name))),
        );
      }
      continue;
    }
    if (
      entry.isFile() &&
      RUNTIME_EXTENSIONS.has(path.extname(entry.name).toLowerCase()) &&
      !/\.(test|spec)\.[cm]?[jt]sx?$/.test(entry.name)
    ) {
      found.push(path.join(directory, entry.name));
    }
  }
  return found;
}

export class RuntimeContentBoundaryError extends Error {
  constructor(violations) {
    super(
      `doubtful pokemon content is referenced by runtime:\n${violations
        .map(
          (violation) =>
            `${violation.file}:${violation.line}: ${violation.asset}: ${violation.status}: ${violation.policy}: ${violation.snippet}`,
        )
        .join("\n")}`,
    );
    this.name = "RuntimeContentBoundaryError";
    this.violations = violations;
  }
}

export async function checkRuntimeContentBoundaries({
  root = process.cwd(),
  manifestPath = path.join(
    root,
    "content",
    "packs",
    "pokemon-canonical",
    "manifest.json",
  ),
} = {}) {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (runtimeApproved(manifest)) {
    return { scannedFiles: 0, violations: 0, policy: "approved-runtime" };
  }

  const files = [];
  for (const runtimeRoot of RUNTIME_ROOTS) {
    files.push(...(await collectRuntimeFiles(path.join(root, runtimeRoot))));
  }
  files.sort();
  const blockedTokens = new Map();
  for (const relativePath of [
    "content/assets/catalogs/static-sprites.json",
    "content/assets/catalogs/audio.json",
  ]) {
    try {
      const catalog = JSON.parse(
        await readFile(path.join(root, relativePath), "utf8"),
      );
      const shards = await Promise.all(
        (catalog.shards ?? []).map(async (shard) =>
          JSON.parse(await readFile(path.join(root, shard.path), "utf8")),
        ),
      );
      const assets = [
        ...(catalog.assets ?? []),
        ...shards.flatMap((shard) => shard.assets ?? []),
      ];
      for (const asset of assets) {
        if (asset.runtimeEnabled === true) continue;
        for (const token of [asset.assetId, asset.localPath].filter(Boolean)) {
          blockedTokens.set(token, asset);
        }
      }
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  const violations = [];
  for (const file of files) {
    const lines = (await readFile(file, "utf8")).split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const genericViolation = FORBIDDEN_REFERENCES.some((pattern) =>
        pattern.test(lines[index]),
      );
      const blockedReference = [...blockedTokens.entries()].find(([token]) =>
        lines[index].includes(token),
      );
      if (genericViolation || blockedReference) {
        const blockedAsset = blockedReference?.[1];
        violations.push({
          file: path.relative(root, file).replaceAll("\\", "/"),
          line: index + 1,
          snippet: lines[index].trim().slice(0, 240),
          asset: blockedAsset?.assetId ?? "pokemon-content-reference",
          status: blockedAsset?.licenseStatus ?? manifest.licenseStatus,
          policy: blockedAsset
            ? "asset-runtime-disabled"
            : "blocked-content-reference",
        });
      }
    }
  }
  if (violations.length > 0) {
    throw new RuntimeContentBoundaryError(violations);
  }
  return {
    scannedFiles: files.length,
    violations: 0,
    policy: "blocked-doubtful-content",
  };
}
