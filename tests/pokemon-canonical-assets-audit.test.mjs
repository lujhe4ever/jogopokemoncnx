import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import pngjs from "pngjs";
import { afterEach, describe, expect, it } from "vitest";
import {
  PokemonCanonicalAuditError,
  auditPokemonCanonicalAssets,
} from "../scripts/lib/audit-pokemon-canonical-assets.mjs";
import {
  D023_DECISION_ID,
  D023_OWNER_AUTHORIZED_AT,
  D023_SCOPE,
  EXPECTED_BATTLE_VARIANTS,
} from "../scripts/lib/pokemon-canonical-policy.mjs";
import { inspectPng } from "../scripts/lib/png-inspection.mjs";

const { PNG } = pngjs;
const temporaryRoots = [];
const SPRITE_REVISION = "a".repeat(40);

function spriteBuffer() {
  const image = new PNG({ width: 2, height: 2 });
  image.data.fill(255);
  return PNG.sync.write(image);
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value)}\n`);
}

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "pokemon-audit-"));
  temporaryRoots.push(root);
  const packRoot = path.join(root, "content", "packs", "pokemon-canonical");
  const decisionsPath = path.join(root, "docs", "decisions.md");
  const creaturePath = "creatures/0001-testmon";
  const creatureRoot = path.join(packRoot, creaturePath);
  const buffer = spriteBuffer();
  const image = inspectPng(buffer, "fixture");
  const entries = [];

  for (const variantId of EXPECTED_BATTLE_VARIANTS) {
    const [perspective, variation] = variantId.split("-");
    const repositoryPath = `sprites/0001-testmon--pokeapi-default--${perspective}--${variation}.png`;
    await mkdir(path.join(creatureRoot, "sprites"), { recursive: true });
    await writeFile(path.join(creatureRoot, repositoryPath), buffer);
    entries.push({
      status: "doubtful",
      localQuarantine: {
        variantId,
        localOnly: true,
        relativePrivatePath:
          `.private/pokemon-canonical/sprite-revisions/${SPRITE_REVISION}/` +
          `0001-testmon/sprites/0001-testmon--pokeapi-default--${perspective}--${variation}.png`,
        sha256: createHash("sha256").update(buffer).digest("hex"),
        bytes: buffer.length,
        width: image.width,
        height: image.height,
        animated: false,
        frameCount: 1,
        hasTransparency: image.hasTransparency,
      },
      repositoryAsset: {
        variantId,
        repositoryPath,
        sha256: createHash("sha256").update(buffer).digest("hex"),
        bytes: buffer.length,
        width: image.width,
        height: image.height,
        animated: false,
        frameCount: 1,
        hasTransparency: image.hasTransparency,
        decisionId: D023_DECISION_ID,
        ownerAuthorizedAt: D023_OWNER_AUTHORIZED_AT,
        rightsStatus: "doubtful",
      },
    });
  }
  const inventoryPath = path.join(creatureRoot, "sprites", "inventory.json");
  await writeJson(inventoryPath, {
    pokemonId: "pokemon:0001-testmon",
    mediaImportedCount: 4,
    entries,
  });
  await writeJson(path.join(packRoot, "manifest.json"), {
    runtimeEnabled: false,
    replacementRequired: true,
    licenseStatus: "doubtful",
    publicationPolicy: "temporary-owner-authorized-reference",
    ownerAuthorization: {
      decisionId: D023_DECISION_ID,
      authorizedAt: D023_OWNER_AUTHORIZED_AT,
      scope: D023_SCOPE,
    },
    spriteSource: {
      sourceRevision: SPRITE_REVISION,
      licenseStatus: "doubtful",
    },
    scope: {
      speciesCount: 1,
      mediaImportedCount: 4,
      localPrivateSpriteCount: 4,
    },
    creatures: [
      {
        id: "pokemon:0001-testmon",
        path: creaturePath,
      },
    ],
  });
  await mkdir(path.dirname(decisionsPath), { recursive: true });
  await writeFile(
    decisionsPath,
    `### D-023 — Fixture\n\n- **Data:** ${D023_OWNER_AUTHORIZED_AT}\n`,
  );
  return {
    root,
    packRoot,
    decisionsPath,
    inventoryPath,
    creatureRoot,
  };
}

