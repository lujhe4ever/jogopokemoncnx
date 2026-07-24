import {
  PROCEDURAL_ANIMATION_PROFILES,
  sampleProceduralAnimation,
  type ProceduralAnimationId,
} from "@lt/content-contracts";
import type Phaser from "phaser";

interface AnimatableTarget {
  x: number;
  y: number;
  setPosition(x: number, y: number): AnimatableTarget;
  setScale(scale: number): AnimatableTarget;
  setRotation(rotation: number): AnimatableTarget;
  setAlpha(alpha: number): AnimatableTarget;
  setTint?(tint: number): AnimatableTarget;
  clearTint?(): AnimatableTarget;
}

interface Playback {
  eventId: string;
  profileId: ProceduralAnimationId;
  startedAt: number;
  previousElapsedMs: number;
  baseX: number;
  baseY: number;
}

export interface ProceduralAnimationCallbacks {
  onDamageMoment?(eventId: string): void;
  onParticles?(kind: "spark" | "status" | "impact", x: number, y: number): void;
}

export class PhaserProceduralAnimator {
  private active: Playback | undefined;
  private readonly completedEventIds = new Set<string>();

  constructor(
    private readonly target: AnimatableTarget,
    private readonly camera: Phaser.Cameras.Scene2D.Camera,
    private readonly callbacks: ProceduralAnimationCallbacks = {},
  ) {}

  play(
    eventId: string,
    profileId: ProceduralAnimationId,
    nowMs: number,
  ): boolean {
    if (this.completedEventIds.has(eventId) || this.active?.eventId === eventId)
      return false;
    this.active = {
      eventId,
      profileId,
      startedAt: nowMs,
      previousElapsedMs: -1,
      baseX: Math.round(this.target.x),
      baseY: Math.round(this.target.y),
    };
    return true;
  }

  update(nowMs: number): void {
    const playback = this.active;
    if (!playback) return;
    const profile = PROCEDURAL_ANIMATION_PROFILES[playback.profileId];
    const elapsedMs = Math.max(0, nowMs - playback.startedAt);
    const sampled = sampleProceduralAnimation(
      profile,
      elapsedMs,
      playback.previousElapsedMs,
    );
    this.target.setPosition(
      Math.round(playback.baseX + sampled.x),
      Math.round(playback.baseY + sampled.y),
    );
    this.target.setScale(sampled.scale);
    this.target.setRotation(sampled.quarterTurns * (Math.PI / 2));
    this.target.setAlpha(sampled.alpha);
    if (sampled.tint === null) this.target.clearTint?.();
    else this.target.setTint?.(sampled.tint);
    if (sampled.cameraShake > 0)
      this.camera.shake(50, sampled.cameraShake / 1_000, true);
    if (sampled.particles !== "none")
      this.callbacks.onParticles?.(
        sampled.particles,
        this.target.x,
        this.target.y,
      );
    if (sampled.damageEvent) this.callbacks.onDamageMoment?.(playback.eventId);
    playback.previousElapsedMs = elapsedMs;
    if (sampled.completed) {
      this.completedEventIds.add(playback.eventId);
      this.reset(playback);
      this.active = undefined;
    }
  }

  cancel(eventId?: string): void {
    if (!this.active || (eventId && this.active.eventId !== eventId)) return;
    this.reset(this.active);
    this.active = undefined;
  }

  private reset(playback: Playback): void {
    const target = this.target
      .setPosition(playback.baseX, playback.baseY)
      .setScale(1)
      .setRotation(0)
      .setAlpha(1);
    target.clearTint?.();
  }
}
