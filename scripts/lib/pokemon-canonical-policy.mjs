export const D023_DECISION_ID = "D-023";
export const D023_OWNER_AUTHORIZED_AT = "2026-07-23";
export const D023_SCOPE =
  "temporary publication of four battle sprites per species";

export const EXPECTED_BATTLE_VARIANTS = Object.freeze([
  "front-normal",
  "front-shiny",
  "back-normal",
  "back-shiny",
]);

const FULL_GIT_SHA = /^[0-9a-f]{40}$/;

export function validateGitSha(value, label = "revision") {
  if (typeof value !== "string" || !FULL_GIT_SHA.test(value)) {
    throw new Error(
      `${label} must be a lowercase 40-character hexadecimal Git SHA; received ${JSON.stringify(value)}`,
    );
  }
  return value;
}

export function ownerAuthorization() {
  return {
    decisionId: D023_DECISION_ID,
    authorizedAt: D023_OWNER_AUTHORIZED_AT,
    scope: D023_SCOPE,
  };
}
