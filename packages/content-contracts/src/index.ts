export type AssetLicenseStatus =
  "approved" | "pending" | "doubtful" | "rejected" | "quarantined";

export type AssetType =
  | "battle-sprite"
  | "overworld-sprite"
  | "character-sprite"
  | "portrait"
  | "icon"
  | "tileset"
  | "world-object"
  | "visual-effect"
  | "ui-element"
  | "animation"
  | "cry"
  | "sound-effect"
  | "music";

export type AssetFormat = "png" | "webp" | "atlas-json" | "ogg" | "mp3" | "wav";

export interface AssetSourceRecord {
  sourceId: string;
  url: string;
  repository: string | null;
  commitSha: string | null;
  version: string | null;
  downloadUrl?: string;
  archiveSha256?: string;
  archiveSizeBytes?: number;
  retrievedAt?: string;
  license: string;
  ownership: string;
  attribution: readonly string[];
  modificationAllowed: boolean | null;
  redistributionAllowed: boolean | null;
  status: AssetLicenseStatus;
  evidence: readonly string[];
  licenseFile?: string;
  decisionId: string | null;
}

export interface UnifiedAssetRecord {
  schemaVersion: 1;
  assetId: string;
  assetType: AssetType;
  speciesId: number | null;
  pokemonId: number | null;
  formId: number | null;
  variantId: string;
  gender: "male" | "female" | "neutral" | "unspecified";
  orientation: "front" | "back" | "side" | "overworld" | "not-applicable";
  shiny: boolean;
  animated: boolean;
  animationType: "procedural" | "frame" | "none";
  sourceId: string;
  sourceRevision: string | null;
  sourcePath: string | null;
  localPath: string | null;
  originalName?: string;
  format: AssetFormat;
  mimeType: string;
  width: number | null;
  height: number | null;
  frameCount: number | null;
  durationMs: number | null;
  frameDurations: readonly number[];
  loop: boolean;
  sampleRate: number | null;
  channels: number | null;
  loudness: number | null;
  sizeBytes: number;
  sha256: string | null;
  licenseStatus: AssetLicenseStatus;
  runtimeEnabled: boolean;
  replacementRequired: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  decisionId: string | null;
  retrievedAt: string;
  category?: string;
  atlasFrameCount?: number | null;
  atlasGroups?: Readonly<Record<string, readonly number[]>>;
  hasTransparency?: boolean;
  peakAmplitude?: number;
  clippingDetected?: boolean;
  analysisTool?: string;
  compatibilityScore?: number;
  compatibilityClass?:
    | "compatible"
    | "compatible-after-normalization"
    | "compatible-only-isolated"
    | "incompatible"
    | "reference-only";
  requiredCredits?: readonly string[];
  recommendedCredits?: readonly string[];
  notes?: string;
  transformation?: {
    operation: string;
    pixelOrSampleDataChanged: boolean;
  };
}

export interface AssetFeatureFlags {
  pokemonStaticSprites: boolean;
  pokemonProceduralAnimations: boolean;
  pokemonFrameAnimations: boolean;
  pokemonCries: boolean;
  battleSfx: boolean;
  worldSfx: boolean;
  uiSfx: boolean;
  originalCreatureAssets: boolean;
}

export const DEFAULT_ASSET_FEATURE_FLAGS: Readonly<AssetFeatureFlags> =
  Object.freeze({
    pokemonStaticSprites: false,
    pokemonProceduralAnimations: false,
    pokemonFrameAnimations: false,
    pokemonCries: false,
    battleSfx: false,
    worldSfx: false,
    uiSfx: false,
    originalCreatureAssets: true,
  });

export function resolveAssetFeatureFlags(
  overrides: Partial<AssetFeatureFlags> = {},
): AssetFeatureFlags {
  return { ...DEFAULT_ASSET_FEATURE_FLAGS, ...overrides };
}

