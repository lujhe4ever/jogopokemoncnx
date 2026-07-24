import { createReadStream } from "node:fs";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline";
import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const assetsDirectory = path.join(repositoryRoot, "docs", "assets");

const requiredArtifacts = [
  "animation-source-report.md",
  "asset-gap-matrix.json",
  "asset-coverage-report.md",
  "asset-quarantine-report.md",
  "asset-replacement-plan.md",
  "audio-availability.csv",
  "audio-source-report.md",
  "canonical-data-findings.json",
  "character-sprite-research.md",
  "final-animations.csv",
  "final-asset-inventory.md",
  "final-audio.csv",
  "final-characters.csv",
  "final-sprites.csv",
  "pokemon-animation-inventory.md",
  "pokemon-assets-audit.md",
  "pokemon-assets-roadmap.md",
  "pokemon-audio-inventory.md",
  "pokemon-canonical-data-audit.md",
  "pokemon-visual-compatibility.md",
  "proposed-asset-schema.json",
  "source-register.json",
  "sprite-availability.csv",
  "visual-compatibility-report.md",
  "world-asset-research.md",
].sort();

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += character;
    }
  }

  values.push(value);
  return values;
}

async function summarizeCsv(fileName, fields) {
  const input = createReadStream(path.join(assetsDirectory, fileName), "utf8");
  const lines = createInterface({ input, crlfDelay: Infinity });
  let headers;
  let rowCount = 0;
  const counts = Object.fromEntries(fields.map((field) => [field, new Map()]));

  for await (const line of lines) {
    if (!headers) {
      headers = parseCsvLine(line);
      continue;
    }

    if (line.length === 0) {
      continue;
    }

    const values = parseCsvLine(line);
    rowCount += 1;
    for (const field of fields) {
      const value = values[headers.indexOf(field)];
      counts[field].set(value, (counts[field].get(value) ?? 0) + 1);
    }
  }

  return { headers, rowCount, counts };
}

async function readJson(fileName) {
  return JSON.parse(
    await readFile(path.join(assetsDirectory, fileName), "utf8"),
  );
}

describe("pokemon asset audit documentation", () => {
  it("contains the original audit and production-library artifacts", async () => {
    await Promise.all(
      requiredArtifacts.map((fileName) =>
        access(path.join(assetsDirectory, fileName)),
      ),
    );

    expect((await readdir(assetsDirectory)).sort()).toEqual(requiredArtifacts);
  });

  it("pins source revisions and keeps disputed franchise media blocked", async () => {
    const register = await readJson("source-register.json");
    const sources = new Map(
      register.sources.map((source) => [source.sourceId, source]),
    );

    expect(sources.get("pokeapi-data")).toMatchObject({
      commitSha: "091f3a0599b1efb01f6b502232eeb7d8cbbb3e8f",
      legalStatus: "pending",
    });
    expect(sources.get("pokeapi-sprites")).toMatchObject({
      commitSha: "bf4c47ac82c33b330e33d98b8882d1cedb2f53e7",
      legalStatus: "doubtful",
    });
    expect(sources.get("pokeapi-cries")).toMatchObject({
      commitSha: "7ba07038103b3482973fa781e25c09debbaaedd8",
      legalStatus: "doubtful",
    });
    expect(sources.get("pokemon-showdown-server").commitSha).toBe(
      "20ad99ffc9a5a4a4e8fb56ab04ad8e4255b3f2b4",
    );
    expect(sources.get("pokemon-showdown-client-resources").commitSha).toBe(
      "2a5133088021c1fe2711a096802896b2055744a3",
    );
  });

  it("inventories every mapped sprite candidate without approving runtime use", async () => {
    const summary = await summarizeCsv("sprite-availability.csv", [
      "animated",
      "extension",
      "legal_status",
      "published_temporary",
      "runtime_status",
    ]);

    expect(summary.rowCount).toBe(60_065);
    expect(summary.counts.animated.get("false")).toBe(48_210);
    expect(summary.counts.animated.get("true")).toBe(11_855);
    expect(summary.counts.published_temporary.get("true")).toBe(4_100);
    expect(summary.counts.runtime_status.get("blocked")).toBe(60_065);
    expect(summary.counts.legal_status.get("doubtful")).toBe(51_081);
    expect(summary.counts.legal_status.get("pending")).toBe(8_984);
    expect(summary.counts.extension.get("gif")).toBe(11_133);
    expect(summary.counts.extension.get("svg")).toBe(1_146);
  });

  it("inventories all cry candidates without importing or enabling them", async () => {
    const summary = await summarizeCsv("audio-availability.csv", [
      "set",
      "legal_status",
      "imported",
      "runtime_status",
    ]);

    expect(summary.rowCount).toBe(2_000);
    expect(summary.counts.set.get("latest")).toBe(1_351);
    expect(summary.counts.set.get("legacy")).toBe(649);
    expect(summary.counts.legal_status.get("doubtful")).toBe(2_000);
    expect(summary.counts.imported.get("false")).toBe(2_000);
    expect(summary.counts.runtime_status.get("blocked")).toBe(2_000);
  });

  it("records canonical coverage and validation limitations explicitly", async () => {
    const findings = await readJson("canonical-data-findings.json");

    expect(findings.scope).toMatchObject({
      speciesRows: 1_025,
      pokemonRows: 1_351,
      alternatePokemonRows: 326,
      pokemonFormRows: 1_579,
      standaloneAlternateFormFolders: 0,
    });
    expect(findings.automatedAudit.metrics).toMatchObject({
      speciesDefinitions: 1_025,
      invalidMoveReferences: 0,
      invalidAbilityReferences: 0,
      invalidVersionGroupReferences: 0,
      invalidMethodReferences: 0,
    });
    expect(findings.automatedAudit.catalogs).toMatchObject({
      moveCount: 937,
      abilityCount: 373,
      movesWithoutEnglishEffect: 111,
      abilitiesWithoutEnglishEffect: 62,
    });
    expect(findings.classifications.approvalMeaning).toContain(
      "automated schema/coverage/referential validation only",
    );
  });

  it("records incomplete visual coverage and a replaceable disabled schema", async () => {
    const gaps = await readJson("asset-gap-matrix.json");
    const schema = await readJson("proposed-asset-schema.json");

    expect(gaps.entityCount).toBe(1_351);
    expect(gaps.slotCoverage).toEqual({
      anyStaticCandidate: 1_345,
      anyAnimationCandidate: 1_276,
      latestCryCandidate: 1_351,
      legacyCryCandidate: 649,
      fourTemporaryPublishedSprites: 1_025,
    });
    expect(
      gaps.entities.every(
        (entity) => entity.coverage.approvedRuntimeAssets === 0,
      ),
    ).toBe(true);
    expect(schema.required).toContain("runtimeEnabled");
    expect(schema.properties.runtimeEnabled.type).toBe("boolean");
    expect(schema.$defs.status.enum).toEqual([
      "approved",
      "pending",
      "doubtful",
      "rejected",
      "quarantined",
    ]);
  });
});
