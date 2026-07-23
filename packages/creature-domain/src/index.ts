export interface CreatureDefinition {
  id: string;
  version: number;
  name: string;
  baseAttributes: {
    vitality: number;
    strength: number;
    guard: number;
    agility: number;
  };
  evolution?: {
    minimumLevel: number;
    targetDefinitionId: string;
  };
}

export interface CreatureCatalog {
  version: number;
  definitions: Readonly<Record<string, CreatureDefinition>>;
}

export interface CreatureInstance {
  id: string;
  ownerId: string;
  definitionId: string;
  definitionVersion: number;
  catalogVersion: number;
  experience: number;
  level: number;
}

export interface ProgressionResult {
  instance: CreatureInstance;
  evolved: boolean;
  previousDefinitionId?: string;
}

const MAX_LEVEL = 50;
const MAX_TEAM_SIZE = 6;
const MAX_EXPERIENCE_GRANT = 100_000;

export function levelForExperience(experience: number): number {
  const safeExperience = Math.max(0, Math.floor(experience));
  return Math.min(MAX_LEVEL, Math.floor(Math.sqrt(safeExperience / 100)) + 1);
}

export function validateDefinition(definition: CreatureDefinition): boolean {
  const attributes = Object.values(definition.baseAttributes);
  return (
    definition.id.length > 0 &&
    definition.version > 0 &&
    attributes.every(
      (attribute) =>
        Number.isInteger(attribute) && attribute >= 1 && attribute <= 255,
    )
  );
}

export function applyExperience(
  instance: CreatureInstance,
  amount: number,
  catalog: CreatureCatalog,
): ProgressionResult {
  if (
    !Number.isInteger(amount) ||
    amount <= 0 ||
    amount > MAX_EXPERIENCE_GRANT
  ) {
    throw new Error("invalid_experience_amount");
  }
  const current = catalog.definitions[instance.definitionId];
  if (!current || current.version !== instance.definitionVersion)
    throw new Error("definition_version_mismatch");

  const experience = instance.experience + amount;
  const level = levelForExperience(experience);
  const targetId =
    current.evolution && level >= current.evolution.minimumLevel
      ? current.evolution.targetDefinitionId
      : undefined;
  const target = targetId ? catalog.definitions[targetId] : undefined;
  if (targetId && (!target || !validateDefinition(target)))
    throw new Error("invalid_evolution_target");

  return {
    instance: {
      ...instance,
      experience,
      level,
      definitionId: target?.id ?? instance.definitionId,
      definitionVersion: target?.version ?? instance.definitionVersion,
      catalogVersion: catalog.version,
    },
    evolved: Boolean(target),
    ...(target ? { previousDefinitionId: current.id } : {}),
  };
}

export function validateTeam(
  ownerId: string,
  collection: readonly CreatureInstance[],
  teamIds: readonly string[],
): boolean {
  return (
    teamIds.length <= MAX_TEAM_SIZE &&
    new Set(teamIds).size === teamIds.length &&
    teamIds.every((id) =>
      collection.some(
        (creature) => creature.id === id && creature.ownerId === ownerId,
      ),
    )
  );
}
