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
            `${violation.file}:${violation.line}: ${violation.snippet}`,
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
  const violations = [];
  for (const file of files) {
    const lines = (await readFile(file, "utf8")).split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      if (FORBIDDEN_REFERENCES.some((pattern) => pattern.test(lines[index]))) {
        violations.push({
          file: path.relative(root, file).replaceAll("\\", "/"),
          line: index + 1,
          snippet: lines[index].trim().slice(0, 240),
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
