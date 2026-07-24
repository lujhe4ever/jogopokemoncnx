import console from "node:console";
import process from "node:process";
import { auditPokemonCanonicalAssets } from "./lib/audit-pokemon-canonical-assets.mjs";

try {
  const result = await auditPokemonCanonicalAssets();
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
