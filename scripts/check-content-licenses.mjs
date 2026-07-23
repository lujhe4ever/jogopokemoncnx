import console from "node:console";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const packs = resolve(import.meta.dirname, "..", "content", "packs");
const failures = [];
for (const directory of readdirSync(packs, { withFileTypes: true })) {
  if (!directory.isDirectory()) continue;
  const path = join(packs, directory.name, "manifest.json");
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  if (
    manifest.author !== "Projeto LT" ||
    !["Original project content", "CC0"].includes(manifest.license)
  )
    failures.push(directory.name);
}
if (failures.length > 0)
  throw new Error(`content provenance missing: ${failures.join(", ")}`);
console.log("content licenses: all packs declare approved provenance");
