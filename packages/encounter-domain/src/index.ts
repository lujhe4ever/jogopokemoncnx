export interface CaptureContext {
  battleOutcome: "player_win" | "npc_win" | "draw" | "abandoned" | null;
  targetHealth: number;
  targetMaxHealth: number;
  captureItemId: string;
}

export interface CaptureRule {
  itemId: string;
  baseChance: number;
  weakenedBonus: number;
  maximumChance: number;
}

export type CaptureEvaluation =
  | {
      eligible: false;
      reason: "battle_required" | "invalid_target" | "item_required";
    }
  | { eligible: true; chance: number };

export const BASE_CAPTURE_RULE: CaptureRule = {
  itemId: "item:capture-orb",
  baseChance: 0.35,
  weakenedBonus: 0.5,
  maximumChance: 0.85,
};

export function evaluateCapture(
  context: CaptureContext,
  rule: CaptureRule = BASE_CAPTURE_RULE,
): CaptureEvaluation {
  if (context.battleOutcome !== "player_win")
    return { eligible: false, reason: "battle_required" };
  if (
    !Number.isFinite(context.targetHealth) ||
    !Number.isFinite(context.targetMaxHealth) ||
    context.targetMaxHealth <= 0 ||
    context.targetHealth < 0 ||
    context.targetHealth > context.targetMaxHealth
  )
    return { eligible: false, reason: "invalid_target" };
  if (context.captureItemId !== rule.itemId)
    return { eligible: false, reason: "item_required" };
  const weakened = 1 - context.targetHealth / context.targetMaxHealth;
  return {
    eligible: true,
    chance: Math.min(
      rule.maximumChance,
      rule.baseChance + weakened * rule.weakenedBonus,
    ),
  };
}

export function resolveCapture(
  evaluation: CaptureEvaluation,
  randomValue: number,
): boolean {
  if (!evaluation.eligible) return false;
  if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1)
    throw new Error("invalid_random_value");
  return randomValue < evaluation.chance;
}

export function seededCaptureRandom(seed: number): number {
  if (!Number.isInteger(seed)) throw new Error("invalid_seed");
  const next = (Math.imul(seed >>> 0, 1_103_515_245) + 12_345) >>> 0;
  return next / 4_294_967_296;
}

export interface CaptureAttemptState {
  status: "pending" | "captured" | "escaped";
  itemQuantity: number;
}

export type CaptureAttemptResult =
  | {
      status: "captured" | "escaped";
      itemQuantity: number;
      consumed: boolean;
      createCreature: boolean;
      replayed: boolean;
    }
  | {
      status: "pending";
      itemQuantity: number;
      consumed: false;
      createCreature: false;
      replayed: false;
      reason: "battle_required" | "invalid_target" | "item_required";
    };

export function planCaptureAttempt(
  state: CaptureAttemptState,
  evaluation: CaptureEvaluation,
  randomValue: number,
): CaptureAttemptResult {
  if (state.status !== "pending")
    return {
      status: state.status,
      itemQuantity: state.itemQuantity,
      consumed: false,
      createCreature: false,
      replayed: true,
    };
  if (!evaluation.eligible)
    return {
      status: "pending",
      itemQuantity: state.itemQuantity,
      consumed: false,
      createCreature: false,
      replayed: false,
      reason: evaluation.reason,
    };
  if (state.itemQuantity < 1)
    return {
      status: "pending",
      itemQuantity: state.itemQuantity,
      consumed: false,
      createCreature: false,
      replayed: false,
      reason: "item_required",
    };
  const captured = resolveCapture(evaluation, randomValue);
  return {
    status: captured ? "captured" : "escaped",
    itemQuantity: state.itemQuantity - 1,
    consumed: true,
    createCreature: captured,
    replayed: false,
  };
}
