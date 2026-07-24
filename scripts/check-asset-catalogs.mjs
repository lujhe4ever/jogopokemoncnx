import process from "node:process";
import { auditAssetCatalogs } from "./lib/asset-catalog-audit.mjs";

const scope =
  process.argv.find((argument) => argument.startsWith("--scope="))?.slice(8) ??
  "all";

try {
  const result = await auditAssetCatalogs({ scope });
  process.stdout.write(`${JSON.stringify(result)}\n`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
