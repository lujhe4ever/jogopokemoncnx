import {
  assertAssetRuntimeAllowed,
  type AssetSourceRecord,
  type UnifiedAssetRecord,
} from "@lt/content-contracts";

export type AudioCategory =
  "music" | "effects" | "interface" | "environment" | "cries";

export interface AudioVoice {
  readonly id: string;
  setVolume(volume: number, fadeMs?: number): void;
  stop(fadeMs?: number): void;
}

export interface AudioBackend {
  canPlay(mimeType: string): boolean;
  unlock(): Promise<void>;
  preload(asset: UnifiedAssetRecord): Promise<void>;
  unload(assetId: string): void;
  play(asset: UnifiedAssetRecord, volume: number, loop: boolean): AudioVoice;
}

export interface AudioSettingsStorage {
  load(): Partial<AudioSettings> | null;
  save(settings: AudioSettings): void;
}

export interface AudioSettings {
  muted: boolean;
  masterVolume: number;
  categoryVolumes: Readonly<Record<AudioCategory, number>>;
}

export interface AudioAssetGroup {
  id: string;
  category: AudioCategory;
  variants: readonly UnifiedAssetRecord[];
}

export interface PlayAudioRequest {
  groupId: string;
  priority?: number;
  cooldownMs?: number;
  loop?: boolean;
  crossfadeMs?: number;
}

interface ActiveVoice {
  groupId: string;
  category: AudioCategory;
  priority: number;
  voice: AudioVoice;
}

const DEFAULT_CATEGORY_VOLUMES: Readonly<Record<AudioCategory, number>> =
  Object.freeze({
    music: 0.7,
    effects: 1,
    interface: 0.8,
    environment: 0.65,
    cries: 0.9,
  });

export const DEFAULT_AUDIO_SETTINGS: Readonly<AudioSettings> = Object.freeze({
  muted: false,
  masterVolume: 1,
  categoryVolumes: DEFAULT_CATEGORY_VOLUMES,
});

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function normalizeSettings(
  settings: Partial<AudioSettings> | null,
): AudioSettings {
  return {
    muted: settings?.muted ?? DEFAULT_AUDIO_SETTINGS.muted,
    masterVolume: clampVolume(
      settings?.masterVolume ?? DEFAULT_AUDIO_SETTINGS.masterVolume,
    ),
    categoryVolumes: {
      ...DEFAULT_CATEGORY_VOLUMES,
      ...Object.fromEntries(
        Object.entries(settings?.categoryVolumes ?? {}).map(([key, value]) => [
          key,
          clampVolume(value),
        ]),
      ),
    },
  };
}

export class AudioManager {
  private readonly groups = new Map<string, AudioAssetGroup>();
  private readonly sources = new Map<string, AssetSourceRecord>();
  private readonly preloaded = new Set<string>();
  private readonly active: ActiveVoice[] = [];
  private readonly lastPlayedAt = new Map<string, number>();
  private settings: AudioSettings;
  private unlocked = false;

  constructor(
    private readonly backend: AudioBackend,
    private readonly storage: AudioSettingsStorage,
    private readonly now: () => number = Date.now,
    private readonly maxVoices = 16,
    private readonly categoryEnabled: (
      category: AudioCategory,
    ) => boolean = () => false,
  ) {
    this.settings = normalizeSettings(storage.load());
  }

  registerSources(sources: readonly AssetSourceRecord[]): void {
    for (const source of sources) this.sources.set(source.sourceId, source);
  }

  registerGroups(groups: readonly AudioAssetGroup[]): void {
    for (const group of groups) {
      if (group.variants.length === 0)
        throw new Error(`audio_group_has_no_variants:${group.id}`);
      this.groups.set(group.id, group);
    }
  }

  async unlock(): Promise<void> {
    if (this.unlocked) return;
    await this.backend.unlock();
    this.unlocked = true;
  }

  getSettings(): AudioSettings {
    return {
      ...this.settings,
      categoryVolumes: { ...this.settings.categoryVolumes },
    };
  }

  setMuted(muted: boolean): void {
    this.settings = { ...this.settings, muted };
    this.persistAndRefresh();
  }

  setMasterVolume(volume: number): void {
    this.settings = {
      ...this.settings,
      masterVolume: clampVolume(volume),
    };
    this.persistAndRefresh();
  }

