import console from "node:console";
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const budgets = JSON.parse(
  readFileSync(join(root, "ops", "budgets.json"), "utf8"),
);

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}

function total(directory) {
  return files(directory).reduce((sum, file) => sum + statSync(file).size, 0);
}

const webBytes = total(join(root, "apps", "web", "dist"));
const adminBytes = total(join(root, "apps", "admin", "dist"));
const contentFiles = files(join(root, "content"));
const largestContentAsset = Math.max(
  0,
  ...contentFiles.map((file) => statSync(file).size),
);
const results = [
  ["web bundle", webBytes, budgets.webBundleBytes],
  ["admin bundle", adminBytes, budgets.adminBundleBytes],
  [
    "largest content asset",
    largestContentAsset,
    budgets.largestContentAssetBytes,
  ],
];
for (const [name, actual, limit] of results) {
  if (actual > limit)
    throw new Error(`${name} exceeds budget: ${actual} > ${limit}`);
  console.log(`${name}: ${actual}/${limit} bytes`);
}
