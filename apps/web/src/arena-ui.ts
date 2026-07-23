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

type SocialMessage =
  | {
      type: "social_chat";
      id: string;
      author: { playerId: string; displayName: string };
      text: string;
      sentAt: string;
    }
  | {
      type: "social_emote";
      id: string;
      playerId: string;
      emoteId: "wave" | "cheer" | "surprised";
      expiresAt: string;
    }
  | {
      type: "social_invite";
      inviteId: string;
      from: { playerId: string; displayName: string };
      expiresAt: string;
    }
  | {
      type: "social_invite_sent";
      inviteId: string;
      targetPlayerId: string;
    }
  | {
      type: "social_challenge_ready";
      inviteId: string;
      participants: string[];
      acceptedAt: string;
    }
  | {
      type: "social_error";
      code: string;
      retryAfterMs?: number;
    };

interface PvpProjection {
  id: string;
  turn: number;
  phase: "choosing" | "finished";
  participants: Array<{
    playerId: string;
    displayName: string;
    combatant: {
      name: string;
      health: number;
      maxHealth: number;
    };
  }>;
  winnerPlayerId?: string;
  outcome?: "win" | "draw" | "abandoned";
  finishReason?: string;
}

type PvpStateEvent = "pvp_started" | "pvp_turn_resolved" | "pvp_finished";

type PvpStateMessage = {
  [Event in PvpStateEvent]: {
    type: Event;
    state: PvpProjection;
    selfPlayerId: string;
    expectedSequence: number;
  };
}[PvpStateEvent];

type PvpMessage =
  | PvpStateMessage
  | {
      type: "pvp_choice_received";
      battleId: string;
      sequence: number;
    }
  | { type: "pvp_error"; code: string; battleId?: string };

interface BattleBroadcastProjection {
  battleId: string;
  turn: number;
  phase: "choosing" | "finished";
  competitors: Array<{
    playerId: string;
    displayName: string;
    creatureName: string;
    health: number;
    maxHealth: number;
  }>;
  winnerPlayerId?: string;
  outcome?: "win" | "draw" | "abandoned";
  finishReason?: string;
}

interface BattleBroadcastUpdate {
  revision: number;
  event: "started" | "turn_resolved" | "finished";
  battle: BattleBroadcastProjection;
}

type BattleBroadcastMessage =
  | {
      type: "battle_broadcast_snapshot";
      roomId: string;
      revision: number;
      battles: BattleBroadcastProjection[];
    }
  | {
      type: "battle_broadcast";
      roomId: string;
      revision: number;
      event: BattleBroadcastUpdate["event"];
      battle: BattleBroadcastProjection;
    }
  | {
      type: "battle_broadcast_replay";
      roomId: string;
      revision: number;
      updates: BattleBroadcastUpdate[];
    };

const gamePanel = document.querySelector<HTMLElement>("#game-panel");
const arenaPanel = document.querySelector<HTMLElement>("#arena-panel");
const arenaStage = document.querySelector<HTMLElement>("#arena-stage");
const presenceList = document.querySelector<HTMLUListElement>(
  "#arena-presence-list",
);
const status = document.querySelector<HTMLElement>("#arena-status");
const leaveButton = document.querySelector<HTMLButtonElement>("#leave-arena");
const chatForm = document.querySelector<HTMLFormElement>("#arena-chat-form");
const chatInput = document.querySelector<HTMLInputElement>("#arena-chat-input");
const chatLog = document.querySelector<HTMLOListElement>("#arena-chat-log");
const inviteTarget = document.querySelector<HTMLSelectElement>(
  "#arena-invite-target",
);
const sendInvite =
  document.querySelector<HTMLButtonElement>("#send-arena-invite");
