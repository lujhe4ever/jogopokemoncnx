import type { MovementInput, PlayerState } from "@lt/engine-core";
import {
  HOUSE_COLLISION,
  SAFE_SPAWN,
  simulateHouseMovement,
} from "@lt/game-simulation";
import Phaser from "phaser";

interface Snapshot {
  type: "world_snapshot";
  players: Record<string, PlayerState>;
}

function isSnapshot(value: unknown): value is Snapshot {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "world_snapshot" &&
    "players" in value &&
    typeof value.players === "object" &&
    value.players !== null
  );
}

class HouseScene extends Phaser.Scene {
  private readonly avatars = new Map<string, Phaser.GameObjects.Arc>();
  private readonly pending: MovementInput[] = [];
  private readonly touch = {
    up: false,
    down: false,
    left: false,
    right: false,
  };
  private socket?: WebSocket;
  private local: PlayerState = { ...SAFE_SPAWN };
  private sequence = 0;
  private accumulator = 0;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
  private keys:
    Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key> | undefined;

  constructor(
    private readonly ticket: string,
    private readonly accountId: string,
  ) {
    super("house");
  }

  create() {
    this.cameras.main.setBackgroundColor("#c9b98a");
    const graphics = this.add.graphics();
    graphics.lineStyle(4, 0x3e4a3d).strokeRect(24, 24, 592, 352);
    for (const obstacle of HOUSE_COLLISION.obstacles) {
      graphics
        .fillStyle(0x76533a)
        .fillRoundedRect(
          obstacle.x,
          obstacle.y,
          obstacle.width,
          obstacle.height,
          8,
        );
    }
    this.add.text(40, 340, "Casa original • WASD/setas ou controles de toque", {
      color: "#263126",
      fontSize: "14px",
    });
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keys = this.input.keyboard?.addKeys("W,A,S,D") as Record<
      "W" | "A" | "S" | "D",
      Phaser.Input.Keyboard.Key
    >;
    this.bindTouch();
    this.connect();
  }

  override update(_time: number, delta: number) {
    this.accumulator += Math.min(delta, 100);
    while (this.accumulator >= 50) {
      this.accumulator -= 50;
      const input = this.readInput();
      this.pending.push(input);
      this.local = simulateHouseMovement(this.local, input, 0.05);
      this.socket?.send(JSON.stringify({ type: "input", ...input }));
    }
    this.renderAvatar(this.accountId, this.local, 0x2d69c4);
  }

  private readInput(): MovementInput {
    const left =
      this.cursors?.left.isDown || this.keys?.A.isDown || this.touch.left;
    const right =
      this.cursors?.right.isDown || this.keys?.D.isDown || this.touch.right;
    const up = this.cursors?.up.isDown || this.keys?.W.isDown || this.touch.up;
    const down =
      this.cursors?.down.isDown || this.keys?.S.isDown || this.touch.down;
    return {
      sequence: ++this.sequence,
      x: (right ? 1 : 0) - (left ? 1 : 0),
      y: (down ? 1 : 0) - (up ? 1 : 0),
    };
  }

  private connect() {
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    this.socket = new WebSocket(
      `${protocol}://${location.host}/ws?ticket=${encodeURIComponent(this.ticket)}`,
    );
    this.socket.addEventListener("open", () => {
      const label = document.querySelector("#connection");
      if (label) label.textContent = "online";
    });
    this.socket.addEventListener("message", (event) => {
      const value: unknown = JSON.parse(String(event.data));
      if (!isSnapshot(value)) return;
      const authoritative = value.players[this.accountId];
      if (authoritative) {
        this.local = authoritative;
        const confirmed = authoritative.lastProcessedSequence;
        while (this.pending[0] && this.pending[0].sequence <= confirmed)
          this.pending.shift();
        for (const input of this.pending)
          this.local = simulateHouseMovement(this.local, input, 0.05);
      }
      for (const [id, state] of Object.entries(value.players)) {
        if (id !== this.accountId) this.renderAvatar(id, state, 0xb94a48);
      }
    });
  }

  private renderAvatar(id: string, target: PlayerState, color: number) {
    const avatar =
      this.avatars.get(id) ?? this.add.circle(target.x, target.y, 10, color);
    this.avatars.set(id, avatar);
    avatar.x = Phaser.Math.Linear(
      avatar.x,
      target.x,
      id === this.accountId ? 1 : 0.25,
    );
    avatar.y = Phaser.Math.Linear(
      avatar.y,
      target.y,
      id === this.accountId ? 1 : 0.25,
    );
  }

  private bindTouch() {
    document
      .querySelectorAll<HTMLButtonElement>("[data-direction]")
      .forEach((button) => {
        const direction = button.dataset.direction as keyof typeof this.touch;
        const set = (active: boolean) => {
          this.touch[direction] = active;
        };
        button.addEventListener("pointerdown", () => {
          set(true);
        });
        button.addEventListener("pointerup", () => {
          set(false);
        });
        button.addEventListener("pointercancel", () => {
          set(false);
        });
        button.addEventListener("pointerleave", () => {
          set(false);
        });
      });
  }
}

export function startGame(ticket: string, accountId: string) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: 640,
    height: 400,
    pixelArt: true,
    scene: new HouseScene(ticket, accountId),
  });
}
