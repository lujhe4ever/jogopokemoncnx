import type { AudioBackend, AudioVoice } from "@lt/audio-domain";
import type { UnifiedAssetRecord } from "@lt/content-contracts";

function fade(
  element: HTMLAudioElement,
  target: number,
  durationMs: number,
  completed?: () => void,
): void {
  if (durationMs <= 0) {
    element.volume = target;
    completed?.();
    return;
  }
  const startedAt = performance.now();
  const initial = element.volume;
  const update = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / durationMs);
    element.volume = initial + (target - initial) * progress;
    if (progress < 1) requestAnimationFrame(update);
    else completed?.();
  };
  requestAnimationFrame(update);
}

export class BrowserAudioBackend implements AudioBackend {
  private readonly cached = new Map<string, HTMLAudioElement>();

  canPlay(mimeType: string): boolean {
    return new Audio().canPlayType(mimeType) !== "";
  }

  async unlock(): Promise<void> {
    const context = new AudioContext();
    if (context.state === "suspended") await context.resume();
    await context.close();
  }

  preload(asset: UnifiedAssetRecord): Promise<void> {
    if (!asset.localPath)
      return Promise.reject(
        new Error(`asset_has_no_local_path:${asset.assetId}`),
      );
    if (this.cached.has(asset.assetId)) return Promise.resolve();
    const element = new Audio(asset.localPath);
    element.preload = "auto";
    this.cached.set(asset.assetId, element);
    return new Promise((resolve, reject) => {
      const completed = () => {
        cleanup();
        resolve();
      };
      const failed = () => {
        cleanup();
        reject(new Error(`audio_preload_failed:${asset.assetId}`));
      };
      const cleanup = () => {
        element.removeEventListener("canplaythrough", completed);
        element.removeEventListener("error", failed);
      };
      element.addEventListener("canplaythrough", completed, { once: true });
      element.addEventListener("error", failed, { once: true });
      element.load();
    });
  }

  unload(assetId: string): void {
    const element = this.cached.get(assetId);
    if (!element) return;
    element.pause();
    element.removeAttribute("src");
    element.load();
    this.cached.delete(assetId);
  }

  play(asset: UnifiedAssetRecord, volume: number, loop: boolean): AudioVoice {
    if (!asset.localPath)
      throw new Error(`asset_has_no_local_path:${asset.assetId}`);
    const template =
      this.cached.get(asset.assetId) ?? new Audio(asset.localPath);
    const element = template.cloneNode(true) as HTMLAudioElement;
    element.volume = volume;
    element.loop = loop;
    void element.play();
    return {
      id: crypto.randomUUID(),
      setVolume(nextVolume, fadeMs = 0) {
        fade(element, nextVolume, fadeMs);
      },
      stop(fadeMs = 0) {
        fade(element, 0, fadeMs, () => {
          element.pause();
          element.currentTime = 0;
        });
      },
    };
  }
}