export type RuntimeAssetPolicyCode =
  | "asset-disabled"
  | "asset-replacement-required"
  | "asset-license-not-approved"
  | "source-license-not-approved"
  | "source-redistribution-not-approved"
  | "source-revision-missing"
  | "asset-hash-missing"
  | "asset-decision-missing"
  | "asset-approval-missing"
  | "asset-local-path-missing"
  | "asset-source-mismatch"
  | "asset-feature-disabled";

export interface RuntimeAssetViolation {
  assetId: string;
  status: AssetLicenseStatus;
  policy: RuntimeAssetPolicyCode;
}

export function runtimeAssetViolations(
  asset: UnifiedAssetRecord,
  source: AssetSourceRecord | undefined,
): RuntimeAssetViolation[] {
  const violations: RuntimeAssetViolation[] = [];
  const add = (policy: RuntimeAssetPolicyCode) => {
    violations.push({
      assetId: asset.assetId,
      status: asset.licenseStatus,
      policy,
    });
  };

  if (!asset.runtimeEnabled) add("asset-disabled");
  if (asset.replacementRequired) add("asset-replacement-required");
  if (asset.licenseStatus !== "approved") add("asset-license-not-approved");
  if (source?.status !== "approved") add("source-license-not-approved");
  if (source?.redistributionAllowed !== true)
    add("source-redistribution-not-approved");
  if (!asset.sourceRevision) add("source-revision-missing");
  if (!/^[0-9a-f]{64}$/.test(asset.sha256 ?? "")) add("asset-hash-missing");
  if (!asset.decisionId) add("asset-decision-missing");
  if (!asset.approvedBy || !asset.approvedAt) add("asset-approval-missing");
  if (!asset.localPath) add("asset-local-path-missing");
  if (!source || source.sourceId !== asset.sourceId)
    add("asset-source-mismatch");
  if (
    source?.commitSha &&
    asset.sourceRevision &&
    source.commitSha !== asset.sourceRevision
  )
    add("asset-source-mismatch");
  if (
    source?.archiveSha256 &&
    asset.sourceRevision &&
    source.archiveSha256 !== asset.sourceRevision
  )
    add("asset-source-mismatch");
  return violations;
}

export function isAssetRuntimeAllowed(
  asset: UnifiedAssetRecord,
  source: AssetSourceRecord | undefined,
): boolean {
  return runtimeAssetViolations(asset, source).length === 0;
}

export class RuntimeAssetPolicyError extends Error {
  readonly violations: readonly RuntimeAssetViolation[];

  constructor(violations: readonly RuntimeAssetViolation[]) {
    super(
      violations
        .map(
          (violation) =>
            `${violation.assetId}: ${violation.status}: ${violation.policy}`,
        )
        .join("\n"),
    );
    this.name = "RuntimeAssetPolicyError";
    this.violations = violations;
  }
}

export function assertAssetRuntimeAllowed(
  asset: UnifiedAssetRecord,
  source: AssetSourceRecord | undefined,
): void {
  const violations = runtimeAssetViolations(asset, source);
  if (violations.length > 0) throw new RuntimeAssetPolicyError(violations);
}

export type AssetFeatureFlag = keyof AssetFeatureFlags;

export function requiredFeatureForAsset(
  asset: UnifiedAssetRecord,
): AssetFeatureFlag {
  if (asset.assetType === "cry") return "pokemonCries";
  if (asset.assetType === "animation")
    return asset.animationType === "frame"
      ? "pokemonFrameAnimations"
      : "pokemonProceduralAnimations";
  if (asset.assetType === "sound-effect") {
    if (asset.variantId.startsWith("battle-")) return "battleSfx";
    if (asset.variantId.startsWith("ui-")) return "uiSfx";
    return "worldSfx";
  }
  if (asset.speciesId !== null || asset.pokemonId !== null)
    return "pokemonStaticSprites";
  return "originalCreatureAssets";
}

