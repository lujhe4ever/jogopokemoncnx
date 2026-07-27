import type { CreatureCatalog } from "@lt/creature-domain";

export const STARTER_OPTIONS = [
  {
    definitionId: "creature:emberbud",
    name: "Broto Âmbar",
    affinity: "Brasa",
    description: "Corajoso e direto, transforma calor em golpes precisos.",
    summary: "Ataque 12 · Defesa 14 · Agilidade 10",
  },
  {
    definitionId: "creature:mosscalf",
    name: "Musgote",
    affinity: "Bosque",
    description: "Paciente e resistente, protege aliados com folhas macias.",
    summary: "Ataque 10 · Defesa 16 · Vitalidade 22",
  },
  {
    definitionId: "creature:tidefin",
    name: "Maréu",
    affinity: "Maré",
    description: "Ágil e curioso, desliza pelo campo como água corrente.",
    summary: "Ataque 11 · Defesa 9 · Agilidade 16",
  },
] as const;

export type StarterDefinitionId =
  (typeof STARTER_OPTIONS)[number]["definitionId"];

export const ORIGINAL_CREATURE_CATALOG: CreatureCatalog = {
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
    "creature:mosscalf": {
      id: "creature:mosscalf",
      version: 1,
      name: "Musgote",
      baseAttributes: {
        vitality: 22,
        strength: 10,
        guard: 16,
        agility: 8,
      },
    },
    "creature:tidefin": {
      id: "creature:tidefin",
      version: 1,
      name: "Maréu",
      baseAttributes: {
        vitality: 17,
        strength: 11,
        guard: 9,
        agility: 16,
      },
    },
    "creature:nightleaf": {
      id: "creature:nightleaf",
      version: 1,
      name: "Folha Noturna",
      baseAttributes: {
        vitality: 24,
        strength: 13,
        guard: 9,
        agility: 9,
      },
    },
  },
};

const ITEM_NAMES: Readonly<Record<string, string>> = {
  "item:bright-herb": "Erva luminosa",
  "item:field-tonic": "Tônico de campo",
  "item:capture-orb": "Orbe de captura",
};

export function isStarterDefinition(
  definitionId: string,
): definitionId is StarterDefinitionId {
  return STARTER_OPTIONS.some(
    (starter) => starter.definitionId === definitionId,
  );
}

export function creatureName(definitionId: string): string {
  return (
    ORIGINAL_CREATURE_CATALOG.definitions[definitionId]?.name ?? definitionId
  );
}

export function itemName(itemId: string): string {
  return ITEM_NAMES[itemId] ?? itemId;
}
