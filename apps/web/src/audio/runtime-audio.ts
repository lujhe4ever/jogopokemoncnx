import { AudioManager, type AudioCategory } from "@lt/audio-domain";
import {
  DEFAULT_ASSET_FEATURE_FLAGS,
  type AssetFeatureFlags,
} from "@lt/content-contracts";
import { BrowserAudioBackend } from "./browser-audio-backend.js";
import { LocalAudioSettingsStorage } from "./local-audio-settings.js";

let manager: AudioManager | undefined;

function isCategoryEnabled(
  category: AudioCategory,
  flags: Readonly<AssetFeatureFlags>,
): boolean {
  if (category === "cries") return flags.pokemonCries;
  if (category === "effects") return flags.battleSfx;
  if (category === "interface") return flags.uiSfx;
  if (category === "environment") return flags.worldSfx;
  return false;
}

export function getRuntimeAudioManager(): AudioManager {
  manager ??= new AudioManager(
    new BrowserAudioBackend(),
    new LocalAudioSettingsStorage(),
    Date.now,
    16,
    (category) => isCategoryEnabled(category, DEFAULT_ASSET_FEATURE_FLAGS),
  );
  return manager;
}

export function installAudioUnlock(): void {
  const unlock = () => {
    void getRuntimeAudioManager().unlock();
  };
  document.addEventListener("pointerdown", unlock, { once: true });
  document.addEventListener("keydown", unlock, { once: true });
}
