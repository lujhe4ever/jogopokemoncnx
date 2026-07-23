import console from "node:console";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const readiness = JSON.parse(
  readFileSync(resolve(root, "ops", "alpha", "readiness.json"), "utf8"),
);
const failures = [];

if (readiness.status !== "internal_validation")
  failures.push("alpha status must remain internal_validation");
if (readiness.deploymentAuthorized !== false)
  failures.push("deployment must remain unauthorized");
if (readiness.externalParticipantsAuthorized !== false)
  failures.push("external participants must remain unauthorized");
if (readiness.telemetryDefaultEnabled !== false)
  failures.push("telemetry must be disabled by default");
if (!Array.isArray(readiness.journey) || readiness.journey.length < 6)
  failures.push("the integrated journey is incomplete");

for (const checkpoint of readiness.journey ?? []) {
  if (!checkpoint.id || !checkpoint.evidence?.length)
    failures.push("every journey checkpoint requires evidence");
  for (const evidence of checkpoint.evidence ?? []) {
    if (!existsSync(resolve(root, evidence)))
      failures.push(`${checkpoint.id}: missing evidence ${evidence}`);
  }
}

for (const defect of readiness.openDefects ?? []) {
  if (["P0", "P1"].includes(defect.severity))
    failures.push(`blocking defect remains open: ${defect.id}`);
}

const environment = readFileSync(resolve(root, ".env.example"), "utf8");
if (!environment.includes("ALPHA_TELEMETRY_ENABLED=false"))
  failures.push("telemetry must be explicitly disabled in .env.example");

const webIndex = readFileSync(
  resolve(root, "apps", "web", "index.html"),
  "utf8",
);
for (const input of webIndex.match(/<input\b[^>]*>/g) ?? []) {
  if (/\bname=["'](?:email|password)["']/.test(input) && /\bvalue=/.test(input))
    failures.push("credential fields must not contain default values");
}

if (failures.length) throw new Error(failures.join("\n"));
console.log(
  `alpha readiness: ${String(readiness.journey.length)} checkpoints, no P0/P1, no deploy`,
);
