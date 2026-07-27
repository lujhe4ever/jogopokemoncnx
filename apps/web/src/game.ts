import type { MovementInput, PlayerState } from "@lt/engine-core";
import {
  SAFE_SPAWN,
  findAvailablePortal,
  getZone,
  simulateZoneMovement,
  type InteractionDefinition,
} from "@lt/game-simulation";
import Phaser from "phaser";
import { playSound } from "./audio.js";

interface Snapshot {
  type: "world_snapshot";
  zoneId: string;
  packId: string;
  players: Record<string, PlayerState>;
  interactions: readonly InteractionDefinition[];
}

interface InteractionResult {
  type: "interaction_result";
  status:
    | "dialogue"
    | "granted"
    | "already_claimed"
    | "inventory_full"
    | "unavailable"
    | "encounter_available";
  label?: string;
  dialogue?: readonly string[];
  itemId?: string;
  quantity?: number;
  authorization?: string;
  definitionId?: string;
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

function isInteractionResult(value: unknown): value is InteractionResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "interaction_result" &&
    "status" in value &&
    typeof value.status === "string"
  );
}

class HouseScene extends Phaser.Scene {
  private readonly avatars = new Map<string, Phaser.GameObjects.Container>();
  private readonly avatarMotion = new Map<
    string,
    { x: number; y: number; facing: "up" | "down" | "left" | "right" }
  >();
  private readonly pending: MovementInput[] = [];
  private readonly touch = {
    up: false,
    down: false,
    left: false,
    right: false,
  };
  private socket: WebSocket | undefined;
  private local: PlayerState = { ...SAFE_SPAWN };
  private zoneId = "house";
  private requestedPortal: string | undefined;
  private sequence = 0;
  private accumulator = 0;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
  private keys:
    Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key> | undefined;
  private interactionKey: Phaser.Input.Keyboard.Key | undefined;
  private suspended = false;
  private nextFootstepAt = 0;

  constructor(
    private readonly ticket: string,
    private readonly accountId: string,
  ) {
    super("house");
  }