const invitations = document.querySelector<HTMLElement>("#arena-invitations");
const broadcastStatus = document.querySelector<HTMLElement>(
  "#arena-screen-status",
);
const broadcastList = document.querySelector<HTMLOListElement>(
  "#arena-broadcast-list",
);
const pvpPanel = document.querySelector<HTMLElement>("#pvp-panel");
const pvpStatus = document.querySelector<HTMLElement>("#pvp-status");
const returnArena = document.querySelector<HTMLButtonElement>("#return-arena");
const pvpActionButtons = [
  ...document.querySelectorAll<HTMLButtonElement>("[data-pvp-action]"),
];
const players = new Map<string, ArenaPresence>();
const mutedPlayers = new Set<string>();
const broadcasts = new Map<string, BattleBroadcastProjection>();
const movement = { up: false, down: false, left: false, right: false };
let socket: WebSocket | undefined;
let selfId = "";
let sequence = 0;
let revision = -1;
let activeRoom = "arena-1";
let manualClose = true;
let reconnectAttempts = 0;
let activePvp: PvpProjection | undefined;
let pvpSelfId = "";
let pvpExpectedSequence = 1;
let broadcastRevision = -1;

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
  if (inviteTarget) {
    const selected = inviteTarget.value;
    inviteTarget.replaceChildren(
      ...[...players.values()]
        .filter(({ playerId }) => playerId !== selfId)
        .sort((left, right) =>
          left.displayName.localeCompare(right.displayName, "pt-BR"),
        )
        .map((player) => {
          const option = document.createElement("option");
          option.value = player.playerId;
          option.textContent = player.displayName;
          return option;
        }),
    );
    if ([...inviteTarget.options].some(({ value }) => value === selected))
      inviteTarget.value = selected;
    if (sendInvite) sendInvite.disabled = inviteTarget.options.length === 0;
  }
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

function isSocialMessage(value: unknown): value is SocialMessage {
  if (
    typeof value !== "object" ||
    value === null ||
    !("type" in value) ||
    typeof value.type !== "string"
  )
    return false;
  if (value.type === "social_chat")
    return (
      "id" in value &&
      typeof value.id === "string" &&
      "text" in value &&
      typeof value.text === "string" &&
      "sentAt" in value &&
      typeof value.sentAt === "string" &&
      "author" in value &&
      typeof value.author === "object" &&
      value.author !== null &&
      "playerId" in value.author &&
      typeof value.author.playerId === "string" &&
      "displayName" in value.author &&
      typeof value.author.displayName === "string"
    );
  if (value.type === "social_emote")
    return (
      "id" in value &&
      typeof value.id === "string" &&
      "playerId" in value &&
      typeof value.playerId === "string" &&
      "emoteId" in value &&
      ["wave", "cheer", "surprised"].includes(String(value.emoteId)) &&
      "expiresAt" in value &&
      typeof value.expiresAt === "string"
    );
  if (value.type === "social_invite")
    return (
      "inviteId" in value &&
      typeof value.inviteId === "string" &&
      "expiresAt" in value &&
      typeof value.expiresAt === "string" &&
      "from" in value &&
      typeof value.from === "object" &&
      value.from !== null &&
      "playerId" in value.from &&
      typeof value.from.playerId === "string" &&
      "displayName" in value.from &&
      typeof value.from.displayName === "string"
    );
  if (value.type === "social_invite_sent")
    return (
      "inviteId" in value &&
      typeof value.inviteId === "string" &&
      "targetPlayerId" in value &&
      typeof value.targetPlayerId === "string"
    );
  if (value.type === "social_challenge_ready")
    return (
      "inviteId" in value &&
      typeof value.inviteId === "string" &&
      "acceptedAt" in value &&
      typeof value.acceptedAt === "string" &&
      "participants" in value &&
      Array.isArray(value.participants) &&
      value.participants.every((participant) => typeof participant === "string")
    );
  return (
    value.type === "social_error" &&
    "code" in value &&
    typeof value.code === "string"
  );
}

function isPvpMessage(value: unknown): value is PvpMessage {
  if (
    typeof value !== "object" ||
    value === null ||
    !("type" in value) ||
    typeof value.type !== "string"
  )
    return false;
  if (["pvp_started", "pvp_turn_resolved", "pvp_finished"].includes(value.type))
    return (
      "state" in value &&
      typeof value.state === "object" &&
      value.state !== null &&
      "id" in value.state &&
      typeof value.state.id === "string" &&
      "selfPlayerId" in value &&
      typeof value.selfPlayerId === "string" &&
      "expectedSequence" in value &&
      typeof value.expectedSequence === "number"
    );
  if (value.type === "pvp_choice_received")
    return (
      "battleId" in value &&
      typeof value.battleId === "string" &&
      "sequence" in value &&
      typeof value.sequence === "number"
    );
  return (
    value.type === "pvp_error" &&
    "code" in value &&
    typeof value.code === "string"
  );
}

function isBroadcastProjection(
  value: unknown,
): value is BattleBroadcastProjection {
  return (
    typeof value === "object" &&
    value !== null &&
    "battleId" in value &&
    typeof value.battleId === "string" &&
    "turn" in value &&
    typeof value.turn === "number" &&
    "phase" in value &&
    (value.phase === "choosing" || value.phase === "finished") &&
    "competitors" in value &&
    Array.isArray(value.competitors) &&
    value.competitors.length === 2 &&
    value.competitors.every(
      (competitor: unknown) =>
        typeof competitor === "object" &&
        competitor !== null &&
        "playerId" in competitor &&
        typeof competitor.playerId === "string" &&
        "displayName" in competitor &&
        typeof competitor.displayName === "string" &&
        "creatureName" in competitor &&
        typeof competitor.creatureName === "string" &&
        "health" in competitor &&
        typeof competitor.health === "number" &&
        "maxHealth" in competitor &&
        typeof competitor.maxHealth === "number",
    )
  );
}

