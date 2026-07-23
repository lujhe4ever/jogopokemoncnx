interface ArenaPresence {
  playerId: string;
  displayName: string;
  x: number;
  y: number;
  lastProcessedSequence: number;
}

type ArenaMessage =
  | {
      type: "arena_snapshot";
      roomId: string;
      revision: number;
      selfId: string;
      players: Record<string, ArenaPresence>;
    }
  | {
      type: "arena_delta";
      revision: number;
      players: ArenaPresence[];
    }
  | {
      type: "presence_joined";
      revision: number;
      player: ArenaPresence;
    }
  | {
      type: "presence_left";
      revision: number;
      playerId: string;
    };

const gamePanel = document.querySelector<HTMLElement>("#game-panel");
const arenaPanel = document.querySelector<HTMLElement>("#arena-panel");
const arenaStage = document.querySelector<HTMLElement>("#arena-stage");
const presenceList = document.querySelector<HTMLUListElement>(
  "#arena-presence-list",
);
const status = document.querySelector<HTMLElement>("#arena-status");
const leaveButton = document.querySelector<HTMLButtonElement>("#leave-arena");
const players = new Map<string, ArenaPresence>();
const movement = { up: false, down: false, left: false, right: false };
let socket: WebSocket | undefined;
let selfId = "";
let sequence = 0;
let revision = -1;
let activeRoom = "arena-1";
let manualClose = true;
let reconnectAttempts = 0;

function setStatus(message: string): void {
  if (status) status.textContent = message;
}

function render(): void {
  if (!arenaStage || !presenceList) return;
  const activeIds = new Set(players.keys());
  for (const element of arenaStage.querySelectorAll<HTMLElement>(
    ".arena-avatar",
  )) {
    if (!activeIds.has(element.dataset.playerId ?? "")) element.remove();
  }
  for (const player of players.values()) {
    let avatar = arenaStage.querySelector<HTMLElement>(
      `[data-player-id="${CSS.escape(player.playerId)}"]`,
    );
    if (!avatar) {
      avatar = document.createElement("div");
      avatar.className = "arena-avatar";
      avatar.dataset.playerId = player.playerId;
      avatar.dataset.self = String(player.playerId === selfId);
      const label = document.createElement("span");
      avatar.append(label);
      arenaStage.append(avatar);
    }
    const label = avatar.querySelector("span");
    if (label) label.textContent = player.displayName;
    avatar.style.left = `${String((player.x / 640) * 100)}%`;
    avatar.style.top = `${String((player.y / 400) * 100)}%`;
  }
  presenceList.replaceChildren(
    ...[...players.values()]
      .sort((left, right) =>
        left.displayName.localeCompare(right.displayName, "pt-BR"),
      )
      .map((player) => {
        const item = document.createElement("li");
        item.textContent = `${player.displayName}${
          player.playerId === selfId ? " (você)" : ""
        }`;
        return item;
      }),
  );
}

function receive(message: ArenaMessage): void {
  if (message.type === "arena_snapshot") {
    revision = message.revision;
    selfId = message.selfId;
    players.clear();
    for (const player of Object.values(message.players))
      players.set(player.playerId, player);
    sequence = message.players[selfId]?.lastProcessedSequence ?? sequence;
  } else {
    if (message.revision <= revision) return;
    revision = message.revision;
    if (message.type === "arena_delta")
      for (const player of message.players)
        players.set(player.playerId, player);
    else if (message.type === "presence_joined")
      players.set(message.player.playerId, message.player);
    else players.delete(message.playerId);
  }
  render();
  setStatus(`Online em ${activeRoom}: ${String(players.size)}/20 presenças.`);
}

function isPresence(value: unknown): value is ArenaPresence {
  return (
    typeof value === "object" &&
    value !== null &&
    "playerId" in value &&
    typeof value.playerId === "string" &&
    "displayName" in value &&
    typeof value.displayName === "string" &&
    "x" in value &&
    typeof value.x === "number" &&
    "y" in value &&
    typeof value.y === "number" &&
    "lastProcessedSequence" in value &&
    typeof value.lastProcessedSequence === "number"
  );
}

function isArenaMessage(value: unknown): value is ArenaMessage {
  if (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof value.type === "string" &&
    "revision" in value &&
    typeof value.revision === "number"
  ) {
    if (
      value.type === "arena_snapshot" &&
      "selfId" in value &&
      typeof value.selfId === "string" &&
      "roomId" in value &&
      typeof value.roomId === "string" &&
      "players" in value &&
      typeof value.players === "object" &&
      value.players !== null &&
      Object.values(value.players).every(isPresence)
    )
      return true;
    if (
      value.type === "arena_delta" &&
      "players" in value &&
      Array.isArray(value.players) &&
      value.players.every(isPresence)
    )
      return true;
    if (
      value.type === "presence_joined" &&
      "player" in value &&
      isPresence(value.player)
    )
      return true;
    return (
      value.type === "presence_left" &&
      "playerId" in value &&
      typeof value.playerId === "string"
    );
  }
  return false;
}

