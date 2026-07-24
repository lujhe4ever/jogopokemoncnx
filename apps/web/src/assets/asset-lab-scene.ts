import {
  PROCEDURAL_ANIMATION_IDS,
  PROCEDURAL_ANIMATION_PROFILES,
  type ProceduralAnimationId,
} from "@lt/content-contracts";
import Phaser from "phaser";
import { PhaserProceduralAnimator } from "./phaser-procedural-animator.js";

export class AssetLabScene extends Phaser.Scene {
  private profileIndex = 0;
  private animator: PhaserProceduralAnimator | undefined;
  private status: Phaser.GameObjects.Text | undefined;
  private sequence = 0;

  constructor() {
    super("asset-lab");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#18211c");
    const target = this.add.rectangle(320, 190, 96, 96, 0x6abf79);
    target.setStrokeStyle(4, 0xe8f1e9);
    this.status = this.add.text(24, 24, "", {
      color: "#e8f1e9",
      fontSize: "16px",
    });
    this.add.text(
      24,
      350,
      "Dev only | left/right: profile | space: play | escape: cancel",
      { color: "#a7b5aa", fontSize: "13px" },
    );
    this.animator = new PhaserProceduralAnimator(target, this.cameras.main);
    this.input.keyboard?.on("keydown-LEFT", () => {
      this.select(-1);
    });
    this.input.keyboard?.on("keydown-RIGHT", () => {
      this.select(1);
    });
    this.input.keyboard?.on("keydown-SPACE", () => {
      this.play();
    });
    this.input.keyboard?.on("keydown-ESC", () => this.animator?.cancel());
    this.renderStatus();
  }

  override update(time: number): void {
    this.animator?.update(time);
  }

  private select(direction: number): void {
    this.profileIndex =
      (this.profileIndex + direction + PROCEDURAL_ANIMATION_IDS.length) %
      PROCEDURAL_ANIMATION_IDS.length;
    this.renderStatus();
  }

  private play(): void {
    const profileId = this.currentProfile();
    this.sequence += 1;
    this.animator?.play(
      `asset-lab:${String(this.sequence)}`,
      profileId,
      this.time.now,
    );
  }

  private currentProfile(): ProceduralAnimationId {
    return PROCEDURAL_ANIMATION_IDS[this.profileIndex] ?? "idle";
  }

  private renderStatus(): void {
    const profile = PROCEDURAL_ANIMATION_PROFILES[this.currentProfile()];
    this.status?.setText([
      `Profile: ${profile.id}`,
      `Duration: ${String(profile.durationMs)} ms`,
      `Damage marker: ${profile.damageAtMs === null ? "none" : String(profile.damageAtMs)}`,
      "Approved media: 0",
      "Blocked media cannot be loaded by this scene.",
    ]);
  }
}