async function audit(options) {
  return auditPokemonCanonicalAssets({
    ...options,
    expectedSpeciesCount: 1,
    expectedSpriteCount: 4,
  });
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("complete pokemon asset audit", () => {
  it("recalculates and decodes every published sprite in the real pack", async () => {
    await expect(auditPokemonCanonicalAssets()).resolves.toMatchObject({
      speciesAudited: 1025,
      spritesAudited: 4100,
      hashesVerified: 4100,
      pngsDecoded: 4100,
      uniquePaths: 4100,
      errors: 0,
    });
  }, 30_000);

  it("accepts a complete controlled fixture", async () => {
    const options = await fixture();
    await expect(audit(options)).resolves.toMatchObject({
      speciesAudited: 1,
      spritesAudited: 4,
      hashesVerified: 4,
      pngsDecoded: 4,
    });
  });

  it.each([
    ["hash", (asset) => (asset.sha256 = "0".repeat(64)), /SHA-256 expected/],
    ["bytes", (asset) => (asset.bytes += 1), /byte count expected/],
    ["width", (asset) => (asset.width += 1), /width expected/],
    [
      "authorization date",
      (asset) => (asset.ownerAuthorizedAt = "2099-01-01"),
      /ownerAuthorizedAt expected/,
    ],
  ])("rejects altered %s metadata", async (_label, mutate, pattern) => {
    const options = await fixture();
    const inventory = JSON.parse(await readFile(options.inventoryPath, "utf8"));
    mutate(inventory.entries[0].repositoryAsset);
    await writeJson(options.inventoryPath, inventory);
    await expect(audit(options)).rejects.toThrow(pattern);
  });

  it("rejects missing and extra files", async () => {
    const missing = await fixture();
    const inventory = JSON.parse(await readFile(missing.inventoryPath, "utf8"));
    await unlink(
      path.join(
        missing.creatureRoot,
        inventory.entries[0].repositoryAsset.repositoryPath,
      ),
    );
    await expect(audit(missing)).rejects.toBeInstanceOf(
      PokemonCanonicalAuditError,
    );

    const extra = await fixture();
    await writeFile(
      path.join(extra.creatureRoot, "sprites", "extra.png"),
      spriteBuffer(),
    );
    await expect(audit(extra)).rejects.toThrow(/untracked extra PNG/);
  });

  it("rejects invalid PNG bytes even when hash and byte metadata match", async () => {
    const options = await fixture();
    const inventory = JSON.parse(await readFile(options.inventoryPath, "utf8"));
    const asset = inventory.entries[0].repositoryAsset;
    const invalid = Buffer.from("not a PNG file");
    await writeFile(
      path.join(options.creatureRoot, asset.repositoryPath),
      invalid,
    );
    asset.bytes = invalid.length;
    asset.sha256 = createHash("sha256").update(invalid).digest("hex");
    await writeJson(options.inventoryPath, inventory);
    await expect(audit(options)).rejects.toThrow(/invalid PNG signature/);
  });

  it("rejects missing, duplicate, and unknown variants", async () => {
    const options = await fixture();
    const inventory = JSON.parse(await readFile(options.inventoryPath, "utf8"));
    inventory.entries[1].repositoryAsset.variantId =
      inventory.entries[0].repositoryAsset.variantId;
    inventory.entries[2].repositoryAsset.variantId = "side-normal";
    await writeJson(options.inventoryPath, inventory);
    await expect(audit(options)).rejects.toThrow(
      /duplicate variantId|unknown variantId|missing variant/,
    );
  });

  it("rejects divergence between D-023 policy, manifest, and inventory", async () => {
    const options = await fixture();
    await writeFile(
      options.decisionsPath,
      "### D-023 — Fixture\n\n- **Data:** 2099-01-01\n",
    );
    await expect(audit(options)).rejects.toThrow(
      /decision document date expected/,
    );
  });

  it("rejects a private cache path from a different source revision", async () => {
    const options = await fixture();
    const inventory = JSON.parse(await readFile(options.inventoryPath, "utf8"));
    inventory.entries[0].localQuarantine.relativePrivatePath =
      inventory.entries[0].localQuarantine.relativePrivatePath.replace(
        SPRITE_REVISION,
        "b".repeat(40),
      );
    await writeJson(options.inventoryPath, inventory);
    await expect(audit(options)).rejects.toThrow(
      /private revision path expected/,
    );
  });
});
