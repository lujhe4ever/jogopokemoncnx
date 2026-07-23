export type GameplayEventType =
  | "world.zone_entered"
  | "interaction.completed"
  | "battle.finished"
  | "creature.captured";

export interface GameplayEvent {
  id: string;
  type: GameplayEventType;
  occurredAt: string;
  attributes: Readonly<Record<string, string>>;
}

export interface QuestObjective {
  id: string;
  eventType: GameplayEventType;
  requiredCount: number;
  filters?: Readonly<Record<string, string>>;
}

export interface QuestDefinition {
  id: string;
  version: number;
  title: string;
  objectives: readonly QuestObjective[];
  reward: { itemId: string; quantity: number };
}

export interface QuestState {
  questId: string;
  definitionVersion: number;
  status: "active" | "completed" | "claimed";
  progress: Readonly<Record<string, number>>;
}

export interface QuestTransition {
  state: QuestState;
  changed: boolean;
  completedNow: boolean;
}

export function createQuestState(definition: QuestDefinition): QuestState {
  validateQuestDefinition(definition);
  return {
    questId: definition.id,
    definitionVersion: definition.version,
    status: "active",
    progress: Object.fromEntries(
      definition.objectives.map((objective) => [objective.id, 0]),
    ),
  };
}

export function validateQuestDefinition(definition: QuestDefinition): void {
  if (
    !definition.id ||
    definition.version < 1 ||
    definition.objectives.length === 0 ||
    new Set(definition.objectives.map(({ id }) => id)).size !==
      definition.objectives.length ||
    definition.objectives.some(
      ({ id, requiredCount }) =>
        !id || !Number.isInteger(requiredCount) || requiredCount < 1,
    )
  )
    throw new Error("invalid_quest_definition");
}

function matches(objective: QuestObjective, event: GameplayEvent): boolean {
  return (
    objective.eventType === event.type &&
    Object.entries(objective.filters ?? {}).every(
      ([key, value]) => event.attributes[key] === value,
    )
  );
}

export function applyGameplayEvent(
  state: QuestState,
  definition: QuestDefinition,
  event: GameplayEvent,
): QuestTransition {
  if (
    state.questId !== definition.id ||
    state.definitionVersion !== definition.version
  )
    throw new Error("quest_version_mismatch");
  if (state.status !== "active")
    return { state, changed: false, completedNow: false };
  let changed = false;
  const progress = { ...state.progress };
  for (const objective of definition.objectives) {
    if (!matches(objective, event)) continue;
    const current = progress[objective.id] ?? 0;
    const next = Math.min(objective.requiredCount, current + 1);
    progress[objective.id] = next;
    changed ||= next !== current;
  }
  if (!changed) return { state, changed: false, completedNow: false };
  const completed = definition.objectives.every(
    (objective) => (progress[objective.id] ?? 0) >= objective.requiredCount,
  );
  return {
    state: {
      ...state,
      progress,
      status: completed ? "completed" : "active",
    },
    changed: true,
    completedNow: completed,
  };
}

export function migrateQuestState(
  state: QuestState,
  previous: QuestDefinition,
  next: QuestDefinition,
): QuestState {
  if (
    state.questId !== previous.id ||
    previous.id !== next.id ||
    next.version <= previous.version
  )
    throw new Error("invalid_quest_migration");
  validateQuestDefinition(next);
  const previousIds = new Set(previous.objectives.map(({ id }) => id));
  const progress = Object.fromEntries(
    next.objectives.map((objective) => [
      objective.id,
      previousIds.has(objective.id)
        ? Math.min(objective.requiredCount, state.progress[objective.id] ?? 0)
        : 0,
    ]),
  );
  return {
    questId: next.id,
    definitionVersion: next.version,
    status: state.status === "claimed" ? "claimed" : "active",
    progress,
  };
}
