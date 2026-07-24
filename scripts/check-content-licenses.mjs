import console from "node:console";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const packs = resolve(import.meta.dirname, "..", "content", "packs");
const failures = [];
const temporaryExceptions = [];
for (const directory of readdirSync(packs, { withFileTypes: true })) {
  if (!directory.isDirectory()) continue;
  const path = join(packs, directory.name, "manifest.json");
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  const approvedProvenance =
    manifest.author === "Projeto LT" &&
    ["Original project content", "CC0"].includes(manifest.license);
  const temporaryReference =
    directory.name === "pokemon-canonical" &&
    manifest.id === "pokemon-canonical" &&
    manifest.publicationPolicy === "temporary-owner-authorized-reference" &&
    manifest.runtimeEnabled === false &&
    manifest.replacementRequired === true &&
    manifest.licenseStatus === "doubtful" &&
    manifest.spriteSource?.licenseStatus === "doubtful";

  if (approvedProvenance) continue;
  if (temporaryReference) {
    temporaryExceptions.push(directory.name);
    continue;
  }
  failures.push(directory.name);
}
if (failures.length > 0)
  throw new Error(`content provenance missing: ${failures.join(", ")}`);
console.log(
  `content licenses: approved packs validated; temporary exceptions: ${
    temporaryExceptions.join(", ") || "none"
  }`,
);
