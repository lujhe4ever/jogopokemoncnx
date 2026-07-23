import console from "node:console";
import { readdirSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const ignored = new Set([".git", "node_modules", "dist", "coverage"]);
const extensions = new Set([
  ".ts",
  ".js",
  ".mjs",
  ".json",
  ".md",
  ".yml",
  ".yaml",
  ".env",
  ".example",
  ".sql",
  ".conf",
  ".sh",
  ".ps1",
]);
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /^ADMIN_STEP_UP_SECRET=.+$/m,
  /^METRICS_TOKEN=.+$/m,
];

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (ignored.has(entry.name)) return [];
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}

const findings = [];
for (const file of files(root)) {
  if (!extensions.has(extname(file)) && !file.endsWith(".env.example"))
    continue;
  const content = readFileSync(file, "utf8");
  if (patterns.some((pattern) => pattern.test(content)))
    findings.push(file.slice(root.length + 1));
}
if (findings.length > 0)
  throw new Error(`potential secrets found: ${findings.join(", ")}`);
console.log("secret scan: no committed credential patterns found");