export function assertAssetUsable(
  asset: UnifiedAssetRecord,
  source: AssetSourceRecord | undefined,
  flags: Readonly<AssetFeatureFlags>,
): void {
  assertAssetRuntimeAllowed(asset, source);
  if (!flags[requiredFeatureForAsset(asset)]) {
    throw new RuntimeAssetPolicyError([
      {
        assetId: asset.assetId,
        status: asset.licenseStatus,
        policy: "asset-feature-disabled",
      },
    ]);
  }
}

export const PROCEDURAL_ANIMATION_IDS = [
  "battle-entry",
  "idle",
  "physical-attack",
  "special-attack",
  "status-action",
  "hit-light",
  "hit-heavy",
  "critical-hit",
  "heal",
  "buff",
  "debuff",
  "status-poison",
  "status-burn",
  "status-sleep",
  "capture-enter",
  "capture-shake",
  "capture-success",
  "faint",
  "evolution",
  "shiny-intro",
] as const;

export type ProceduralAnimationId = (typeof PROCEDURAL_ANIMATION_IDS)[number];

export interface ProceduralAnimationFrame {
  atMs: number;
  x: number;
  y: number;
  scale: 1 | 2;
  quarterTurns: -1 | 0 | 1;
  alpha: number;
  tint: number | null;
  cameraShake: number;
  particles: "none" | "spark" | "status" | "impact";
}

export interface ProceduralAnimationProfile {
  id: ProceduralAnimationId;
  durationMs: number;
  loop: boolean;
  damageAtMs: number | null;
  frames: readonly ProceduralAnimationFrame[];
}

const frame = (
  atMs: number,
  changes: Partial<Omit<ProceduralAnimationFrame, "atMs">> = {},
): ProceduralAnimationFrame => ({
  atMs,
  x: 0,
  y: 0,
  scale: 1,
  quarterTurns: 0,
  alpha: 1,
  tint: null,
  cameraShake: 0,
  particles: "none",
  ...changes,
});

const profile = (
  id: ProceduralAnimationId,
  durationMs: number,
  frames: readonly ProceduralAnimationFrame[],
  options: { loop?: boolean; damageAtMs?: number | null } = {},
): ProceduralAnimationProfile => ({
  id,
  durationMs,
  loop: options.loop ?? false,
  damageAtMs: options.damageAtMs ?? null,
  frames,
});

export const PROCEDURAL_ANIMATION_PROFILES: Readonly<
  Record<ProceduralAnimationId, ProceduralAnimationProfile>
