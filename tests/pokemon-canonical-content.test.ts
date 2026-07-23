import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

type ApprovalStatus =
  "approved" | "pending" | "doubtful" | "rejected" | "quarantined";

interface PokemonSummary {
  id: string;
  nationalDexNumber: number;
  canonicalName: string;
  slug: string;
  path: string;
  assetStatus: ApprovalStatus;
  definitionStatus: ApprovalStatus;
  licenseStatus: ApprovalStatus;
  spriteCandidates: number;
  animationCandidates: number;
  localQuarantineVerified: boolean;
}

interface PackManifest {
  schemaVersion: number;
  completionStatus: string;
  licenseStatus: ApprovalStatus;
  source: { sourceRevision: string };
  spriteSource: { sourceRevision: string };
  scope: {
    speciesCount: number;
    moveCount: number;
    abilityCount: number;
    spriteCandidateCount: number;
    animationCandidateCount: number;
    localPrivateSpriteCount: number;
  };
  creatures: PokemonSummary[];
}

interface MoveCatalog {
  count: number;
  moves: Array<{
    id: number;
    slug: string;
    type: string;
    category: string;
    power: number | null;
    accuracy: number | null;
    pp: number | null;
    priority: number;
    effectChance: number | null;
    effect: string;
  }>;
}

interface AbilityCatalog {
  count: number;
  abilities: Array<{
    id: number;
    slug: string;
    effect: string;
  }>;
}

type LearnMethodTuple = [
  versionGroupId: number,
  methodId: number,
  level: number | null,
  order: number | null,
  masteryLevel: number | null,
  machines: Array<[number | null, string | null]>,
];
type MoveTuple = [moveId: number, learnMethods: LearnMethodTuple[]];

interface MovesDefinition {
  pokemonId: string;
  catalogs: {
    moves: string;
    moveMethods: string;
    versionGroups: string;
  };
  moves: MoveTuple[];
}

interface AbilitiesDefinition {
  abilities: Array<{
    abilityId: number;
    slug: string;
    effect: string;
    shortEffect: string;
    sourceUrl: string;
  }>;
}

interface PokemonDefinition {
  id: string;
  nationalDexNumber: number;
  slug: string;
  types: string[];
  baseStats: Record<string, { value: number; effortYield: number }>;
  abilities: Array<{ slug: string; slot: number; isHidden: boolean }>;
}

interface MediaInventory {
  mediaImportedCount: number;
  statusSummary: Record<ApprovalStatus, number>;
  entries: Array<{
    id: string;
    status: ApprovalStatus;
    extension: string;
    sourceRepositoryPath: string;
    rightsPolicyId: string;
    proposedName: string;
    localQuarantine?: {
      localOnly: boolean;
      relativePrivatePath: string;
      sha256: string;
      bytes: number;
      width: number;
      height: number;
    };
  }>;
}

interface GenerationReport {
  speciesCount: number;
  moveCount: number;
  abilityCount: number;
  spriteCandidateCount: number;
  animationCandidateCount: number;
  privateSpriteCount: number;
  mediaFilesTracked: number;
}

const packDirectory = path.join("content", "packs", "pokemon-canonical");
const expectedSpeciesCount = 1025;
const expectedMoveCount = 937;
const expectedAbilityCount = 373;
const expectedCreatureFiles = [
  "README.md",
  "animations",
  "definitions",
  "manifest.json",
  "sounds",
  "sprites",
];
const sampleDexNumbers = [1, 25, 151, 493, 809, 1025];
const forbiddenMediaExtensions =
  /\.(png|gif|jpe?g|webp|bmp|svg|wav|mp3|ogg|flac|mp4|mov)$/i;

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function findMediaFiles(directory: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...(await findMediaFiles(entryPath)));
    } else if (forbiddenMediaExtensions.test(entry.name)) {
      found.push(entryPath);
    }
  }
  return found;
}