async function ticket(): Promise<string> {
  const response = await fetch("/api/auth/ws-ticket", {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) throw new Error("Sessão da arena indisponível");
  const value = (await response.json()) as { ticket?: unknown };
  if (typeof value.ticket !== "string")
    throw new Error("Ticket da arena inválido");
  return value.ticket;
}

async function connect(): Promise<void> {
  setStatus(
    reconnectAttempts === 0 ? "Conectando..." : "Reconectando à arena...",
  );
  const token = await ticket();
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  const current = new WebSocket(
    `${protocol}://${location.host}/arena?ticket=${encodeURIComponent(token)}&roomId=${encodeURIComponent(activeRoom)}`,
  );
  socket = current;
  current.addEventListener("open", () => {
    reconnectAttempts = 0;
  });
  current.addEventListener("message", (event) => {
    const value: unknown = JSON.parse(String(event.data));
    if (isArenaMessage(value)) receive(value);
  });
  current.addEventListener("close", (event) => {
    if (socket !== current || manualClose) return;
    if (event.code === 1013) {
      setStatus("A arena está lotada. Tente outra sala.");
      return;
    }
    if (reconnectAttempts >= 5) {
      setStatus("Não foi possível reconectar. Volte à exploração.");
      return;
    }
    reconnectAttempts += 1;
    window.setTimeout(
      () => {
        if (!manualClose) void connect().catch(handleConnectionError);
      },
      Math.min(5_000, reconnectAttempts * 500),
    );
  });
}

function handleConnectionError(error: unknown): void {
  setStatus(
    error instanceof Error ? error.message : "Falha ao conectar à arena",
  );
}

function closeArena(): void {
  manualClose = true;
  socket?.close(1000, "leaving_arena");
  socket = undefined;
  players.clear();
  render();
  if (arenaPanel) arenaPanel.hidden = true;
  if (gamePanel) gamePanel.hidden = false;
  window.dispatchEvent(new Event("lt:arena-close"));
  document.querySelector<HTMLButtonElement>("#enter-arena")?.focus();
}

export async function openArena(roomId: string): Promise<void> {
  activeRoom = roomId;
  manualClose = false;
  reconnectAttempts = 0;
  revision = -1;
  sequence = 0;
  if (gamePanel) gamePanel.hidden = true;
  if (arenaPanel) arenaPanel.hidden = false;
  window.dispatchEvent(new Event("lt:arena-open"));
  leaveButton?.focus();
  try {
    await connect();
  } catch (error) {
    handleConnectionError(error);
  }
}

leaveButton?.addEventListener("click", closeArena);

window.addEventListener("keydown", (event) => {
  if (arenaPanel?.hidden) return;
  if (event.key === "ArrowUp" || event.key.toLowerCase() === "w")
    movement.up = true;
  if (event.key === "ArrowDown" || event.key.toLowerCase() === "s")
    movement.down = true;
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a")
    movement.left = true;
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d")
    movement.right = true;
});

window.addEventListener("keyup", (event) => {
  if (event.key === "ArrowUp" || event.key.toLowerCase() === "w")
    movement.up = false;
  if (event.key === "ArrowDown" || event.key.toLowerCase() === "s")
    movement.down = false;
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a")
    movement.left = false;
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d")
    movement.right = false;
});

document
  .querySelectorAll<HTMLButtonElement>("[data-arena-direction]")
  .forEach((button) => {
    const direction = button.dataset.arenaDirection as keyof typeof movement;
    const set = (pressed: boolean) => {
      movement[direction] = pressed;
    };
    button.addEventListener("pointerdown", () => {
      set(true);
    });
    for (const event of ["pointerup", "pointercancel", "pointerleave"] as const)
      button.addEventListener(event, () => {
        set(false);
      });
  });

window.setInterval(() => {
  if (!arenaPanel || arenaPanel.hidden || socket?.readyState !== WebSocket.OPEN)
    return;
  const x = Number(movement.right) - Number(movement.left);
  const y = Number(movement.down) - Number(movement.up);
  if (x === 0 && y === 0) return;
  socket.send(
    JSON.stringify({ type: "arena_input", sequence: ++sequence, x, y }),
  );
}, 50);
