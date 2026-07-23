import { z } from "zod";

export const ALPHA_EVENTS = [
  "session_started",
  "home_loaded",
  "meadow_entered",
  "interaction_completed",
  "battle_completed",
  "capture_completed",
  "quest_completed",
  "arena_joined",
  "pvp_completed",
  "client_error",
] as const;

export type AlphaEvent = (typeof ALPHA_EVENTS)[number];

const alphaEventSchema = z
  .object({
    consent: z.literal(true),
    event: z.enum(ALPHA_EVENTS),
  })
  .strict();

export class AlphaTelemetry {
  private readonly counters = new Map<AlphaEvent, number>(
    ALPHA_EVENTS.map((event) => [event, 0]),
  );

  record(input: unknown): boolean {
    const parsed = alphaEventSchema.safeParse(input);
    if (!parsed.success) return false;
    this.counters.set(
      parsed.data.event,
      (this.counters.get(parsed.data.event) ?? 0) + 1,
    );
    return true;
  }

  snapshot(): Readonly<Record<AlphaEvent, number>> {
    return Object.fromEntries(this.counters) as Record<AlphaEvent, number>;
  }
}