function isBroadcastUpdate(value: unknown): value is BattleBroadcastUpdate {
  return (
    typeof value === "object" &&
    value !== null &&
    "revision" in value &&
    typeof value.revision === "number" &&
    "event" in value &&
    (value.event === "started" ||
      value.event === "turn_resolved" ||
      value.event === "finished") &&
    "battle" in value &&
    isBroadcastProjection(value.battle)
  );
}

function isBattleBroadcastMessage(
  value: unknown,
): value is BattleBroadcastMessage {
  if (
    typeof value !== "object" ||
    value === null ||
    !("type" in value) ||
    !("roomId" in value) ||
    typeof value.roomId !== "string" ||
    !("revision" in value) ||
    typeof value.revision !== "number"
  )
    return false;
  if (value.type === "battle_broadcast_snapshot")
    return (
      "battles" in value &&
      Array.isArray(value.battles) &&
      value.battles.every(isBroadcastProjection)
    );
  if (value.type === "battle_broadcast") return isBroadcastUpdate(value);
  return (
    value.type === "battle_broadcast_replay" &&
    "updates" in value &&
    Array.isArray(value.updates) &&
    value.updates.every(isBroadcastUpdate)
  );
}

function renderBroadcasts(): void {
  if (!broadcastList || !broadcastStatus) return;
  const visible = [...broadcasts.values()].slice(-20).reverse();
  broadcastStatus.textContent =
    visible.length === 0
      ? "Nenhuma batalha em transmissão."
      : `${String(visible.length)} batalha(s) disponível(is).`;
  broadcastList.replaceChildren(
    ...visible.map((battle) => {
      const item = document.createElement("li");
      const article = document.createElement("article");
      article.className = "arena-broadcast-card";
      article.dataset.battleId = battle.battleId;
      const [first, second] = battle.competitors;
      const title = document.createElement("h4");
      title.textContent = `${first?.displayName ?? "Jogador"} × ${
        second?.displayName ?? "Jogador"
      }`;
      article.append(title);
      for (const competitor of battle.competitors) {
        const label = document.createElement("p");
        label.textContent = `${competitor.displayName} — ${competitor.creatureName}`;
        const health = document.createElement("progress");
        health.max = competitor.maxHealth;
        health.value = competitor.health;
        health.setAttribute(
          "aria-label",
          `Vida de ${competitor.displayName}: ${String(competitor.health)} de ${String(competitor.maxHealth)}`,
        );
        article.append(label, health);
      }
      const state = document.createElement("p");
      if (battle.phase === "choosing")
        state.textContent = `Turno ${String(battle.turn)} em andamento.`;
      else if (battle.outcome === "draw")
        state.textContent = "Empate confirmado.";
      else {
        const winner = battle.competitors.find(
          ({ playerId }) => playerId === battle.winnerPlayerId,
        );
        state.textContent = winner
          ? `Vencedor confirmado: ${winner.displayName}.`
          : "Batalha encerrada.";
      }
      article.append(state);
      item.append(article);
      return item;
    }),
  );
}

function requestBroadcastResume(): void {
  sendSocial({
    type: "battle_broadcast_resume",
    afterRevision: broadcastRevision,
  });
}

function receiveBattleBroadcast(message: BattleBroadcastMessage): void {
  if (message.type === "battle_broadcast_snapshot") {
    broadcasts.clear();
    for (const battle of message.battles)
      broadcasts.set(battle.battleId, battle);
    broadcastRevision = message.revision;
    renderBroadcasts();
    return;
  }
  const updates =
    message.type === "battle_broadcast_replay"
      ? message.updates
      : [
          {
            revision: message.revision,
            event: message.event,
            battle: message.battle,
          },
        ];
  for (const update of updates) {
    if (update.revision <= broadcastRevision) continue;
    if (update.revision !== broadcastRevision + 1) {
      requestBroadcastResume();
      return;
    }
    broadcasts.delete(update.battle.battleId);
    broadcasts.set(update.battle.battleId, update.battle);
    broadcastRevision = update.revision;
  }
  if (message.revision > broadcastRevision) {
    requestBroadcastResume();
    return;
  }
  renderBroadcasts();
}

