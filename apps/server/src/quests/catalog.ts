import type { QuestDefinition } from "@lt/quest-domain";

export const FIRST_EXPEDITION: QuestDefinition = {
  id: "quest:first-expedition",
  version: 1,
  title: "Primeira expedição",
  objectives: [
    {
      id: "visit-meadow",
      eventType: "world.zone_entered",
      requiredCount: 1,
      filters: { zoneId: "meadow" },
    },
    {
      id: "talk-caretaker",
      eventType: "interaction.completed",
      requiredCount: 1,
      filters: { interactionId: "npc:caretaker" },
    },
    {
      id: "win-battle",
      eventType: "battle.finished",
      requiredCount: 1,
      filters: { outcome: "player_win" },
    },
    {
      id: "capture-creature",
      eventType: "creature.captured",
      requiredCount: 1,
    },
  ],
  reward: { itemId: "item:field-tonic", quantity: 3 },
};