  create() {
    this.renderZone();
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keys = this.input.keyboard?.addKeys("W,A,S,D") as Record<
      "W" | "A" | "S" | "D",
      Phaser.Input.Keyboard.Key
    >;
    this.interactionKey = this.input.keyboard?.addKey("E");
    this.bindTouch();
    this.connect(this.ticket);
    window.addEventListener("lt:arena-open", this.onArenaOpen);
    window.addEventListener("lt:arena-close", this.onArenaClose);
    window.addEventListener("lt:battle-open", this.onBattleOpen);
    window.addEventListener("lt:battle-close", this.onBattleClose);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener("lt:arena-open", this.onArenaOpen);
      window.removeEventListener("lt:arena-close", this.onArenaClose);
      window.removeEventListener("lt:battle-open", this.onBattleOpen);
      window.removeEventListener("lt:battle-close", this.onBattleClose);
      this.socket?.close(1000, "scene_shutdown");
    });
  }

  override update(_time: number, delta: number) {
    if (this.suspended) return;
    this.accumulator += Math.min(delta, 100);
    while (this.accumulator >= 50) {
      this.accumulator -= 50;
      const input = this.readInput();
      if (
        (input.x !== 0 || input.y !== 0) &&
        this.time.now >= this.nextFootstepAt
      ) {
        playSound("step");
        this.nextFootstepAt = this.time.now + 280;
      }
      this.pending.push(input);
      this.local = simulateZoneMovement(this.zoneId, this.local, input, 0.05);
      if (this.socket?.readyState === WebSocket.OPEN)
        this.socket.send(JSON.stringify({ type: "input", ...input }));
      const portal = findAvailablePortal(this.zoneId, this.local);
      if (portal && portal.id !== this.requestedPortal) {
        this.requestedPortal = portal.id;
        this.socket?.send(
          JSON.stringify({ type: "transition", portalId: portal.id }),
        );
      } else if (!portal) this.requestedPortal = undefined;
    }
    this.renderAvatar(this.accountId, this.local, true);
    if (
      this.interactionKey &&
      Phaser.Input.Keyboard.JustDown(this.interactionKey)
    )
      this.requestInteraction();
  }

  private readonly onArenaOpen = () => {
    this.suspendForArena();
  };

  private readonly onArenaClose = () => {
    void this.resumeFromArena();
  };

  private readonly onBattleOpen = () => {
    this.suspended = true;
  };

  private readonly onBattleClose = () => {
    this.suspended = false;
  };

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

  private connect(ticket: string) {
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(
      `${protocol}://${location.host}/ws?ticket=${encodeURIComponent(ticket)}`,
    );
    this.socket = socket;
    socket.addEventListener("open", () => {
      const label = document.querySelector("#connection");
      if (label) label.textContent = "online · progresso salvo";
    });
    socket.addEventListener("close", () => {
      if (this.socket !== socket) return;
      const label = document.querySelector("#connection");
      if (label) label.textContent = "offline";
    });
    socket.addEventListener("message", (event) => {
      let value: unknown;
      try {
        value = JSON.parse(String(event.data)) as unknown;
      } catch {
        return;
      }
      if (isInteractionResult(value)) {
        this.showInteractionResult(value);
        return;
      }
      if (!isSnapshot(value)) return;
      if (value.zoneId !== this.zoneId) {
        this.zoneId = value.zoneId;
        this.pending.length = 0;
        this.requestedPortal = undefined;
        this.renderZone();
        playSound("open");
        window.dispatchEvent(
          new CustomEvent("lt:zone-changed", { detail: value.zoneId }),
        );
        window.dispatchEvent(new Event("lt:state-changed"));
      }
      const authoritative = value.players[this.accountId];
      if (authoritative) {
        this.local = authoritative;
        const confirmed = authoritative.lastProcessedSequence;
        while (this.pending[0] && this.pending[0].sequence <= confirmed)
          this.pending.shift();
        for (const input of this.pending)
          this.local = simulateZoneMovement(
            this.zoneId,
            this.local,
            input,
            0.05,
          );
      }
      const present = new Set(Object.keys(value.players));
      for (const [id, avatar] of this.avatars)
        if (!present.has(id)) {
          avatar.destroy();
          this.avatars.delete(id);
          this.avatarMotion.delete(id);
        }
      for (const [id, state] of Object.entries(value.players))
        if (id !== this.accountId) this.renderAvatar(id, state, false);
    });
  }

  private suspendForArena() {
    this.suspended = true;
    this.socket?.close(1000, "arena_mode");
    this.socket = undefined;
    const label = document.querySelector("#connection");
    if (label) label.textContent = "na arena";
  }

  private async resumeFromArena() {
    const response = await fetch("/api/auth/ws-ticket", {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) {
      this.setFeedback("Não foi possível retomar a exploração.");
      return;
    }
    const value = (await response.json()) as { ticket?: unknown };
    if (typeof value.ticket !== "string") {
      this.setFeedback("Ticket de retorno inválido.");
      return;
    }
    this.suspended = false;
    this.connect(value.ticket);
  }

  private renderZone() {
    const zone = getZone(this.zoneId);
    if (!zone) return;
    this.children.removeAll();
    this.avatars.clear();
    this.avatarMotion.clear();
    this.cameras.main.setBackgroundColor(
      this.zoneId === "house" ? "#18172a" : "#1f4237",
    );
    if (this.zoneId === "house") this.drawHouse();
    else this.drawMeadow();
    for (const portal of zone.portals) this.drawPortal(portal.trigger);
    for (const interaction of zone.interactions)
      this.drawInteraction(interaction);
    this.add
      .text(
        42,
        348,
        this.zoneId === "house"
          ? "CASA DO EXPLORADOR · saída ao sul"
          : "CAMPINA DO LUAR · casa ao norte",
        {
          color: this.zoneId === "house" ? "#e8cf9a" : "#d5edb7",
          fontFamily: "monospace",
          fontSize: "12px",
          fontStyle: "bold",
        },
      )
      .setDepth(20);
  }

  private drawHouse() {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x332b3f).fillRect(24, 24, 592, 352);
    for (let y = 40; y < 360; y += 24)
      for (let x = 40; x < 608; x += 24)
        graphics
          .fillStyle((x + y) % 48 === 0 ? 0x44364a : 0x3b3042)
          .fillRect(x, y, 22, 22);
    graphics
      .fillStyle(0x171523)
      .fillRect(24, 24, 592, 20)
      .fillRect(24, 24, 20, 352)
      .fillRect(596, 24, 20, 352)
      .fillRect(24, 356, 266, 20)
      .fillRect(350, 356, 266, 20);
    graphics
      .fillStyle(0x815b4a)
      .fillRect(76, 70, 160, 70)
      .fillStyle(0xc29a68)
      .fillRect(84, 78, 144, 50)
      .fillStyle(0xe9d5a8)
      .fillRect(92, 82, 52, 24)
      .fillStyle(0x705145)
      .fillRect(410, 70, 150, 54)
      .fillStyle(0xd1a956)
      .fillRect(422, 82, 126, 8)
      .fillRect(422, 100, 126, 8);
    graphics
      .fillStyle(0x684267)
      .fillRect(270, 250, 110, 72)
      .fillStyle(0x9c6688)
      .fillRect(280, 260, 90, 48)
      .fillStyle(0x4e354e)
      .fillRect(292, 270, 66, 28);
    graphics
      .fillStyle(0x8c4051)
      .fillRect(236, 166, 168, 68)
      .fillStyle(0xb75e62)
      .fillRect(244, 174, 152, 52)
      .fillStyle(0xe0a85c)
      .fillRect(316, 174, 8, 52);
    graphics
      .fillStyle(0x6ea5b8)
      .fillRect(286, 44, 68, 12)
      .fillStyle(0x9ad1d6)
      .fillRect(294, 48, 24, 6)
      .fillRect(326, 48, 20, 6);
    graphics
      .fillStyle(0x4b2f33)
      .fillRect(298, 344, 44, 12)
      .fillStyle(0xf3c86a)
      .fillRect(306, 346, 28, 6);
    graphics.lineStyle(4, 0x0d0c16).strokeRect(24, 24, 592, 352);
  }

  private drawMeadow() {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x34634d).fillRect(24, 24, 592, 352);
    for (let y = 36; y < 368; y += 20)
      for (let x = 36; x < 608; x += 20) {
        const variant = (x * 7 + y * 11) % 3;
        graphics
          .fillStyle(
            variant === 0 ? 0x3f7354 : variant === 1 ? 0x376a4b : 0x477a56,
          )
          .fillRect(x, y, 4, 8);
      }
    graphics
      .fillStyle(0xb29262)
      .fillRect(296, 24, 48, 352)
      .fillStyle(0xc2a471)
      .fillRect(306, 24, 28, 352);
    for (const [x, y] of [
      [72, 62],
      [92, 286],
      [220, 320],
      [550, 300],
      [482, 74],
    ] as const) {
      graphics
        .fillStyle(0xf1c45b)
        .fillRect(x, y, 5, 5)
        .fillStyle(0xf4e3a1)
        .fillRect(x + 5, y + 5, 5, 5);
    }
    this.drawTreeCluster(graphics, 120, 90, 80, 52);
    this.drawTreeCluster(graphics, 430, 220, 92, 64);
    graphics
      .fillStyle(0x213e3c)
      .fillRect(42, 42, 88, 54)
      .fillStyle(0x376a71)
      .fillRect(48, 48, 76, 42)
      .fillStyle(0x72a7a1)
      .fillRect(58, 54, 20, 5)
      .fillRect(88, 68, 24, 5);
    graphics.lineStyle(4, 0x132a25).strokeRect(24, 24, 592, 352);
  }

  private drawTreeCluster(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    graphics
      .fillStyle(0x193a31)
      .fillRect(x, y, width, height)
      .fillStyle(0x28523e)
      .fillRect(x + 6, y - 8, width - 12, height)
      .fillStyle(0x4e7d4f)
      .fillRect(x + 14, y - 14, width - 28, 12)
      .fillStyle(0x8d7049)
      .fillRect(x + width / 2 - 5, y + height - 10, 10, 18);
  }

  private drawPortal(trigger: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) {
    const graphics = this.add.graphics();
    graphics
      .fillStyle(0xf2c966, 0.2)
      .fillRect(trigger.x, trigger.y, trigger.width, trigger.height)
      .lineStyle(2, 0xf4dc8c, 0.7)
      .strokeRect(trigger.x, trigger.y, trigger.width, trigger.height)
      .setDepth(4);
  }

  private drawInteraction(interaction: InteractionDefinition) {
    const container = this.add.container(interaction.x, interaction.y);
    if (interaction.kind === "npc") {
      container.add([
        this.add.rectangle(0, 9, 18, 20, 0x7353a6),
        this.add.rectangle(0, -6, 16, 14, 0xd7a678),
        this.add.rectangle(0, -12, 18, 6, 0x493557),
        this.add.rectangle(-5, -5, 3, 3, 0x201b2b),
        this.add.rectangle(5, -5, 3, 3, 0x201b2b),
      ]);
    } else if (interaction.kind === "chest") {
      container.add([
        this.add.rectangle(0, 4, 26, 18, 0x79502f),
        this.add.rectangle(0, -6, 26, 8, 0xb57a3e),
        this.add.rectangle(0, 0, 5, 18, 0xe0b252),
        this.add.rectangle(0, 1, 3, 5, 0x3b2a2a),
      ]);
    } else if (interaction.kind === "encounter") {
      container.add([
        this.add.rectangle(0, 4, 20, 20, 0x352c4d),
        this.add.rectangle(-10, -8, 12, 14, 0x586d4d),
        this.add.rectangle(10, -8, 12, 14, 0x586d4d),
        this.add.rectangle(-5, 0, 3, 3, 0xe7d57b),
        this.add.rectangle(5, 0, 3, 3, 0xe7d57b),
        this.add.rectangle(0, 17, 26, 4, 0x1b342c),
      ]);
    } else if (interaction.id.includes("capture-orb")) {
      container.add([
        this.add.rectangle(0, 0, 16, 16, 0xc9e4df),
        this.add.rectangle(0, -5, 12, 5, 0x6aa3a5),
        this.add.rectangle(0, 1, 5, 5, 0xf4d874),
        this.add.rectangle(0, 11, 22, 4, 0x24483b),
      ]);
    } else {
      container.add([
        this.add.rectangle(0, 2, 6, 18, 0x9bc05b),
        this.add.rectangle(-7, -2, 10, 6, 0x6da64f),
        this.add.rectangle(7, -7, 10, 6, 0x87bb58),
        this.add.rectangle(0, 12, 22, 4, 0x24483b),
      ]);
    }
    container.setDepth(8);
    this.add
      .text(interaction.x, interaction.y - 30, interaction.label, {
        color: "#fff7d6",
        backgroundColor: "#171727cc",
        padding: { x: 5, y: 3 },
        fontFamily: "monospace",
        fontSize: "10px",
      })
      .setOrigin(0.5)
      .setDepth(9);
  }

  private requestInteraction() {
    const zone = getZone(this.zoneId);
    const interaction = zone?.interactions
      .map((candidate) => ({
        candidate,
        distance: Math.hypot(
          this.local.x - candidate.x,
          this.local.y - candidate.y,
        ),
      }))
      .filter(({ candidate, distance }) => distance <= candidate.radius)
      .sort((left, right) => left.distance - right.distance)[0]?.candidate;
    if (!interaction) {
      this.setFeedback("Nada está ao alcance. Aproxime-se de um marcador.");
      return;
    }
    playSound("interact");
    this.socket?.send(
      JSON.stringify({
        type: "interact",
        requestId: crypto.randomUUID(),
        interactionId: interaction.id,
      }),
    );
  }

  private showInteractionResult(result: InteractionResult) {
    if (result.status === "dialogue") {
      this.setFeedback(
        `${result.label ?? "Pessoa"}: ${result.dialogue?.join(" ") ?? ""}`,
      );
      window.dispatchEvent(new Event("lt:state-changed"));
    } else if (result.status === "granted") {
      this.setFeedback(
        `Coletado: ${String(result.quantity ?? 0)}× ${this.itemLabel(result.itemId)}.`,
      );
      playSound("select");
      window.dispatchEvent(new Event("lt:state-changed"));
    } else if (result.status === "already_claimed")
      this.setFeedback("Você já coletou este recurso.");
    else if (result.status === "inventory_full")
      this.setFeedback("A mochila está cheia. Organize a equipe e os itens.");
    else if (result.status === "encounter_available" && result.authorization) {
      this.setFeedback("A relva se moveu. Um encontro selvagem começou!");
      playSound("battle");
      window.dispatchEvent(
        new CustomEvent("lt:encounter", {
          detail: {
            authorization: result.authorization,
            definitionId: result.definitionId,
          },
        }),
      );
    } else this.setFeedback("A interação não está disponível nesta posição.");
  }

  private itemLabel(itemId?: string): string {
    if (itemId === "item:capture-orb") return "Orbe de captura";
    if (itemId === "item:bright-herb") return "Erva luminosa";
    if (itemId === "item:field-tonic") return "Tônico de campo";
    return "item";
  }

  private setFeedback(message: string) {
    const feedback = document.querySelector("#interaction-feedback");
    if (feedback) feedback.textContent = message;
  }

  private renderAvatar(id: string, target: PlayerState, self: boolean) {
    if (self) {
      const game = document.querySelector<HTMLElement>("#game");
      if (game) {
        game.dataset.playerX = target.x.toFixed(1);
        game.dataset.playerY = target.y.toFixed(1);
        game.dataset.zoneId = this.zoneId;
      }
    }
    let avatar = this.avatars.get(id);
    if (!avatar) {
      const body = self ? 0xd9684b : 0x6957b8;
      avatar = this.add.container(target.x, target.y, [
        this.add.rectangle(0, 10, 18, 5, 0x172820, 0.5),
        this.add.rectangle(-5, 6, 5, 8, 0x28314b),
        this.add.rectangle(5, 6, 5, 8, 0x28314b),
        this.add.rectangle(0, -2, 16, 16, body),
        this.add.rectangle(0, -14, 14, 12, 0xd9a477),
        this.add.rectangle(0, -20, 16, 5, self ? 0x46364c : 0x29464a),
        this.add.rectangle(-4, -14, 2, 2, 0x191825),
        this.add.rectangle(4, -14, 2, 2, 0x191825),
      ]);
      avatar.setDepth(15);
      this.avatars.set(id, avatar);
    }
    const previous = this.avatarMotion.get(id);
    const deltaX = target.x - (previous?.x ?? target.x);
    const deltaY = target.y - (previous?.y ?? target.y);
    let facing = previous?.facing ?? "down";
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 0.1)
      facing = deltaX < 0 ? "left" : "right";
    else if (Math.abs(deltaY) > 0.1) facing = deltaY < 0 ? "up" : "down";
    const moving = Math.abs(deltaX) + Math.abs(deltaY) > 0.1;
    const frame = moving ? Math.floor(this.time.now / 130) % 2 : 0;
    const parts = avatar.list as Phaser.GameObjects.Rectangle[];
    const leftLeg = parts[1];
    const rightLeg = parts[2];
    const leftEye = parts[6];
    const rightEye = parts[7];
    if (leftLeg && rightLeg) {
      leftLeg.y = 6 + (moving && frame === 0 ? 2 : 0);
      rightLeg.y = 6 + (moving && frame === 1 ? 2 : 0);
    }
    if (leftEye && rightEye) {
      leftEye.setVisible(facing === "down");
      rightEye.setVisible(facing !== "up");
      rightEye.x = 4;
    }
    avatar.scaleX = facing === "left" ? -1 : 1;
    this.avatarMotion.set(id, {
      x: target.x,
      y: target.y,
      facing,
    });
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
    document.querySelector("#interact")?.addEventListener("click", () => {
      this.requestInteraction();
    });
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
        for (const event of [
          "pointerup",
          "pointercancel",
          "pointerleave",
        ] as const)
          button.addEventListener(event, () => {
            set(false);
          });
      });
  }
}

let currentGame: Phaser.Game | undefined;

export function startGame(ticket: string, accountId: string) {
  currentGame?.destroy(true);
  currentGame = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: 640,
    height: 400,
    pixelArt: true,
    backgroundColor: "#18172a",
    render: {
      antialias: false,
      roundPixels: true,
    },
    scene: new HouseScene(ticket, accountId),
  });
  return currentGame;
}

export function stopGame(): void {
  currentGame?.destroy(true);
  currentGame = undefined;
  document.querySelector("#game")?.replaceChildren();
}