describe("pokemon canonical catalog", () => {
  it("covers the complete canonical National Pokédex and global catalogs", async () => {
    const manifest = await readJson<PackManifest>(
      path.join(packDirectory, "manifest.json"),
    );
    const report = await readJson<GenerationReport>(
      path.join(packDirectory, "reports", "generation-report.json"),
    );
    const moves = await readJson<MoveCatalog>(
      path.join(packDirectory, "catalogs", "moves.json"),
    );
    const abilities = await readJson<AbilityCatalog>(
      path.join(packDirectory, "catalogs", "abilities.json"),
    );

    expect(manifest.schemaVersion).toBe(2);
    expect(manifest.completionStatus).toBe("complete-metadata-inventory");
    expect(manifest.licenseStatus).toBe("pending");
    expect(manifest.source.sourceRevision).toMatch(/^[0-9a-f]{40}$/);
    expect(manifest.spriteSource.sourceRevision).toMatch(/^[0-9a-f]{40}$/);
    expect(manifest.creatures).toHaveLength(expectedSpeciesCount);
    expect(manifest.creatures.map((entry) => entry.nationalDexNumber)).toEqual(
      Array.from({ length: expectedSpeciesCount }, (_, index) => index + 1),
    );
    expect(manifest.creatures[0]?.slug).toBe("bulbasaur");
    expect(manifest.creatures.at(-1)?.slug).toBe("pecharunt");
    expect(manifest.scope.speciesCount).toBe(expectedSpeciesCount);
    expect(manifest.scope.moveCount).toBe(expectedMoveCount);
    expect(manifest.scope.abilityCount).toBe(expectedAbilityCount);
    expect(manifest.scope.localPrivateSpriteCount).toBe(expectedSpeciesCount);
    expect(manifest.scope.spriteCandidateCount).toBeGreaterThan(40_000);
    expect(manifest.scope.animationCandidateCount).toBeGreaterThan(10_000);

    expect(moves.count).toBe(expectedMoveCount);
    expect(moves.moves).toHaveLength(expectedMoveCount);
    expect(
      moves.moves.every(
        (move) =>
          move.id > 0 &&
          move.slug.length > 0 &&
          move.type.length > 0 &&
          move.category.length > 0 &&
          (move.pp === null || Number.isInteger(move.pp)) &&
          Number.isInteger(move.priority) &&
          move.effect.length > 0,
      ),
    ).toBe(true);
    expect(abilities.count).toBe(expectedAbilityCount);
    expect(abilities.abilities).toHaveLength(expectedAbilityCount);
    expect(
      abilities.abilities.every(
        (ability) =>
          ability.id > 0 &&
          ability.slug.length > 0 &&
          ability.effect.length > 0,
      ),
    ).toBe(true);

    expect(report).toMatchObject({
      speciesCount: expectedSpeciesCount,
      moveCount: expectedMoveCount,
      abilityCount: expectedAbilityCount,
      privateSpriteCount: expectedSpeciesCount,
      mediaFilesTracked: 0,
    });
  });

  it("keeps the same durable folder contract for every species", async () => {
    const manifest = await readJson<PackManifest>(
      path.join(packDirectory, "manifest.json"),
    );
    const creatureFolders = await readdir(
      path.join(packDirectory, "creatures"),
    );

    expect(creatureFolders).toHaveLength(expectedSpeciesCount);
    expect(creatureFolders).toEqual(
      manifest.creatures.map((entry) => path.basename(entry.path)),
    );

    for (const creature of manifest.creatures) {
      const creatureDirectory = path.join(packDirectory, creature.path);
      expect((await readdir(creatureDirectory)).sort()).toEqual(
        expectedCreatureFiles,
      );
      expect(creature.id).toBe(
        `pokemon:${String(creature.nationalDexNumber).padStart(4, "0")}-${creature.slug}`,
      );
      expect(creature.assetStatus).toBe("pending");
      expect(creature.definitionStatus).toBe("pending");
      expect(creature.licenseStatus).toBe("pending");
      expect(creature.localQuarantineVerified).toBe(true);
      expect(creature.spriteCandidates).toBeGreaterThan(0);
    }
  });

  it("resolves species abilities and learnsets through audited catalogs", async () => {
    const manifest = await readJson<PackManifest>(
      path.join(packDirectory, "manifest.json"),
    );
    const moveCatalog = await readJson<MoveCatalog>(
      path.join(packDirectory, "catalogs", "moves.json"),
    );
    const moveIds = new Set(moveCatalog.moves.map((move) => move.id));

    for (const dexNumber of sampleDexNumbers) {
      const creature = manifest.creatures[dexNumber - 1];
      if (!creature) {
        throw new Error(`Missing manifest entry for dex ${String(dexNumber)}`);
      }
      const definitionDirectory = path.join(
        packDirectory,
        creature.path,
        "definitions",
      );
      const pokemon = await readJson<PokemonDefinition>(
        path.join(definitionDirectory, "pokemon.json"),
      );
      const abilities = await readJson<AbilitiesDefinition>(
        path.join(definitionDirectory, "abilities.json"),
      );
      const moves = await readJson<MovesDefinition>(
        path.join(definitionDirectory, "moves.json"),
      );

      expect(pokemon.id).toBe(creature.id);
      expect(pokemon.nationalDexNumber).toBe(dexNumber);
      expect(pokemon.types.length).toBeGreaterThan(0);
      expect(Object.keys(pokemon.baseStats)).toEqual(
        expect.arrayContaining([
          "hp",
          "attack",
          "defense",
          "special-attack",
          "special-defense",
          "speed",
        ]),
      );
      expect(pokemon.abilities.length).toBeGreaterThan(0);

      expect(abilities.abilities.length).toBeGreaterThan(0);
      expect(
        abilities.abilities.every(
          (ability) =>
            ability.abilityId > 0 &&
            ability.slug.length > 0 &&
            ability.effect.length > 0 &&
            ability.shortEffect.length > 0 &&
            ability.sourceUrl.startsWith("https://pokeapi.co/"),
        ),
      ).toBe(true);

      expect(moves.catalogs).toEqual({
        moves: "../../../catalogs/moves.json",
        moveMethods: "../../../catalogs/move-methods.json",
        versionGroups: "../../../catalogs/version-groups.json",
      });
      expect(moves.moves.length).toBeGreaterThan(0);
      expect(moves.moves.every(([moveId]) => moveIds.has(moveId))).toBe(true);
      expect(
        moves.moves.some(([, methods]) =>
          methods.some(
            ([, methodId, level]) => methodId === 1 && level !== null,
          ),
        ),
      ).toBe(true);
    }
  });

  it("publishes inventories and hashes but no third-party media", async () => {
    const manifest = await readJson<PackManifest>(
      path.join(packDirectory, "manifest.json"),
    );
    const gitignore = await readFile(".gitignore", "utf8");

    expect(gitignore).toContain(".private/");
    expect(await findMediaFiles(packDirectory)).toEqual([]);

    for (const dexNumber of sampleDexNumbers) {
      const creature = manifest.creatures[dexNumber - 1];
      if (!creature) {
        throw new Error(`Missing manifest entry for dex ${String(dexNumber)}`);
      }
      const sprites = await readJson<MediaInventory>(
        path.join(packDirectory, creature.path, "sprites", "inventory.json"),
      );
      const animations = await readJson<MediaInventory>(
        path.join(packDirectory, creature.path, "animations", "inventory.json"),
      );
      const quarantined = sprites.entries.find(
        (entry) => entry.localQuarantine,
      );

      expect(sprites.mediaImportedCount).toBe(0);
      expect(animations.mediaImportedCount).toBe(0);
      expect(sprites.statusSummary.approved).toBe(0);
      expect(animations.statusSummary.approved).toBe(0);
      expect(
        sprites.entries.every(
          (entry) =>
            entry.sourceRepositoryPath.startsWith("sprites/pokemon/") &&
            entry.rightsPolicyId.length > 0 &&
            entry.proposedName.length > 0 &&
            ["pending", "doubtful", "quarantined"].includes(entry.status),
        ),
      ).toBe(true);
      expect(quarantined?.localQuarantine?.localOnly).toBe(true);
      expect(typeof quarantined?.localQuarantine?.bytes).toBe("number");
      expect(typeof quarantined?.localQuarantine?.width).toBe("number");
      expect(typeof quarantined?.localQuarantine?.height).toBe("number");
      expect(quarantined?.localQuarantine?.relativePrivatePath).toMatch(
        /^\.private\/pokemon-canonical\//,
      );
      expect(quarantined?.localQuarantine?.sha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});