> = Object.freeze({
  "battle-entry": profile("battle-entry", 360, [
    frame(0, { x: -24, alpha: 0 }),
    frame(360),
  ]),
  idle: profile("idle", 800, [frame(0), frame(400, { y: -2 }), frame(800)], {
    loop: true,
  }),
  "physical-attack": profile(
    "physical-attack",
    360,
    [frame(0), frame(100, { x: -6 }), frame(220, { x: 18 }), frame(360)],
    { damageAtMs: 220 },
  ),
  "special-attack": profile(
    "special-attack",
    520,
    [
      frame(0),
      frame(180, { tint: 0xffffff, particles: "spark" }),
      frame(320, { cameraShake: 2, particles: "impact" }),
      frame(520),
    ],
    { damageAtMs: 320 },
  ),
  "status-action": profile("status-action", 440, [
    frame(0),
    frame(220, { tint: 0x8ad1ff, particles: "status" }),
    frame(440),
  ]),
  "hit-light": profile("hit-light", 180, [
    frame(0),
    frame(60, { x: -3, tint: 0xffffff }),
    frame(180),
  ]),
  "hit-heavy": profile("hit-heavy", 280, [
    frame(0),
    frame(90, { x: -8, cameraShake: 3, particles: "impact" }),
    frame(280),
  ]),
  "critical-hit": profile("critical-hit", 360, [
    frame(0),
    frame(100, {
      x: -10,
      tint: 0xffffff,
      cameraShake: 5,
      particles: "impact",
    }),
    frame(360),
  ]),
  heal: profile("heal", 600, [
    frame(0),
    frame(300, { tint: 0x7cff9a, particles: "spark" }),
    frame(600),
  ]),
  buff: profile("buff", 500, [
    frame(0),
    frame(250, { y: -4, tint: 0xffdd66, particles: "spark" }),
    frame(500),
  ]),
  debuff: profile("debuff", 500, [
    frame(0),
    frame(250, { y: 3, tint: 0x8c78a8, particles: "status" }),
    frame(500),
  ]),
  "status-poison": profile("status-poison", 600, [
    frame(0),
    frame(300, { tint: 0xa85ccc, particles: "status" }),
    frame(600),
  ]),
  "status-burn": profile("status-burn", 600, [
    frame(0),
    frame(300, { tint: 0xff754f, particles: "status" }),
    frame(600),
  ]),
  "status-sleep": profile("status-sleep", 800, [
    frame(0),
    frame(400, { alpha: 0.72, y: 2 }),
    frame(800),
  ]),
  "capture-enter": profile("capture-enter", 460, [
    frame(0),
    frame(230, { scale: 2, alpha: 0.5 }),
    frame(460, { alpha: 0 }),
  ]),
  "capture-shake": profile("capture-shake", 540, [
    frame(0),
    frame(180, { quarterTurns: -1 }),
    frame(360, { quarterTurns: 1 }),
    frame(540),
  ]),
  "capture-success": profile("capture-success", 700, [
    frame(0),
    frame(350, { tint: 0xffe26a, particles: "spark" }),
    frame(700),
  ]),
  faint: profile("faint", 620, [frame(0), frame(620, { y: 24, alpha: 0 })]),
  evolution: profile("evolution", 1_200, [
    frame(0),
    frame(400, { tint: 0xffffff, particles: "spark" }),
    frame(800, { scale: 2, alpha: 0.6, particles: "spark" }),
    frame(1_200),
  ]),
  "shiny-intro": profile("shiny-intro", 800, [
    frame(0),
    frame(300, { tint: 0xffffff, particles: "spark" }),
    frame(800),
  ]),
});

export interface SampledAnimationFrame extends Omit<
  ProceduralAnimationFrame,
  "atMs"
> {
  completed: boolean;
  damageEvent: boolean;
}

export function sampleProceduralAnimation(
  profileValue: ProceduralAnimationProfile,
  elapsedMs: number,
  previousElapsedMs = -1,
): SampledAnimationFrame {
  const safeElapsed = Math.max(0, elapsedMs);
  const completed =
    !profileValue.loop && safeElapsed >= profileValue.durationMs;
  const timeline =
    profileValue.loop && profileValue.durationMs > 0
      ? safeElapsed % profileValue.durationMs
      : Math.min(safeElapsed, profileValue.durationMs);
  let left = profileValue.frames[0];
  let right = profileValue.frames.at(-1);
  for (let index = 1; index < profileValue.frames.length; index += 1) {
    const candidate = profileValue.frames[index];
    if (candidate && candidate.atMs >= timeline) {
      right = candidate;
      left = profileValue.frames[index - 1];
      break;
    }
  }
  if (!left || !right) throw new Error("animation_profile_has_no_frames");
  const span = Math.max(1, right.atMs - left.atMs);
  const progress = Math.max(0, Math.min(1, (timeline - left.atMs) / span));
  const lerp = (from: number, to: number) =>
    Math.round(from + (to - from) * progress);
  const damageAt = profileValue.damageAtMs;
  return {
    x: lerp(left.x, right.x),
    y: lerp(left.y, right.y),
    scale: progress < 1 ? left.scale : right.scale,
    quarterTurns: progress < 1 ? left.quarterTurns : right.quarterTurns,
    alpha: left.alpha + (right.alpha - left.alpha) * progress,
    tint: progress < 0.5 ? left.tint : right.tint,
    cameraShake:
      left.cameraShake + (right.cameraShake - left.cameraShake) * progress,
    particles: progress < 0.5 ? left.particles : right.particles,
    completed,
    damageEvent:
      damageAt !== null &&
      previousElapsedMs < damageAt &&
      safeElapsed >= damageAt,
  };
}

