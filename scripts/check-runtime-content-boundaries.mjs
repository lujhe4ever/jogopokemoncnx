import console from "node:console";
import process from "node:process";
import { checkRuntimeContentBoundaries } from "./lib/runtime-content-boundary.mjs";

try {
  const result = await checkRuntimeContentBoundaries();
  console.log(
    `runtime content boundary: ${result.scannedFiles} files scanned, ${result.violations} prohibited references`,
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
