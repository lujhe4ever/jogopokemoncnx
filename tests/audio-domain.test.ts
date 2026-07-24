import {
  AudioManager,
  type AudioBackend,
  type AudioSettings,
  type AudioSettingsStorage,
  type AudioVoice,
} from "../packages/audio-domain/src/index.js";
import type {
  AssetSourceRecord,
  UnifiedAssetRecord,
} from "../packages/content-contracts/src/index.js";
import { describe, expect, it } from "vitest";

const revision = "c".repeat(40);

function source(): AssetSourceRecord {
  return {
    sourceId: "original-audio",
    url: "https://example.test/audio",
    repository: "example/audio",
    commitSha: revision,
    version: null,
    license: "CC0-1.0",
    ownership: "Original work",
    attribution: [],
    modificationAllowed: true,
    redistributionAllowed: true,
    status: "approved",
    evidence: ["https://example.test/license"],
    decisionId: "D-024",
  };
}

function audio(
  id: string,
  mimeType: string,
  format: "ogg" | "mp3" | "wav",
  overrides: Partial<UnifiedAssetRecord> = {},
): UnifiedAssetRecord {
  return {
    schemaVersion: 1,
    assetId: id,
    assetType: "sound-effect",
    speciesId: null,
    pokemonId: null,
    formId: null,
    variantId: "battle-impact",
    gender: "unspecified",
    orientation: "not-applicable",
    shiny: false,
    animated: false,
    animationType: "none",
    sourceId: "original-audio",
    sourceRevision: revision,
    sourcePath: `audio/${id}.${format}`,
    localPath: `content/assets/approved/${id}.${format}`,
    format,
    mimeType,
    width: null,
    height: null,
    frameCount: null,
    durationMs: 500,
    frameDurations: [],
    loop: false,
    sampleRate: 48_000,
    channels: 2,
    loudness: -14,
    sizeBytes: 256,
    sha256: "d".repeat(64),
    licenseStatus: "approved",
    runtimeEnabled: true,
    replacementRequired: false,
    approvedBy: "owner",
    approvedAt: "2026-07-23",
    decisionId: "D-024",
    retrievedAt: "2026-07-22",
    ...overrides,
  };
}

class MemoryStorage implements AudioSettingsStorage {
  saved: AudioSettings | undefined;

  load(): Partial<AudioSettings> | null {
    return this.saved ?? null;
  }

  save(settings: AudioSettings): void {
    this.saved = settings;
  }
}

class TestVoice implements AudioVoice {
  readonly volumes: Array<[number, number | undefined]> = [];
  readonly stops: Array<number | undefined> = [];

  constructor(readonly id: string) {}

  setVolume(volume: number, fadeMs?: number): void {
    this.volumes.push([volume, fadeMs]);
  }

  stop(fadeMs?: number): void {
    this.stops.push(fadeMs);
  }
}

class TestBackend implements AudioBackend {
  unlocked = 0;
  readonly preloaded: string[] = [];
  readonly unloaded: string[] = [];
  readonly played: Array<{
    asset: UnifiedAssetRecord;
    volume: number;
    loop: boolean;
    voice: TestVoice;
  }> = [];

  canPlay(mimeType: string): boolean {
    return mimeType !== "audio/ogg";
  }

  unlock(): Promise<void> {
    this.unlocked += 1;
    return Promise.resolve();
  }

  preload(asset: UnifiedAssetRecord): Promise<void> {
    this.preloaded.push(asset.assetId);
    return Promise.resolve();
  }

  unload(assetId: string): void {
    this.unloaded.push(assetId);
  }

  play(asset: UnifiedAssetRecord, volume: number, loop: boolean): AudioVoice {
    const voice = new TestVoice(`voice-${String(this.played.length + 1)}`);
    this.played.push({ asset, volume, loop, voice });
    return voice;
  }
}

function managerFixture(
  options: { maxVoices?: number; enabled?: boolean } = {},
) {
  const backend = new TestBackend();
  const storage = new MemoryStorage();
  let now = 1_000;
  const manager = new AudioManager(
    backend,
    storage,
    () => now,
    options.maxVoices ?? 4,
    () => options.enabled ?? true,
  );
  manager.registerSources([source()]);
  manager.registerGroups([
    {
      id: "impact",
      category: "effects",
      variants: [
        audio("impact-ogg", "audio/ogg", "ogg"),
        audio("impact-wav", "audio/wav", "wav"),
      ],
    },
  ]);
  return {
    backend,
    storage,
    manager,
    advance: (milliseconds: number) => {
      now += milliseconds;
    },
  };
}

describe("audio manager", () => {
  it("requires unlock and an explicit category flag, then uses format fallback", async () => {
    const disabled = managerFixture({ enabled: false });
    await disabled.manager.unlock();
    expect(() => disabled.manager.play({ groupId: "impact" })).toThrow(
      "audio_feature_disabled:effects",
    );

    const { manager, backend } = managerFixture();
    expect(manager.play({ groupId: "impact" })).toBeNull();
    await manager.unlock();
    expect(manager.play({ groupId: "impact" })).not.toBeNull();
    expect(backend.unlocked).toBe(1);
    expect(backend.played[0]?.asset.assetId).toBe("impact-wav");
  });

  it("persists clamped volumes, mute, preload, and unload", async () => {
    const { manager, backend, storage } = managerFixture();
    manager.setMasterVolume(2);
    manager.setCategoryVolume("effects", -1);
    manager.setMuted(true);
    expect(storage.saved).toMatchObject({
      muted: true,
      masterVolume: 1,
      categoryVolumes: { effects: 0 },
    });

    manager.setMuted(false);
    manager.setCategoryVolume("effects", 0.5);
    await manager.preload(["impact"]);
    manager.unload(["impact"]);
    expect(backend.preloaded).toEqual(["impact-wav"]);
    expect(backend.unloaded).toEqual(["impact-ogg", "impact-wav"]);
  });

  it("applies cooldown and voice priority limits", async () => {
    const { manager, backend, advance } = managerFixture({ maxVoices: 1 });
    await manager.unlock();
    expect(
      manager.play({ groupId: "impact", priority: 5, cooldownMs: 100 }),
    ).not.toBeNull();
    expect(
      manager.play({ groupId: "impact", priority: 5, cooldownMs: 100 }),
    ).toBeNull();
    advance(100);
    expect(() => manager.play({ groupId: "impact", priority: 4 })).toThrow(
      "audio_voice_limit",
    );
    expect(backend.played).toHaveLength(1);
  });

  it("never plays doubtful audio even when its category is enabled", async () => {
    const { manager } = managerFixture();
    manager.registerGroups([
      {
        id: "doubtful",
        category: "effects",
        variants: [
          audio("doubtful", "audio/wav", "wav", {
            licenseStatus: "doubtful",
            runtimeEnabled: false,
            replacementRequired: true,
            approvedBy: null,
            approvedAt: null,
            decisionId: "D-023",
          }),
        ],
      },
    ]);
    await manager.unlock();
    expect(() => manager.play({ groupId: "doubtful" })).toThrow(
      "no_runtime_audio_variant:doubtful",
    );
  });
});
