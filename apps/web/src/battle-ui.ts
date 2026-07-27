import { playSound } from "./audio.js";

type BattleAction = "strike" | "guard";

export interface BattleState {
  id: string;
  turn: number;
  expectedSequence: number;
  phase: "awaiting_player" | "finished";
  outcome?: "player_win" | "npc_win" | "draw" | "abandoned";
  player: {
    id: string;
    name: string;
    level?: number;
    health: number;
    maxHealth: number;
  };
  npc: {
    id: string;
    name: string;
    level?: number;
    health: number;
    maxHealth: number;
  };
}

interface TurnResolvedEvent {
  type: "turn_resolved";
  playerAction: BattleAction;
  npcAction: BattleAction;
  playerDamage: number;
  npcDamage: number;
}

interface BattleProgression {
  definitionId: string;
  experienceGained: number;
  experience: number;
  level: number;
  leveledUp: boolean;
  evolved: boolean;
}

interface CommandResponse {
  accepted: boolean;
  state: BattleState;
  error?: string;
  events?: Array<
    TurnResolvedEvent | { type: "battle_finished"; outcome: string }
  >;
  progression?: BattleProgression;
}

const gamePanel = document.querySelector<HTMLElement>("#game-panel");
const battlePanel = document.querySelector<HTMLElement>("#battle-panel");
const battleStatus = document.querySelector<HTMLElement>("#battle-status");
const returnButton = document.querySelector<HTMLButtonElement>("#return-world");
const actionButtons = [
  ...document.querySelectorAll<HTMLButtonElement>("[data-battle-action]"),
];
let active: BattleState | undefined;
let timeout: number | undefined;
let onFinished:
  ((state: BattleState, progression?: BattleProgression) => void) | undefined;
let finishedNotified = false;

async function post(path: string, body?: object) {
  const init: RequestInit = {
    method: "POST",
    credentials: "include",
  };
  if (body) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const response = await fetch(`/api${path}`, init);
  if (!response.ok) throw new Error("Falha ao comunicar com a batalha");
  return response.json() as Promise<unknown>;
}

async function get(path: string) {
  const response = await fetch(`/api${path}`, { credentials: "include" });
  if (!response.ok) throw new Error("Falha ao carregar a batalha");
  return response.json() as Promise<unknown>;
}

function stateFrom(value: unknown): BattleState {
  const candidate =
    typeof value === "object" &&
    value !== null &&
    "state" in value &&
    typeof value.state === "object"
      ? value.state
      : value;
  if (
    typeof candidate !== "object" ||
    candidate === null ||
    !("id" in candidate) ||
    typeof candidate.id !== "string"
  )
    throw new Error("Estado de batalha inválido");
  return candidate as BattleState;
}

function render(
  state: BattleState,
  message?: string,
  progression?: BattleProgression,
) {
  active = state;
  const set = (selector: string, value: string) => {
    const element = document.querySelector<HTMLElement>(selector);
    if (element) element.textContent = value;
  };
  const health = (selector: string, combatant: BattleState["player"]) => {
    const element = document.querySelector<HTMLProgressElement>(selector);
    if (element) {
      element.max = combatant.maxHealth;
      element.value = combatant.health;
      element.setAttribute(
        "aria-label",
        `${combatant.name}: ${String(combatant.health)} de ${String(combatant.maxHealth)}`,
      );
    }
  };
  set("#battle-player-name", state.player.name);
  set("#battle-npc-name", state.npc.name);
  set(
    "#battle-player-level",
    `Nível ${String(state.player.level ?? progression?.level ?? 1)}`,
  );
  set("#battle-npc-level", `Nível ${String(state.npc.level ?? 1)}`);
  const playerSprite = document.querySelector<HTMLElement>(
    "#battle-player-sprite",
  );
  const npcSprite = document.querySelector<HTMLElement>("#battle-npc-sprite");
  if (playerSprite)
    playerSprite.dataset.creature =
      state.player.id.split(":").at(-1) ?? "emberbud";
  if (npcSprite)
    npcSprite.dataset.creature = state.npc.id.split(":").at(-1) ?? "nightleaf";
  health("#battle-player-health", state.player);
  health("#battle-npc-health", state.npc);
  const finished = state.phase === "finished";
  if (battleStatus)
    battleStatus.textContent =
      message ??
      (finished
        ? state.outcome === "player_win"
          ? "Vitória confirmada. Resultado aplicado."
          : state.outcome === "draw"
            ? "A batalha terminou empatada."
            : "Derrota confirmada. Retorne ao mundo."
        : `Turno ${String(state.turn)}. Escolha uma ação em até 30 segundos.`);
  for (const button of actionButtons) button.disabled = finished;
  if (returnButton) returnButton.hidden = !finished;
  if (timeout) window.clearTimeout(timeout);
  if (!finished)
    timeout = window.setTimeout(() => {
      void choose("strike");
    }, 30_100);
  else if (!finishedNotified) {
    finishedNotified = true;
    playSound(state.outcome === "player_win" ? "victory" : "guard");
    window.dispatchEvent(new Event("lt:state-changed"));
    onFinished?.(state, progression);
  }
}

