export const SOCIAL_EMOTES = ["wave", "cheer", "surprised"] as const;
export type SocialEmote = (typeof SOCIAL_EMOTES)[number];

export type ChatValidation =
  | { accepted: true; text: string }
  | {
      accepted: false;
      reason: "empty" | "too_long" | "unsafe_content";
    };

const URL = /(?:https?:\/\/|www\.)\S+/iu;

function hasControlCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (
      code <= 8 ||
      code === 11 ||
      code === 12 ||
      (code >= 14 && code <= 31) ||
      code === 127
    )
      return true;
  }
  return false;
}

export function validateChatText(input: string): ChatValidation {
  const normalized = input.normalize("NFKC").trim().replace(/\s+/gu, " ");
  if (!normalized) return { accepted: false, reason: "empty" };
  if (Array.from(normalized).length > 160)
    return { accepted: false, reason: "too_long" };
  if (hasControlCharacter(normalized) || URL.test(normalized))
    return { accepted: false, reason: "unsafe_content" };
  return { accepted: true, text: normalized };
}

export function isSocialEmote(value: string): value is SocialEmote {
  return (SOCIAL_EMOTES as readonly string[]).includes(value);
}

export interface RateLimitResult {
  allowed: boolean;
  timestamps: number[];
  retryAfterMs: number;
}

export function applySlidingWindow(
  timestamps: readonly number[],
  now: number,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const active = timestamps.filter((timestamp) => timestamp > now - windowMs);
  if (active.length >= limit)
    return {
      allowed: false,
      timestamps: active,
      retryAfterMs: Math.max(1, (active[0] ?? now) + windowMs - now),
    };
  return {
    allowed: true,
    timestamps: [...active, now],
    retryAfterMs: 0,
  };
}
