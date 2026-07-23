import {
  applyExperience,
  levelForExperience,
  validateDefinition,
  validateTeam,
  type CreatureCatalog,
  type CreatureDefinition,
  type CreatureInstance,
} from "../packages/creature-domain/src/index.js";
import { describe, expect, it } from "vitest";

const catalog: CreatureCatalog = {
  version: 1,
  definitions: {
    "creature:emberbud": {
      id: "creature:emberbud",
      version: 1,
      name: "Broto Âmbar",
      baseAttributes: {
        vitality: 18,
        strength: 12,
        guard: 14,
        agility: 10,
      },
      evolution: {
        minimumLevel: 5,
        targetDefinitionId: "creature:amberbloom",
      },
    },
    "creature:amberbloom": {
      id: "creature:amberbloom",
      version: 1,
      name: "Flor Âmbar",
      baseAttributes: {
        vitality: 30,
        strength: 22,
        guard: 24,
        agility: 17,
      },
    },
  },
};
const emberbud = catalog.definitions["creature:emberbud"] as CreatureDefinition;
const amberbloom = catalog.definitions[
  "creature:amberbloom"
] as CreatureDefinition;

const creature = (id: string, ownerId = "owner"): CreatureInstance => ({
  id,
  ownerId,
  definitionId: "creature:emberbud",
  definitionVersion: 1,
  catalogVersion: 1,
  experience: 0,
  level: 1,
});

describe("creature foundation", () => {
  it("keeps definitions separate from owned instances and stable versions", () => {
    const result = applyExperience(creature("one"), 100, catalog);
    expect(result.instance).toMatchObject({
      id: "one",
      ownerId: "owner",
      definitionId: "creature:emberbud",
      definitionVersion: 1,
      catalogVersion: 1,
      level: 2,
    });
    expect(catalog.definitions["creature:emberbud"]?.name).toBe("Broto Âmbar");
  });

  it("evolves once through catalog data without engine-specific rules", () => {
    const result = applyExperience(creature("one"), 1_600, catalog);
    expect(result.evolved).toBe(true);
    expect(result.previousDefinitionId).toBe("creature:emberbud");
    expect(result.instance).toMatchObject({
      definitionId: "creature:amberbloom",
      definitionVersion: 1,
      level: 5,
    });
    const next = applyExperience(result.instance, 100, catalog);
    expect(next.evolved).toBe(false);
    expect(next.instance.definitionId).toBe("creature:amberbloom");
  });

  it("preserves attribute, experience and ownership invariants", () => {
    expect(validateDefinition(emberbud)).toBe(true);
    expect(
      validateDefinition({
        ...emberbud,
        baseAttributes: {
          vitality: 0,
          strength: 12,
          guard: 14,
          agility: 10,
        },
      }),
    ).toBe(false);
    expect(() => applyExperience(creature("one"), 0, catalog)).toThrow(
      "invalid_experience_amount",
    );
    expect(levelForExperience(Number.MAX_SAFE_INTEGER)).toBe(50);

    const collection = [
      creature("one"),
      creature("two"),
      creature("foreign", "other"),
    ];
    expect(validateTeam("owner", collection, ["one", "two"])).toBe(true);
    expect(validateTeam("owner", collection, ["one", "one"])).toBe(false);
    expect(validateTeam("owner", collection, ["foreign"])).toBe(false);
    expect(
      validateTeam(
        "owner",
        Array.from({ length: 7 }, (_, index) => creature(String(index))),
        Array.from({ length: 7 }, (_, index) => String(index)),
      ),
    ).toBe(false);
  });

  it("accepts a replacement catalog with the same stable contract", () => {
    const replacement: CreatureCatalog = {
      version: 2,
      definitions: {
        "creature:emberbud": {
          ...emberbud,
          name: "Semente Solar",
        },
        "creature:amberbloom": {
          ...amberbloom,
          name: "Coroa Solar",
        },
      },
    };
    expect(
      applyExperience(creature("one"), 100, replacement).instance,
    ).toMatchObject({ catalogVersion: 2, definitionId: "creature:emberbud" });
  });
});