function renderPvp(
  message: Extract<
    PvpMessage,
    { type: "pvp_started" | "pvp_turn_resolved" | "pvp_finished" }
  >,
): void {
  activePvp = message.state;
  pvpSelfId = message.selfPlayerId;
  pvpExpectedSequence = message.expectedSequence;
  const self = message.state.participants.find(
    ({ playerId }) => playerId === pvpSelfId,
  );
  const opponent = message.state.participants.find(
    ({ playerId }) => playerId !== pvpSelfId,
  );
  const combatant = (
    nameSelector: string,
    healthSelector: string,
    participant: PvpProjection["participants"][number] | undefined,
  ) => {
    const name = document.querySelector<HTMLElement>(nameSelector);
    const health = document.querySelector<HTMLProgressElement>(healthSelector);
    if (name)
      name.textContent = participant
        ? `${participant.displayName} — ${participant.combatant.name}`
        : "Indisponível";
    if (health && participant) {
      health.max = participant.combatant.maxHealth;
      health.value = participant.combatant.health;
      health.setAttribute(
        "aria-label",
        `${participant.displayName}: ${String(participant.combatant.health)} de ${String(participant.combatant.maxHealth)}`,
      );
    }
  };
  combatant("#pvp-self-name", "#pvp-self-health", self);
  combatant("#pvp-opponent-name", "#pvp-opponent-health", opponent);
  if (arenaPanel) arenaPanel.hidden = true;
  if (pvpPanel) pvpPanel.hidden = false;
  const finished = message.state.phase === "finished";
  for (const button of pvpActionButtons) button.disabled = finished;
  const abandon = document.querySelector<HTMLButtonElement>("#abandon-pvp");
  if (abandon) abandon.disabled = finished;
  if (returnArena) returnArena.hidden = !finished;
  if (pvpStatus)
    pvpStatus.textContent = finished
      ? message.state.outcome === "draw"
        ? "O duelo terminou empatado."
        : message.state.winnerPlayerId === pvpSelfId
          ? "Vitória confirmada."
          : "Derrota confirmada."
      : `Turno ${String(message.state.turn)}. Escolha em até 30 segundos.`;
}

function receivePvp(message: PvpMessage): void {
  if (
    message.type === "pvp_started" ||
    message.type === "pvp_turn_resolved" ||
    message.type === "pvp_finished"
  ) {
    renderPvp(message);
    return;
  }
  if (message.type === "pvp_choice_received") {
    if (pvpStatus)
      pvpStatus.textContent = "Escolha recebida. Aguardando o outro jogador...";
    for (const button of pvpActionButtons) button.disabled = true;
    return;
  }
  const labels: Record<string, string> = {
    pvp_unavailable:
      "Duelo indisponível: ambos precisam de uma criatura e estar livres.",
    choice_already_submitted: "A escolha deste turno já foi recebida.",
    sequence_mismatch: "Comando fora de sequência.",
  };
  const messageText = labels[message.code] ?? "Comando PvP rejeitado.";
  if (activePvp && pvpStatus) pvpStatus.textContent = messageText;
  else setStatus(messageText);
}

function showBubble(playerId: string, message: string): void {
  if (mutedPlayers.has(playerId)) return;
  const avatar = arenaStage?.querySelector<HTMLElement>(
    `[data-player-id="${CSS.escape(playerId)}"]`,
  );
  if (!avatar) return;
  avatar.querySelector(".arena-bubble")?.remove();
  const bubble = document.createElement("div");
  bubble.className = "arena-bubble";
  bubble.textContent = message;
  avatar.append(bubble);
  window.setTimeout(() => {
    bubble.remove();
  }, 4_000);
}

function appendChat(message: Extract<SocialMessage, { type: "social_chat" }>) {
  if (!chatLog || mutedPlayers.has(message.author.playerId)) return;
  const item = document.createElement("li");
  item.dataset.authorId = message.author.playerId;
  const author = document.createElement("strong");
  author.textContent = `${message.author.displayName}: `;
  item.append(author, document.createTextNode(message.text));
  if (message.author.playerId !== selfId) {
    const mute = document.createElement("button");
    mute.type = "button";
    mute.textContent = `Silenciar ${message.author.displayName}`;
    mute.addEventListener("click", () => {
      mutedPlayers.add(message.author.playerId);
      for (const entry of chatLog.querySelectorAll<HTMLElement>(
        `[data-author-id="${CSS.escape(message.author.playerId)}"]`,
      ))
        entry.remove();
      arenaStage
        ?.querySelector(
          `[data-player-id="${CSS.escape(message.author.playerId)}"] .arena-bubble`,
        )
        ?.remove();
      setStatus(`${message.author.displayName} foi silenciado localmente.`);
    });
    item.append(mute);
  }
  chatLog.append(item);
  while (chatLog.children.length > 50) chatLog.firstElementChild?.remove();
  chatLog.scrollTop = chatLog.scrollHeight;
  showBubble(message.author.playerId, message.text);
}

