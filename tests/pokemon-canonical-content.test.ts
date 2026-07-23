import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

type ApprovalStatus =
  "approved" | "pending" | "doubtful" | "rejected" | "quarantined";

interface SourceInfo {
  retrievedAt: string;
  sourceUrls: string[];
  licenseStatus: ApprovalStatus;
  requiredCredits: string[];
  notes: string[];
}

interface PackManifest {
  completionStatus: string;
  licenseStatus: ApprovalStatus;
  source: SourceInfo;
  creatures: Array<{
    id: string;
    nationalDexNumber: number;
    slug: string;
    path: string;
    assetStatus: ApprovalStatus;
    definitionStatus: ApprovalStatus;
    licenseStatus: ApprovalStatus;
  }>;
}

interface CreatureManifest {
  id: string;
  nationalDexNumber: number;
  slug: string;
  assetStatus: ApprovalStatus;
  definitionStatus: ApprovalStatus;
  licenseStatus: ApprovalStatus;
  sourceUrls: string[];
}

interface PokemonDefinition {
  id: string;
  nationalDexNumber: number;
  slug: string;
  types: string[];
  abilities: Array<{
    slug: string;
    slot: number;
    isHidden: boolean;
  }>;
  source: SourceInfo;
}

interface AbilitiesDefinition {
  abilities: Array<{
    slug: string;
    effect: string;
    shortEffect: string;
    sourceUrl: string;
  }>;
  source: SourceInfo;
}

interface MovesDefinition {
  moves: Array<{
    slug: string;
    type: string;
    category: string;
    pp: unknown;
    priority: unknown;
    learnedByLevel: unknown[];
    learnedByMachine: unknown[];
    sourceUrl: string;
  }>;
  source: SourceInfo;
}

interface MediaInventory {
  statusSummary: Record<ApprovalStatus, number>;
  entries: Array<{
    status: ApprovalStatus;
    mediaImported: boolean;
    sourceUrl?: string;
    proposedUse?: string;
    limitations?: string[];
  }>;
}

interface ContentSchema {
  $defs: Record<string, unknown>;
}

const packDirectory = path.join("content", "packs", "pokemon-canonical");
const pilotPokemon = [
  { folder: "0001-bulbasaur", id: "pokemon:0001-bulbasaur", dex: 1 },
  { folder: "0002-ivysaur", id: "pokemon:0002-ivysaur", dex: 2 },
  { folder: "0003-venusaur", id: "pokemon:0003-venusaur", dex: 3 },
] as const;
const mediaDirectories = ["sprites", "animations", "sounds"] as const;

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

describe("pokemon canonical content pilot", () => {
  it("records the pilot scope and content schemas", async () => {
    const manifest = await readJson<PackManifest>(
      path.join(packDirectory, "manifest.json"),
    );
    const schema = await readJson<ContentSchema>(
      path.join(packDirectory, "schemas", "pokemon-content.schema.json"),
    );

    expect(manifest.completionStatus).toBe("pilot");
    expect(manifest.licenseStatus).toBe("pending");
    expect(manifest.source.licenseStatus).toBe("pending");
    expect(manifest.creatures).toHaveLength(pilotPokemon.length);
    expect(manifest.creatures.map((creature) => creature.id)).toEqual(
      pilotPokemon.map((pokemon) => pokemon.id),
    );
    expect(Object.keys(schema.$defs)).toEqual(
      expect.arrayContaining([
        "packManifest",
        "pokemonManifest",
        "pokemonDefinition",
        "abilitiesDefinition",
        "movesDefinition",
        "mediaInventory",
      ]),
    );
  });

  it("keeps each pilot Pokemon auditable and pending", async () => {
    for (const pokemon of pilotPokemon) {
      const creatureDirectory = path.join(
        packDirectory,
        "creatures",
        pokemon.folder,
      );
      const manifest = await readJson<CreatureManifest>(
        path.join(creatureDirectory, "manifest.json"),
      );
      const pokemonDefinition = await readJson<PokemonDefinition>(
        path.join(creatureDirectory, "definitions", "pokemon.json"),
      );
      const abilitiesDefinition = await readJson<AbilitiesDefinition>(
        path.join(creatureDirectory, "definitions", "abilities.json"),
      );
      const movesDefinition = await readJson<MovesDefinition>(
        path.join(creatureDirectory, "definitions", "moves.json"),
      );

      expect(manifest.id).toBe(pokemon.id);
      expect(manifest.nationalDexNumber).toBe(pokemon.dex);
      expect(manifest.assetStatus).toBe("pending");
      expect(manifest.definitionStatus).toBe("pending");
      expect(manifest.licenseStatus).toBe("pending");
      expect(manifest.sourceUrls.length).toBeGreaterThan(0);

      expect(pokemonDefinition.id).toBe(pokemon.id);
      expect(pokemonDefinition.nationalDexNumber).toBe(pokemon.dex);
      expect(pokemonDefinition.slug).toMatch(/^[a-z0-9-]+$/);
      expect(pokemonDefinition.types.length).toBeGreaterThan(0);
      expect(pokemonDefinition.abilities.length).toBeGreaterThan(0);
      expect(pokemonDefinition.source.licenseStatus).toBe("pending");

      expect(abilitiesDefinition.abilities.length).toBeGreaterThan(0);
      expect(
        abilitiesDefinition.abilities.every(
          (ability) =>
            ability.slug.length > 0 &&
            ability.effect.length > 0 &&
            ability.shortEffect.length > 0 &&
            ability.sourceUrl.startsWith("https://pokeapi.co/"),
        ),
      ).toBe(true);
      expect(abilitiesDefinition.source.licenseStatus).toBe("pending");

      expect(movesDefinition.moves.length).toBeGreaterThan(0);
      expect(
        movesDefinition.moves.some((move) => move.learnedByLevel.length > 0),
      ).toBe(true);
      expect(
        movesDefinition.moves.some((move) => move.learnedByMachine.length > 0),
      ).toBe(true);
      expect(
        movesDefinition.moves.every(
          (move) =>
            move.slug.length > 0 &&
            move.type.length > 0 &&
            move.category.length > 0 &&
            (typeof move.pp === "number" || move.pp === null) &&
            Number.isInteger(move.priority) &&
            move.sourceUrl.startsWith("https://pokeapi.co/"),
        ),
      ).toBe(true);
      expect(movesDefinition.source.licenseStatus).toBe("pending");
    }
  });

  it("keeps media folders inventory-only during the pilot", async () => {
    for (const pokemon of pilotPokemon) {
      for (const mediaDirectory of mediaDirectories) {
        const directory = path.join(
          packDirectory,
          "creatures",
          pokemon.folder,
          mediaDirectory,
        );
        const files = await readdir(directory);
        const inventory = await readJson<MediaInventory>(
          path.join(directory, "inventory.json"),
        );

        expect(files).toEqual(["inventory.json"]);
        expect(inventory.statusSummary.approved).toBe(0);
        expect(
          inventory.entries.filter((entry) => entry.mediaImported),
        ).toEqual([]);
        expect(
          inventory.entries.every((entry) =>
            ["pending", "quarantined"].includes(entry.status),
          ),
        ).toBe(true);
      }
    }
  });
});