  setCategoryVolume(category: AudioCategory, volume: number): void {
    this.settings = {
      ...this.settings,
      categoryVolumes: {
        ...this.settings.categoryVolumes,
        [category]: clampVolume(volume),
      },
    };
    this.persistAndRefresh();
  }

  async preload(groupIds: readonly string[]): Promise<void> {
    for (const groupId of groupIds) {
      this.assertCategoryEnabled(groupId);
      const selected = this.selectVariant(groupId);
      if (this.preloaded.has(selected.assetId)) continue;
      await this.backend.preload(selected);
      this.preloaded.add(selected.assetId);
    }
  }

  unload(groupIds: readonly string[]): void {
    for (const groupId of groupIds) {
      const group = this.groups.get(groupId);
      if (!group) continue;
      for (const variant of group.variants) {
        this.backend.unload(variant.assetId);
        this.preloaded.delete(variant.assetId);
      }
    }
  }

  play(request: PlayAudioRequest): AudioVoice | null {
    if (!this.unlocked || this.settings.muted) return null;
    const group = this.groups.get(request.groupId);
    if (!group) throw new Error(`unknown_audio_group:${request.groupId}`);
    if (!this.categoryEnabled(group.category))
      throw new Error(`audio_feature_disabled:${group.category}`);
    const now = this.now();
    const cooldownMs = Math.max(0, request.cooldownMs ?? 0);
    if (now - (this.lastPlayedAt.get(group.id) ?? -Infinity) < cooldownMs)
      return null;

    const priority = request.priority ?? 0;
    this.reserveVoice(priority);
    const asset = this.selectVariant(group.id);
    const volume = this.effectiveVolume(group.category);
    if (
      group.category === "music" &&
      request.crossfadeMs !== undefined &&
      request.crossfadeMs > 0
    ) {
      for (const active of this.active.filter(
        (candidate) => candidate.category === "music",
      )) {
        active.voice.setVolume(0, request.crossfadeMs);
        active.voice.stop(request.crossfadeMs);
        this.removeVoice(active.voice.id);
      }
    }
    const voice = this.backend.play(asset, volume, request.loop ?? false);
    this.active.push({
      groupId: group.id,
      category: group.category,
      priority,
      voice,
    });
    this.lastPlayedAt.set(group.id, now);
    return voice;
  }

  stopGroup(groupId: string, fadeMs = 0): void {
    for (const active of this.active.filter(
      (candidate) => candidate.groupId === groupId,
    )) {
      active.voice.stop(fadeMs);
      this.removeVoice(active.voice.id);
    }
  }

  releaseVoice(voiceId: string): void {
    this.removeVoice(voiceId);
  }

  private selectVariant(groupId: string): UnifiedAssetRecord {
    const group = this.groups.get(groupId);
    if (!group) throw new Error(`unknown_audio_group:${groupId}`);
    for (const variant of group.variants) {
      const source = this.sources.get(variant.sourceId);
      try {
        assertAssetRuntimeAllowed(variant, source);
      } catch {
        continue;
      }
      if (this.backend.canPlay(variant.mimeType)) return variant;
    }
    throw new Error(`no_runtime_audio_variant:${groupId}`);
  }

  private assertCategoryEnabled(groupId: string): void {
    const group = this.groups.get(groupId);
    if (!group) throw new Error(`unknown_audio_group:${groupId}`);
    if (!this.categoryEnabled(group.category))
      throw new Error(`audio_feature_disabled:${group.category}`);
  }

  private reserveVoice(priority: number): void {
    if (this.active.length < this.maxVoices) return;
    const lowest = [...this.active].sort(
      (left, right) => left.priority - right.priority,
    )[0];
    if (!lowest || lowest.priority > priority)
      throw new Error("audio_voice_limit");
    lowest.voice.stop();
    this.removeVoice(lowest.voice.id);
  }

  private effectiveVolume(category: AudioCategory): number {
    return this.settings.muted
      ? 0
      : this.settings.masterVolume * this.settings.categoryVolumes[category];
  }

  private persistAndRefresh(): void {
    this.storage.save(this.getSettings());
    for (const active of this.active)
      active.voice.setVolume(this.effectiveVolume(active.category));
  }

  private removeVoice(voiceId: string): void {
    const index = this.active.findIndex(
      (candidate) => candidate.voice.id === voiceId,
    );
    if (index >= 0) this.active.splice(index, 1);
  }
}
