import type { GameplayEvent } from "@lt/quest-domain";

export interface GameplayEventSink {
  publish(ownerId: string, event: GameplayEvent): Promise<void>;
}

export const noopGameplayEvents: GameplayEventSink = {
  publish: () => Promise.resolve(),
};
