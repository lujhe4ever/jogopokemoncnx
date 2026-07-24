import type { AudioSettings, AudioSettingsStorage } from "@lt/audio-domain";

const STORAGE_KEY = "lt:audio-settings:v1";

export class LocalAudioSettingsStorage implements AudioSettingsStorage {
  load(): Partial<AudioSettings> | null {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value ? (JSON.parse(value) as Partial<AudioSettings>) : null;
    } catch {
      return null;
    }
  }

  save(settings: AudioSettings): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }
}