function receiveSocial(message: SocialMessage): void {
  if (message.type === "social_chat") {
    appendChat(message);
    return;
  }
  if (message.type === "social_emote") {
    const labels = {
      wave: "👋",
      cheer: "🎉",
      surprised: "!",
    } as const;
    showBubble(message.playerId, labels[message.emoteId]);
    return;
  }
  if (message.type === "social_invite") {
    if (!invitations) return;
    const card = document.createElement("article");
    const text = document.createElement("p");
    text.textContent = `${message.from.displayName} enviou um desafio.`;
    const accept = document.createElement("button");
    accept.type = "button";
    accept.textContent = "Aceitar desafio";
    accept.addEventListener("click", () => {
      sendSocial({
        type: "social_invite_accept",
        requestId: crypto.randomUUID(),
        inviteId: message.inviteId,
      });
      accept.disabled = true;
    });
    card.append(text, accept);
    invitations.append(card);
    const expiresIn = Math.max(
      0,
      new Date(message.expiresAt).getTime() - Date.now(),
    );
    window.setTimeout(() => {
      card.remove();
    }, expiresIn);
    return;
  }
  if (message.type === "social_invite_sent") {
    setStatus("Desafio enviado.");
    return;
  }
  if (message.type === "social_challenge_ready") {
    if (invitations) invitations.replaceChildren();
    setStatus("Desafio aceito pelos dois jogadores.");
    return;
  }
  const errorLabels: Record<string, string> = {
    rate_limited: "Aguarde antes de enviar outra ação.",
    invalid_message: "Mensagem vazia, longa ou com conteúdo não permitido.",
    unknown_emote: "Emote desconhecido.",
    target_unavailable: "O jogador não está disponível nesta sala.",
    invite_unavailable: "O convite expirou ou já foi usado.",
  };
  setStatus(errorLabels[message.code] ?? "Ação social rejeitada.");
}

function sendSocial(payload: object): void {
  if (socket?.readyState === WebSocket.OPEN)
    socket.send(JSON.stringify(payload));
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
    else if (isSocialMessage(value)) receiveSocial(value);
    else if (isPvpMessage(value)) receivePvp(value);
    else if (isBattleBroadcastMessage(value)) receiveBattleBroadcast(value);
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
  mutedPlayers.clear();
  chatLog?.replaceChildren();
  invitations?.replaceChildren();
  broadcasts.clear();
  broadcastRevision = -1;
  renderBroadcasts();
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
  broadcastRevision = -1;
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

chatForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = chatInput?.value ?? "";
  sendSocial({
    type: "social_chat",
    requestId: crypto.randomUUID(),
    text,
  });
  if (chatInput) chatInput.value = "";
});

document
  .querySelectorAll<HTMLButtonElement>("[data-social-emote]")
  .forEach((button) => {
    button.addEventListener("click", () => {
      sendSocial({
        type: "social_emote",
        requestId: crypto.randomUUID(),
        emoteId: button.dataset.socialEmote,
      });
    });
  });

sendInvite?.addEventListener("click", () => {
  const targetPlayerId = inviteTarget?.value;
  if (!targetPlayerId) return;
  sendSocial({
    type: "social_invite",
    requestId: crypto.randomUUID(),
    targetPlayerId,
  });
});

for (const button of pvpActionButtons)
  button.addEventListener("click", () => {
    if (!activePvp || activePvp.phase === "finished") return;
    sendSocial({
      type: "pvp_choice",
      battleId: activePvp.id,
      sequence: pvpExpectedSequence,
      action: button.dataset.pvpAction,
    });
  });

document.querySelector("#abandon-pvp")?.addEventListener("click", () => {
  if (!activePvp || activePvp.phase === "finished") return;
  sendSocial({ type: "pvp_abandon", battleId: activePvp.id });
});

returnArena?.addEventListener("click", () => {
  activePvp = undefined;
  if (pvpPanel) pvpPanel.hidden = true;
  if (arenaPanel) arenaPanel.hidden = false;
  setStatus(`Online em ${activeRoom}: ${String(players.size)}/20 presenças.`);
});

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