export interface MovePresentationInput {
  id: number;
  slug: string;
  type: string;
  category: string;
  target: string;
  meta: {
    ailment: string | null;
    healingPercent: number | null;
  } | null;
  statChanges: readonly { stages: number | null }[];
}

export interface MovePresentation {
  moveId: number;
  moveSlug: string;
  animationProfile: ProceduralAnimationId;
  vfxProfile: string;
  sfxProfile: string;
  fallback: "generic-physical" | "generic-special" | "generic-status";
  timing: {
    textAtMs: 0;
    damageAtMs: number | null;
    reactionAtMs: number | null;
    completeAtMs: number;
  };
}

export function mapMovePresentation(
  move: MovePresentationInput,
): MovePresentation {
  const healing = (move.meta?.healingPercent ?? 0) > 0;
  const buff = move.statChanges.some((change) => (change.stages ?? 0) > 0);
  const debuff = move.statChanges.some((change) => (change.stages ?? 0) < 0);
  const ailment = move.meta?.ailment;
  const animationProfile: ProceduralAnimationId = healing
    ? "heal"
    : buff
      ? "buff"
      : debuff
        ? "debuff"
        : ailment && ailment !== "none"
          ? "status-action"
          : move.category === "physical"
            ? "physical-attack"
            : move.category === "special"
              ? "special-attack"
              : "status-action";
  const profileValue = PROCEDURAL_ANIMATION_PROFILES[animationProfile];
  const fallback =
    move.category === "physical"
      ? "generic-physical"
      : move.category === "special"
        ? "generic-special"
        : "generic-status";
  return {
    moveId: move.id,
    moveSlug: move.slug,
    animationProfile,
    vfxProfile:
      healing || buff || debuff
        ? animationProfile
        : `type-${move.type || "neutral"}`,
    sfxProfile:
      move.category === "status" ? "status-generic" : `impact-${move.type}`,
    fallback,
    timing: {
      textAtMs: 0,
      damageAtMs: profileValue.damageAtMs,
      reactionAtMs:
        profileValue.damageAtMs === null ? null : profileValue.damageAtMs + 20,
      completeAtMs: profileValue.durationMs,
    },
  };
}

export interface FrameAnimationDefinition {
  asset: UnifiedAssetRecord;
  frameWidth: number;
  frameHeight: number;
  pivotX: number;
  pivotY: number;
  pingPong: boolean;
}

export function validateFrameAnimation(
  definition: FrameAnimationDefinition,
  source: AssetSourceRecord | undefined,
): readonly string[] {
  const failures: string[] = [];
  const { asset } = definition;
  if (asset.assetType !== "animation" || asset.animationType !== "frame")
    failures.push("asset_not_frame_animation");
  if (asset.format !== "png" && asset.format !== "webp")
    failures.push("runtime_frame_format_must_be_png_or_webp");
  if (source?.modificationAllowed !== true)
    failures.push("source_modification_not_approved");
  if ((asset.frameCount ?? 0) < 2) failures.push("frame_count_invalid");
  if (asset.frameDurations.length !== asset.frameCount)
    failures.push("frame_durations_incomplete");
  if (
    asset.frameDurations.some(
      (duration) => !Number.isInteger(duration) || duration <= 0,
    )
  )
    failures.push("frame_duration_invalid");
  if (
    definition.frameWidth <= 0 ||
    definition.frameHeight <= 0 ||
    !Number.isInteger(definition.frameWidth) ||
    !Number.isInteger(definition.frameHeight)
  )
    failures.push("frame_dimensions_invalid");
  failures.push(
    ...runtimeAssetViolations(asset, source).map(
      (violation) => violation.policy,
    ),
  );
  return [...new Set(failures)];
}
