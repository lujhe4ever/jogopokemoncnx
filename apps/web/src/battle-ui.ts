type BattleAction = "strike" | "guard";

interface BattleState {
  id: string;
  turn: number;
  expectedSequence: number;
  phase: "awaiting_player" | "finished";
  outcome?: "player_win" | "npc_win" | "draw" | "abandoned";
  player: {
    name: string;
    health: number;
    maxHealth: number;
  };
  npc: {
    name: string;
    health: number;
    maxHealth: number;
  };
}

interface CommandResponse {
  accepted: boolean;
  state: BattleState;
  error?: string;
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

function render(state: BattleState, message?: string) {
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
}

async function choose(action: BattleAction) {
  if (!active || active.phase === "finished") return;
  for (const button of actionButtons) button.disabled = true;
  const value = await post(`/battles/${active.id}/commands`, {
    sequence: active.expectedSequence,
    action,
  });
  const response = value as CommandResponse;
  render(
    stateFrom(response),
    response.accepted ? undefined : "Comando rejeitado; estado atualizado.",
  );
}

async function abandon() {
  if (!active || active.phase === "finished") return;
  const value = await post(`/battles/${active.id}/abandon`);
  render(stateFrom(value));
}

export async function startBattle() {
  const state = stateFrom(await post("/battles"));
  if (gamePanel) gamePanel.hidden = true;
  if (battlePanel) battlePanel.hidden = false;
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
});
window.addEventListener("pagehide", () => {
  if (active?.phase === "awaiting_player")
    navigator.sendBeacon(`/api/battles/${active.id}/abandon?reason=disconnect`);
});
