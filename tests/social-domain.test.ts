import { describe, expect, it } from "vitest";
import {
  applySlidingWindow,
  isSocialEmote,
  validateChatText,
} from "../packages/social-domain/src/index.js";

describe("social domain policies", () => {
  it("normalizes safe chat and rejects unsafe or excessive content", () => {
    expect(validateChatText("  Olá \n comunidade  ")).toEqual({
      accepted: true,
      text: "Olá comunidade",
    });
    expect(validateChatText("visite https://example.com")).toEqual({
      accepted: false,
      reason: "unsafe_content",
    });
    expect(validateChatText("x".repeat(161))).toEqual({
      accepted: false,
      reason: "too_long",
    });
  });

  it("uses an explicit emote allowlist and deterministic sliding window", () => {
    expect(isSocialEmote("wave")).toBe(true);
    expect(isSocialEmote("custom-script")).toBe(false);
    expect(applySlidingWindow([1_000, 2_000, 3_000], 4_000, 3, 5_000)).toEqual({
      allowed: false,
      timestamps: [1_000, 2_000, 3_000],
      retryAfterMs: 2_000,
    });
    expect(applySlidingWindow([1_000], 7_000, 3, 5_000)).toEqual({
      allowed: true,
      timestamps: [7_000],
      retryAfterMs: 0,
    });
  });
});
