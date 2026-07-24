import type { MovementInput, PlayerState } from "@lt/engine-core";
import {
  SAFE_SPAWN,
  findAvailablePortal,
  getZone,
  simulateZoneMovement,
  type InteractionDefinition,
} from "@lt/game-simulation";
import Phaser from "phaser";

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
  private readonly avatars = new Map<string, Phaser.GameObjects.Arc>();
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
    window.addEventListener("lt:arena-open", () => {
      this.suspendForArena();
    });
    window.addEventListener("lt:arena-close", () => {
      void this.resumeFromArena();
    });
  }

  override update(_time: number, delta: number) {
    if (this.suspended) return;
    this.accumulator += Math.min(delta, 100);
    while (this.accumulator >= 50) {
      this.accumulator -= 50;
      const input = this.readInput();
      this.pending.push(input);
      this.local = simulateZoneMovement(this.zoneId, this.local, input, 0.05);
      this.socket?.send(JSON.stringify({ type: "input", ...input }));
      const portal = findAvailablePortal(this.zoneId, this.local);
      if (portal && portal.id !== this.requestedPortal) {
        this.requestedPortal = portal.id;
        this.socket?.send(
          JSON.stringify({ type: "transition", portalId: portal.id }),
        );
      } else if (!portal) this.requestedPortal = undefined;
    }
    this.renderAvatar(this.accountId, this.local, 0x2d69c4);
    if (
      this.interactionKey &&
      Phaser.Input.Keyboard.JustDown(this.interactionKey)
    )
      this.requestInteraction();
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

  private connect(ticket: string) {
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    this.socket = new WebSocket(
      `${protocol}://${location.host}/ws?ticket=${encodeURIComponent(ticket)}`,
    );
    this.socket.addEventListener("open", () => {
      const label = document.querySelector("#connection");
      if (label) label.textContent = "online";
    });
    this.socket.addEventListener("message", (event) => {
      const value: unknown = JSON.parse(String(event.data));
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
      for (const [id, state] of Object.entries(value.players)) {
        if (id !== this.accountId) this.renderAvatar(id, state, 0xb94a48);
      }
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
    if (!this.suspended) return;
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
    this.cameras.main.setBackgroundColor(
      this.zoneId === "house" ? "#c9b98a" : "#91bd72",
    );
    const graphics = this.add.graphics();
    const bounds = zone.collision.bounds;
    graphics
      .lineStyle(4, 0x3e4a3d)
      .strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    for (const obstacle of zone.collision.obstacles) {
      graphics
        .fillStyle(this.zoneId === "house" ? 0x76533a : 0x477044)
        .fillRoundedRect(
          obstacle.x,
          obstacle.y,
          obstacle.width,
          obstacle.height,
          8,
        );
    }
    for (const portal of zone.portals) {
      graphics
        .fillStyle(0xe7d26c, 0.7)
        .fillRect(
          portal.trigger.x,
          portal.trigger.y,
          portal.trigger.width,
          portal.trigger.height,
        );
    }
    for (const interaction of zone.interactions) {
      const color =
        interaction.kind === "npc"
          ? 0x784fc5
          : interaction.kind === "chest"
            ? 0xc58a32
            : interaction.kind === "encounter"
              ? 0x9b3f5d
              : 0x59a953;
      graphics.fillStyle(color).fillCircle(interaction.x, interaction.y, 12);
      this.add.text(interaction.x - 34, interaction.y - 28, interaction.label, {
        color: "#1d271d",
        fontSize: "11px",
      });
    }
    this.add.text(
      40,
      340,
      `${this.zoneId === "house" ? "Casa" : "Clareira"} original • WASD/setas ou toque`,
      { color: "#263126", fontSize: "14px" },
    );
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
      this.setFeedback("Não há nada ao alcance.");
      return;
    }
    this.socket?.send(
      JSON.stringify({
        type: "interact",
        requestId: crypto.randomUUID(),
        interactionId: interaction.id,
      }),
    );
  }

  private showInteractionResult(result: InteractionResult) {
    if (result.status === "dialogue")
      this.setFeedback(
        `${result.label ?? "Pessoa"}: ${result.dialogue?.join(" ") ?? ""}`,
      );
    else if (result.status === "granted")
      this.setFeedback(
        `Recebido: ${String(result.quantity ?? 0)} × ${result.itemId ?? "item"}.`,
      );
    else if (result.status === "already_claimed")
      this.setFeedback("Este recurso já foi coletado.");
    else if (result.status === "inventory_full")
      this.setFeedback("Inventário cheio. Libere espaço antes de coletar.");
    else if (result.status === "encounter_available" && result.authorization) {
      this.setFeedback("Encontro selvagem iniciado.");
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

  private setFeedback(message: string) {
    const feedback = document.querySelector("#interaction-feedback");
    if (feedback) feedback.textContent = message;
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

export async function startGame(ticket: string, accountId: string) {
  const assetLab =
    import.meta.env.DEV &&
    new URLSearchParams(location.search).get("asset-lab") === "1";
  const scene = assetLab
    ? new (await import("./assets/asset-lab-scene.js")).AssetLabScene()
    : new HouseScene(ticket, accountId);
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: 640,
    height: 400,
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    render: {
      antialias: false,
      antialiasGL: false,
      pixelArt: true,
      roundPixels: true,
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 640,
      height: 400,
    },
    scene,
  });
}