function resultMessage(
  response: CommandResponse,
  action: BattleAction,
): string | undefined {
  if (response.progression) {
    const level = response.progression.leveledUp
      ? ` Subiu para o nível ${String(response.progression.level)}.`
      : "";
    const evolution = response.progression.evolved
      ? " Uma evolução foi aplicada."
      : "";
    return `Vitória! +${String(response.progression.experienceGained)} XP.${level}${evolution}`;
  }
  const turn = response.events?.find(
    (event): event is TurnResolvedEvent => event.type === "turn_resolved",
  );
  if (!turn) return undefined;
  return action === "guard"
    ? `Postura firme: ${String(turn.playerDamage)} de dano recebido; ${String(turn.npcDamage)} causado.`
    : `Golpe de campo: ${String(turn.npcDamage)} de dano causado; ${String(turn.playerDamage)} recebido.`;
}

async function choose(action: BattleAction) {
  if (!active || active.phase === "finished") return;
  const previous = active;
  for (const button of actionButtons) button.disabled = true;
  playSound(action === "strike" ? "strike" : "guard");
  const playerSprite = document.querySelector<HTMLElement>(
    "#battle-player-sprite",
  );
  playerSprite?.classList.add(
    action === "strike" ? "is-attacking" : "is-guarding",
  );
  const value = await post(`/battles/${active.id}/commands`, {
    sequence: active.expectedSequence,
    action,
  });
  const response = value as CommandResponse;
  const next = stateFrom(response);
  if (next.player.health < previous.player.health)
    document
      .querySelector<HTMLElement>("#battle-player-sprite")
      ?.classList.add("is-hit");
  if (next.npc.health < previous.npc.health)
    document
      .querySelector<HTMLElement>("#battle-npc-sprite")
      ?.classList.add("is-hit");
  window.setTimeout(() => {
    for (const sprite of document.querySelectorAll<HTMLElement>(
      ".battle-creature",
    ))
      sprite.classList.remove("is-attacking", "is-guarding", "is-hit");
  }, 420);
  render(
    next,
    response.accepted
      ? resultMessage(response, action)
      : "Comando rejeitado; estado atualizado.",
    response.progression,
  );
}

async function abandon() {
  if (!active || active.phase === "finished") return;
  const value = await post(`/battles/${active.id}/abandon`);
  render(stateFrom(value));
}

export async function startBattle(
  battleId?: string,
  finished?: (state: BattleState, progression?: BattleProgression) => void,
) {
  onFinished = finished;
  finishedNotified = false;
  const capture =
    document.querySelector<HTMLButtonElement>("#capture-creature");
  if (capture) capture.hidden = true;
  const state = stateFrom(
    battleId ? await get(`/battles/${battleId}`) : await post("/battles"),
  );
  if (gamePanel) gamePanel.hidden = true;
  if (battlePanel) battlePanel.hidden = false;
  window.dispatchEvent(new Event("lt:battle-open"));
  playSound("battle");
  render(state);
}

for (const button of actionButtons) {
  button.addEventListener("click", () => {
    void choose(button.dataset.battleAction as BattleAction);
  });
}
document.querySelector("#abandon-battle")?.addEventListener("click", () => {
  void abandon();
});
returnButton?.addEventListener("click", () => {
  if (battlePanel) battlePanel.hidden = true;
  if (gamePanel) gamePanel.hidden = false;
  window.dispatchEvent(new Event("lt:battle-close"));
  window.dispatchEvent(new Event("lt:state-changed"));
});
window.addEventListener("pagehide", () => {
  if (active?.phase === "awaiting_player")
    navigator.sendBeacon(`/api/battles/${active.id}/abandon?reason=disconnect`);
});
